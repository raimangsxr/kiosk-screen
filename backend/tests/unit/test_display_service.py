from datetime import timedelta, timezone

import pytest

from app.domain.roles import Role
from app.repositories.base import utc_now
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.organization import Organization
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.display_service import eligible_ads, eligible_top_content, get_display_state, open_display, record_fallback_activation


def test_display_service_filters_eligible_items_and_reports_fallback(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    assert len(eligible_top_content(db_session, result.organization.id)) == 1
    assert len(eligible_ads(db_session, result.organization.id)) == 1

    result.ad.is_active = False
    db_session.commit()
    state = get_display_state(db_session, result.organization.id)

    assert state.fallback_active is True
    assert state.ads == []


def test_open_display_records_event_and_operator_session(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    now = utc_now()

    state = open_display(
        db_session,
        result.organization.id,
        result.operator.id,
        [Role.EVENT_OPERATOR.value],
        now=now
    )

    events = db_session.query(DisplayEvent).all()
    operator_session = db_session.query(OperatorSession).one()
    assert state.fallback_active is False
    assert events[0].event_type == "display_opened"
    assert operator_session.valid_until.replace(tzinfo=timezone.utc) >= (
        now + timedelta(minutes=result.configuration.configured_event_duration_minutes)
    )


def test_open_display_rejects_unauthorized_role(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    with pytest.raises(PermissionError):
        open_display(db_session, result.organization.id, result.operator.id, [Role.DISPLAY_VIEWER.value])


def test_fallback_activation_records_warning_event(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.commit()

    record_fallback_activation(db_session, organization.id)

    event = db_session.query(DisplayEvent).one()
    assert event.event_type == "fallback_activated"
    assert event.severity == "warning"


def test_availability_window_excludes_expired_content(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    result.top_content.available_until = utc_now() - timedelta(minutes=1)
    db_session.commit()

    assert eligible_top_content(db_session, result.organization.id) == []
