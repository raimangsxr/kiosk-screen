from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.availability import is_within_availability
from app.domain.display_events import create_display_event
from app.domain.roles import Role, can_open_display
from app.repositories.events import DisplayEventRepository
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.iframe import Iframe
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.base import utc_now
from app.application.display_control.service import DisplayControlService
from app.services.event_configuration_service import EventConfigurationService


@dataclass
class DisplayState:
    configuration: KioskDisplayConfiguration
    top_content: list[TopContentItem]
    ads: list[ClientAdItem]
    fallback_active: bool
    remote_control: DisplayControlState | None = None
    selected_iframe: Iframe | None = None
    fixed_eligible_contents: list[TopContentItem] | None = None


def eligible_top_content(session: Session, organization_id: str, now: datetime | None = None) -> list[TopContentItem]:
    current_time = now or utc_now()
    items = list(session.scalars(
        select(TopContentItem)
        .where(TopContentItem.organization_id == organization_id, TopContentItem.is_active.is_(True))
        .order_by(TopContentItem.display_order)
    ))
    return [
        item for item in items
        if is_within_availability(current_time, item.available_from, item.available_until)
    ]


def eligible_ads(session: Session, organization_id: str, now: datetime | None = None) -> list[ClientAdItem]:
    current_time = now or utc_now()
    rows = session.execute(
        select(ClientAdItem)
        .where(
            ClientAdItem.organization_id == organization_id,
            ClientAdItem.is_active.is_(True)
        )
        .order_by(ClientAdItem.display_order)
    )
    return [
        item for item in rows.scalars()
        if is_within_availability(current_time, item.available_from, item.available_until)
    ]


def _end_active_sessions(session: Session, organization_id: str, now: datetime) -> None:
    active_sessions = list(
        session.scalars(
            select(OperatorSession).where(
                OperatorSession.organization_id == organization_id,
                OperatorSession.ended_at.is_(None),
                OperatorSession.valid_until >= now,
            )
        )
    )
    for operator_session in active_sessions:
        operator_session.ended_at = now


def get_display_state(session: Session, organization_id: str, now: datetime | None = None) -> DisplayState:
    configuration = session.scalar(
        select(KioskDisplayConfiguration).where(KioskDisplayConfiguration.organization_id == organization_id)
    )
    if configuration is None:
        raise ValueError("Display configuration is required.")
    top_content = eligible_top_content(session, organization_id, now)
    ads = eligible_ads(session, organization_id, now)[:configuration.inline_ad_count]
    control_service = DisplayControlService(session)
    remote_control = control_service.read_state_for_active_session(organization_id)
    selected_iframe = control_service.selected_iframe(remote_control) if remote_control is not None else None
    return DisplayState(
        configuration,
        top_content,
        ads,
        fallback_active=not top_content or not ads,
        remote_control=remote_control,
        selected_iframe=selected_iframe,
        fixed_eligible_contents=control_service.list_fixed_eligible_contents(organization_id),
    )


def open_display(
    session: Session,
    organization_id: str,
    user_id: str,
    user_roles: list[str],
    now: datetime | None = None
) -> DisplayState:
    roles = {Role(role) for role in user_roles}
    if not can_open_display(roles):
        raise PermissionError("Event operator or administrator role required.")

    current_time = now or utc_now()
    state = get_display_state(session, organization_id, current_time)
    event_configuration = EventConfigurationService(session).get_or_create(organization_id)
    if not state.configuration.is_enabled or not event_configuration.event_duration_minutes:
        raise ValueError("Display configuration is not ready.")
    if state.fallback_active:
        raise ValueError("Display requires at least one eligible top content item and one eligible ad.")

    _end_active_sessions(session, organization_id, current_time)

    token = OperatorSession(
        organization_id=organization_id,
        user_id=user_id,
        display_configuration_id=state.configuration.id,
        valid_until=current_time + timedelta(minutes=event_configuration.event_duration_minutes)
    )
    session.add(token)
    session.flush()
    state.remote_control = DisplayControlService(session).ensure_default_state(organization_id, token.id, user_id)
    state.selected_iframe = None

    DisplayEventRepository(session).record(
        create_display_event(
            organization_id=organization_id,
            event_type="display_opened",
            severity="info",
            message="Display opened",
            created_by_user_id=user_id
        )
    )
    session.commit()
    return state


def record_fallback_activation(session: Session, organization_id: str, user_id: str | None = None) -> None:
    DisplayEventRepository(session).record(
        create_display_event(
            organization_id=organization_id,
            event_type="fallback_activated",
            severity="warning",
            message="Display fallback activated",
            created_by_user_id=user_id
        )
    )
    session.commit()
