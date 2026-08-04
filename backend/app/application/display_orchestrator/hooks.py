from __future__ import annotations

from sqlalchemy.orm import Session

from app.application.admin_content.hooks import notify_admin_content_inventory_changed
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.domain.display_events import create_display_event
from app.repositories.events import DisplayEventRepository


def _active_orchestrator(session: Session, organization_id: str):
    operator_session = DisplayControlService(session).latest_active_session(organization_id)
    if operator_session is None:
        return None
    return OrchestratorRegistry.get(organization_id, operator_session.id)


def bootstrap_display_orchestrator(session: Session, organization_id: str) -> None:
    operator_session = DisplayControlService(session).latest_active_session(organization_id)
    if operator_session is None:
        return
    orchestrator = OrchestratorRegistry.get_or_create(organization_id, operator_session.id)
    orchestrator.bootstrap(session)


def ensure_display_orchestrator(session: Session, organization_id: str) -> None:
    """Start the orchestrator when kiosks join an active session without POST /display/open."""
    operator_session = DisplayControlService(session).latest_active_session(organization_id)
    if operator_session is None:
        return

    existing = OrchestratorRegistry.get(organization_id, operator_session.id)
    if existing is not None:
        existing.sync_remote_control_pause(session)
        existing.ensure_ad_rotation(session)
        existing.ensure_top_rotation(session)
        return

    orchestrator = OrchestratorRegistry.get_or_create(organization_id, operator_session.id)
    orchestrator.sync_remote_control_pause(session)
    stored = redis_state.redis_get_json(
        redis_state.orchestrator_key(organization_id, operator_session.id)
    )
    if stored and int(stored.get("commandSequence") or 0) > 0:
        orchestrator.ensure_ad_rotation(session)
        orchestrator.ensure_top_rotation(session)
        return
    orchestrator.bootstrap(session)


def notify_operator_sessions_superseded(
    session: Session,
    organization_id: str,
    superseded_session_ids: tuple[str, ...],
) -> None:
    if not superseded_session_ids:
        return
    hub = get_display_sse_hub()
    for operator_session_id in superseded_session_ids:
        hub.end_operator_session(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            reason="superseded",
        )
        OrchestratorRegistry.remove(organization_id, operator_session_id)
        DisplayEventRepository(session).record(
            create_display_event(
                organization_id=organization_id,
                event_type="orchestrator_session_ended",
                severity="info",
                message="Display orchestrator session ended",
                metadata={"reason": "superseded", "operatorSessionId": operator_session_id},
            )
        )
    session.commit()


def notify_content_mutated(organization_id: str) -> None:
    orchestrator_instances = OrchestratorRegistry.instances_for_organization(organization_id)
    for orchestrator in orchestrator_instances:
        orchestrator.mark_content_mutated()
        with orchestrator._session_factory() as session:  # noqa: SLF001
            _maybe_log_rotation_replan(orchestrator, session, reason="content_mutation")
    notify_admin_content_inventory_changed(organization_id, reason="mutation")


def _maybe_log_rotation_replan(
    orchestrator,
    session: Session,
    *,
    reason: str,
) -> None:
    from app.application.display_orchestrator.rotation_logging import log_rotation_replan
    from app.application.display_orchestrator.rotation_plan import compute_rotation_plan_snapshot

    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") != "loop" or state.get("isPaused"):
        return
    if not state.get("currentTopContentId"):
        return

    snapshot = compute_rotation_plan_snapshot(orchestrator, session, reason=reason)
    showing_id = snapshot.showing.id if snapshot.showing is not None else None
    next_id = snapshot.next.id if snapshot.next is not None else None
    signature = (showing_id, next_id, snapshot.novelties)
    if getattr(orchestrator, "_last_replan_signature", None) == signature:
        return
    orchestrator._last_replan_signature = signature  # noqa: SLF001
    log_rotation_replan(
        snapshot,
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        reason=reason,
    )
    from app.application.display_orchestrator.preload import emit_novelty_preload

    emit_novelty_preload(orchestrator, session)


def notify_remote_state_changed(session: Session, organization_id: str) -> None:
    orchestrator = _active_orchestrator(session, organization_id)
    if orchestrator is None:
        return
    remote = DisplayControlService(session).read_state_for_active_session(organization_id)
    if remote is None:
        return
    orchestrator.apply_remote_state(session, remote, reason="remote_mode_change")


def notify_remote_navigation(
    session: Session,
    organization_id: str,
    remote_state: object,
    *,
    command: str | None = None,
) -> None:
    resolved = command or getattr(remote_state, "navigation_command", None)
    if not resolved:
        return
    ensure_display_orchestrator(session, organization_id)
    orchestrator = _active_orchestrator(session, organization_id)
    if orchestrator is None:
        return
    orchestrator.handle_remote_navigation(session, remote_state, command=resolved)
