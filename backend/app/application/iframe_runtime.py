from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.mappers import to_iframe_schema
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.hooks import ensure_display_orchestrator
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.remote_control import emit_iframe
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.application.iframe_scale_resolver import resolve_effective_scale
from app.repositories.iframe_display_scale_overrides import IframeDisplayScaleOverrideRepository
from app.repositories.models.iframe import Iframe


def list_live_kiosks(organization_id: str) -> list[dict[str, str | None]]:
    return [
        {
            "kioskId": registration.kiosk_id,
            "displayLabel": registration.label,
        }
        for registration in get_display_sse_hub().list_registrations(organization_id)
    ]


def refresh_active_iframe_display(session: Session, organization_id: str, iframe_id: str) -> None:
    control = DisplayControlService(session)
    active_session = control.latest_active_session(organization_id)
    if active_session is None:
        return
    remote = control.read_state_for_active_session(organization_id)
    if remote is None or remote.content_mode != "iframe" or remote.selected_iframe_id != iframe_id:
        return
    orchestrator = OrchestratorRegistry.get(organization_id, active_session.id)
    if orchestrator is None:
        ensure_display_orchestrator(session, organization_id)
        orchestrator = OrchestratorRegistry.get(organization_id, active_session.id)
    if orchestrator is None:
        return
    emit_iframe(orchestrator, session, iframe_id, reason="iframe_updated")


def emit_iframe_scale_updated(
    session: Session,
    organization_id: str,
    iframe_id: str,
    display_device_id: str,
) -> None:
    control = DisplayControlService(session)
    active_session = control.latest_active_session(organization_id)
    if active_session is None:
        return
    iframe = session.scalar(
        select(Iframe).where(Iframe.organization_id == organization_id, Iframe.id == iframe_id)
    )
    if iframe is None:
        return
    override = IframeDisplayScaleOverrideRepository(session).get(display_device_id, iframe_id)
    effective = resolve_effective_scale(iframe, override)
    get_display_sse_hub().publish(
        organization_id=organization_id,
        operator_session_id=active_session.id,
        event_type="iframe_scale_updated",
        payload={
            "displayDeviceId": display_device_id,
            "iframeId": iframe_id,
            "scaleX": float(effective.scale_x),
            "scaleY": float(effective.scale_y),
            "source": effective.source,
        },
    )
