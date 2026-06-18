from datetime import timedelta

import pytest
from pydantic import ValidationError

from app.api.schemas import KioskConfigurationRequest
from app.repositories.base import utc_now
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_event import DisplayEvent
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
        valid_until=utc_now(),
    )
    db_session.add(session)
    db_session.commit()

    state = DisplayControlService(db_session).ensure_default_state(
        result.organization.id,
        session.id,
        result.operator.id,
    )

    assert state.content_mode == "loop"
    assert state.selected_content_id is None
    assert state.ads_visible is True


def test_display_control_service_updates_to_existing_iframe_content(db_session) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    domain = ApprovedEmbeddedDomain(
        organization_id=result.organization.id,
        domain="example.org",
        is_active=True,
        approved_by_user_id=result.administrator.id,
    )
    db_session.add(domain)
    db_session.flush()
    iframe = TopContentItem(
        organization_id=result.organization.id,
        title="Agenda",
        content_type="embedded_web",
        source_reference="https://example.org/agenda",
        approved_domain_id=domain.id,
        is_active=True,
        display_order=2,
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now(),
    )
    db_session.add_all([iframe, session])
    db_session.commit()

    state = DisplayControlService(db_session).update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="iframe",
        selected_content_id=iframe.id,
        ads_visible=True,
    )

    assert state.content_mode == "iframe"
    assert state.selected_content_id == iframe.id
    assert state.ads_visible is True


@pytest.mark.parametrize("ads_visible", [False, True])
def test_display_control_service_updates_ads_visibility_without_changing_content_mode(db_session, ads_visible: bool) -> None:
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

    service = DisplayControlService(db_session)
    state = service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="loop",
        selected_content_id=None,
        ads_visible=ads_visible,
    )

    assert state.content_mode == "loop"
    assert state.selected_content_id is None
    assert state.ads_visible is ads_visible


def test_display_control_service_records_ads_visibility_changes(db_session) -> None:
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

    DisplayControlService(db_session).update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="loop",
        selected_content_id=None,
        ads_visible=False,
    )

    events = db_session.query(DisplayEvent).filter_by(event_type="remote_control_ads_visibility_changed").all()
    assert len(events) == 1
    assert events[0].event_metadata == {"adsVisible": False}


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
        selected_content_id=None,
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
    assert new_state.selected_content_id is None
    assert new_state.ads_visible is True
    assert active_state.display_session_id == new_session.id
    assert active_state.ads_visible is True


@pytest.mark.parametrize(
    ("content_type", "is_active"),
    [
        ("photo", True),
        ("embedded_web", False),
    ],
)
def test_display_control_service_rejects_invalid_iframe_selection(db_session, content_type: str, is_active: bool) -> None:
    from app.application.display_control.service import DisplayControlService

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    candidate = TopContentItem(
        organization_id=result.organization.id,
        title="Candidate",
        content_type=content_type,
        source_reference="https://example.org/candidate",
        is_active=is_active,
        display_order=2,
        created_by_user_id=result.administrator.id,
        updated_by_user_id=result.administrator.id,
    )
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now(),
    )
    db_session.add_all([candidate, session])
    db_session.commit()

    with pytest.raises(ValueError):
        DisplayControlService(db_session).update_state(
            result.organization.id,
            session.id,
            result.administrator.id,
            content_mode="iframe",
            selected_content_id=candidate.id,
            ads_visible=True,
        )
