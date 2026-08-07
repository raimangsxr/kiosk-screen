from datetime import timedelta

import pytest

from app.api.schemas import ContentItemRequest
from app.repositories.base import utc_now
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.operator_session import OperatorSession
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.content_service import ContentService, validate_content


def test_content_service_rejects_unapproved_embedded_domain(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    payload = ContentItemRequest(
        title="Dashboard",
        contentType="embedded_web",
        sourceReference="https://not-approved.example/app",
        isActive=True,
        displayOrder=1
    )

    with pytest.raises(ValueError):
        validate_content(db_session, result.organization.id, payload)


def test_content_service_creates_and_records_event(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    payload = ContentItemRequest(
        title="Agenda",
        contentType="photo",
        sourceReference="https://example.com/agenda.jpg",
        isActive=True,
        displayOrder=2,
        durationSeconds=12
    )

    item = ContentService(db_session).create(result.organization.id, result.administrator.id, payload)

    assert item.display_order == 2
    assert db_session.query(item.__class__).count() == 2


def _display_control_state(db_session, result, **overrides):
    display_session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.administrator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(hours=1),
    )
    db_session.add(display_session)
    db_session.flush()
    values = {
        "organization_id": result.organization.id,
        "display_session_id": display_session.id,
        "content_mode": "loop",
        "ads_visible": True,
        "fullscreen_requested": False,
        "updated_by_user_id": result.administrator.id,
    }
    values.update(overrides)
    state = DisplayControlState(**values)
    db_session.add(state)
    db_session.commit()
    return state


def test_delete_cancels_jump_to_before_removing_target(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    state = _display_control_state(
        db_session,
        result,
        navigation_command="jump_to",
        navigation_command_id="command-id",
        jump_to_content_id=result.top_content.id,
    )

    ContentService(db_session).delete(
        result.organization.id,
        result.administrator.id,
        result.top_content.id,
    )

    db_session.expire_all()
    assert state.navigation_command is None
    assert state.navigation_command_id is None
    assert state.jump_to_content_id is None


def test_delete_fixed_content_returns_display_to_loop(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    result.top_content.is_fixed = True
    state = _display_control_state(
        db_session,
        result,
        content_mode="fixed",
        selected_fixed_content_id=result.top_content.id,
    )

    ContentService(db_session).delete(
        result.organization.id,
        result.administrator.id,
        result.top_content.id,
    )

    db_session.expire_all()
    assert state.content_mode == "loop"
    assert state.selected_fixed_content_id is None
