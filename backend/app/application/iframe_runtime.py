from __future__ import annotations

from sqlalchemy.orm import Session

from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.hooks import ensure_display_orchestrator
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.remote_control import emit_iframe
from app.application.display_orchestrator.sse_hub import get_display_sse_hub


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
