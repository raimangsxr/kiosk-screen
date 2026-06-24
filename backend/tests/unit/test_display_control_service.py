from datetime import timedelta

import pytest
from pydantic import ValidationError

from app.api.schemas import KioskConfigurationRequest
from app.repositories.base import utc_now
from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.iframe import Iframe
from app.repositories.models.operator_session import OperatorSession
from app.services.bootstrap_service import bootstrap_mvp_data


def build_configuration_request(remote_control_polling_seconds: int = 3) -> KioskConfigurationRequest:
    return KioskConfigurationRequest(
        name="Main",
        defaultTopDurationSeconds=10,
        defaultAdDurationSeconds=8,
        configuredEventDurationMinutes=60,
        remoteControlPollingSeconds=remote_control_polling_seconds,
        isEnabled=True,
    )


@pytest.mark.parametrize("value", [1, 3, 60])
def test_remote_control_polling_interval_accepts_configured_bounds(value: int) -> None:
    request = build_configuration_request(value)

    assert request.remote_control_polling_seconds == value


@pytest.mark.parametrize("value", [0, 61])
def test_remote_control_polling_interval_rejects_out_of_bounds_values(value: int) -> None:
    with pytest.raises(ValidationError):
        build_configuration_request(value)


def test_display_control_service_creates_default_loop_state_for_session(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).ensure_default_state(
        result.organization.id,
        session.id,
        result.operator.id,
    )

    assert state.content_mode == "loop"
    assert state.selected_iframe_id is None
    assert state.ads_visible is True
    assert state.fullscreen_requested is False


def test_display_control_service_updates_to_existing_iframe(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    iframe = Iframe(
        organization_id=result.organization.id,
        url="https://example.org/agenda",
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add_all([iframe, session])
    db_session.commit()

    state = DisplayControlService(db_session).update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="iframe",
        selected_iframe_id=iframe.id,
        ads_visible=True,
    )

    assert state.content_mode == "iframe"
    assert state.selected_iframe_id == iframe.id
    assert state.ads_visible is True


@pytest.mark.parametrize("ads_visible", [False, True])
def test_display_control_service_updates_ads_visibility_without_changing_content_mode(db_session, ads_visible: bool) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    service = DisplayControlService(db_session)
    state = service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="loop",
        selected_iframe_id=None,
        ads_visible=ads_visible,
    )

    assert state.content_mode == "loop"
    assert state.selected_iframe_id is None
    assert state.ads_visible is ads_visible


def test_display_control_service_records_ads_visibility_changes(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    DisplayControlService(db_session).update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="loop",
        selected_iframe_id=None,
        ads_visible=False,
    )

    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_ads_visibility_changed").all()
    assert len(events) == 1
    assert events[0].event_metadata == {"adsVisible": False}


def test_display_control_service_updates_fullscreen_request(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="loop",
        selected_iframe_id=None,
        ads_visible=True,
        fullscreen_requested=True,
    )

    assert state.fullscreen_requested is True
    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_fullscreen_changed").all()
    assert len(events) == 1
    assert events[0].event_metadata == {"fullscreenRequested": True}


def test_display_control_service_issues_navigation_command_in_loop_mode(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).issue_navigation_command(
        result.organization.id,
        result.administrator.id,
        command="next",
    )

    assert state.navigation_command == "next"
    assert state.navigation_command_id is not None
    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_navigation_changed").all()
    assert len(events) == 1
    assert events[0].event_metadata["command"] == "next"


@pytest.mark.parametrize("command", ["pause", "resume"])
def test_display_control_service_issues_pause_and_resume_in_loop_mode(db_session, command: str) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).issue_navigation_command(
        result.organization.id,
        result.administrator.id,
        command=command,
    )

    assert state.navigation_command == command
    assert state.navigation_command_id is not None
    events = db_session.query(DisplayEvent).filter_by(event_type=f"display_control_{command}d").all()
    assert len(events) == 1
    assert events[0].event_metadata == {"contentMode": "loop"}


@pytest.mark.parametrize("command", ["pause", "resume"])
def test_display_control_service_rejects_pause_and_resume_in_iframe_mode(db_session, command: str) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    iframe = Iframe(
        organization_id=result.organization.id,
        url="https://example.org/agenda",
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add_all([iframe, session])
    db_session.commit()

    service = DisplayControlService(db_session)
    service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="iframe",
        selected_iframe_id=iframe.id,
        ads_visible=True,
    )

    with pytest.raises(ValueError, match="Pause/Resume solo es válido en modo rotación."):
        service.issue_navigation_command(result.organization.id, result.administrator.id, command=command)


def test_display_control_service_rejects_navigation_command_in_iframe_mode(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    iframe = Iframe(
        organization_id=result.organization.id,
        url="https://example.org/agenda",
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add_all([iframe, session])
    db_session.commit()

    service = DisplayControlService(db_session)
    service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="iframe",
        selected_iframe_id=iframe.id,
        ads_visible=True,
    )

    with pytest.raises(ValueError):
        service.issue_navigation_command(result.organization.id, result.administrator.id, command="next")


def test_display_control_service_uses_new_session_default_instead_of_stale_state(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    old_session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(old_session)
    db_session.commit()

    service = DisplayControlService(db_session)
    service.update_state(
        result.organization.id,
        old_session.id,
        result.administrator.id,
        content_mode="loop",
        selected_iframe_id=None,
        ads_visible=False,
    )
    new_session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(new_session)
    db_session.commit()

    new_state = service.ensure_default_state(result.organization.id, new_session.id, result.operator.id)
    active_state = service.get_state_for_active_session(result.organization.id)

    assert new_state.content_mode == "loop"
    assert new_state.selected_iframe_id is None
    assert new_state.ads_visible is True
    assert active_state.display_session_id == new_session.id
    assert active_state.ads_visible is True


def test_display_control_service_rejects_invalid_iframe_selection(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now(),
    )
    db_session.add(session)
    db_session.commit()

    with pytest.raises(ValueError):
        DisplayControlService(db_session).update_state(
            result.organization.id,
            session.id,
            result.administrator.id,
            content_mode="iframe",
            selected_iframe_id="missing",
            ads_visible=True,
        )


def test_display_control_service_issues_jump_to_in_loop_mode(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).issue_navigation_command(
        result.organization.id,
        result.administrator.id,
        command="jump_to",
        target_content_id=result.top_content.id,
    )

    assert state.navigation_command == "jump_to"
    assert state.jump_to_content_id == result.top_content.id
    assert state.navigation_command_id is not None
    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_jump_to").all()
    assert len(events) == 1
    assert events[0].event_metadata["targetContentId"] == result.top_content.id


def test_display_control_service_rejects_jump_to_in_iframe_mode(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    iframe = Iframe(
        organization_id=result.organization.id,
        url="https://example.org/agenda",
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add_all([iframe, session])
    db_session.commit()

    service = DisplayControlService(db_session)
    service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="iframe",
        selected_iframe_id=iframe.id,
        ads_visible=True,
    )

    with pytest.raises(ValueError, match="Jump-to requires rotation mode."):
        service.issue_navigation_command(
            result.organization.id,
            result.administrator.id,
            command="jump_to",
            target_content_id=result.top_content.id,
        )
    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_invalid_jump_to").all()
    assert len(events) == 1


def test_display_control_service_rejects_jump_to_without_target(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    with pytest.raises(ValueError, match="Jump-to requires a target content id."):
        DisplayControlService(db_session).issue_navigation_command(
            result.organization.id,
            result.administrator.id,
            command="jump_to",
            target_content_id=None,
        )


def test_display_control_service_rejects_jump_to_unknown_target(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    with pytest.raises(ValueError, match="Selected content is not available."):
        DisplayControlService(db_session).issue_navigation_command(
            result.organization.id,
            result.administrator.id,
            command="jump_to",
            target_content_id="00000000-0000-0000-0000-000000000000",
        )


def test_display_control_service_rejects_jump_to_fixed_target(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    result.top_content.is_fixed = True
    db_session.commit()
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    with pytest.raises(ValueError, match="Fixed content cannot be a jump target."):
        DisplayControlService(db_session).issue_navigation_command(
            result.organization.id,
            result.administrator.id,
            command="jump_to",
            target_content_id=result.top_content.id,
        )


def test_display_control_service_clears_jump_to_on_next_command(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    service = DisplayControlService(db_session)
    service.issue_navigation_command(
        result.organization.id,
        result.administrator.id,
        command="jump_to",
        target_content_id=result.top_content.id,
    )
    state = service.issue_navigation_command(
        result.organization.id,
        result.administrator.id,
        command="next",
    )

    assert state.navigation_command == "next"
    assert state.jump_to_content_id is None
