"""Idle/expired orchestrator reaper (R2, CHG-051).

Orchestrators are created per operator session and, once created, keep their
rotation timers (and now a dedicated scheduler thread) armed forever — the only
teardown path is a superseding session. A venue that opens/closes several
sessions across an event day therefore accumulates orchestrators, each burning
a thread plus per-tick DB/Redis work with zero connected kiosks.

This reaper periodically removes orchestrators whose operator session is no
longer the active one (expired/superseded) or that have had no live SSE
subscriber for longer than a grace period. Removal calls
``OrchestratorRegistry.remove`` → ``DisplayOrchestrator.shutdown`` →
``OrchestratorScheduler.shutdown``, stopping the thread and timers. A kiosk
that reconnects later re-creates the orchestrator from persisted Redis state
via ``ensure_display_orchestrator``.
"""
from __future__ import annotations

import logging

from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub

logger = logging.getLogger(__name__)

REAP_INTERVAL_SECONDS = 60.0
ORCHESTRATOR_IDLE_GRACE_SECONDS = 120.0


def reap_idle_orchestrators(
    idle_since: dict[tuple[str, str], float],
    *,
    now: float,
    grace_seconds: float = ORCHESTRATOR_IDLE_GRACE_SECONDS,
) -> list[tuple[str, str, str]]:
    """Remove expired/idle orchestrators. ``idle_since`` carries idle-start
    timestamps across calls. Returns (org, session, reason) for each removal."""
    hub = get_display_sse_hub()
    removed: list[tuple[str, str, str]] = []
    entries = OrchestratorRegistry.items()
    if not entries:
        idle_since.clear()
        return removed

    with OrchestratorRegistry.new_session() as session:
        control = DisplayControlService(session)
        active_by_org: dict[str, str | None] = {}
        for (organization_id, operator_session_id), _orchestrator in entries:
            key = (organization_id, operator_session_id)
            if organization_id not in active_by_org:
                active = control.latest_active_session(organization_id)
                active_by_org[organization_id] = str(active.id) if active is not None else None

            if active_by_org[organization_id] != str(operator_session_id):
                OrchestratorRegistry.remove(organization_id, operator_session_id)
                idle_since.pop(key, None)
                removed.append((organization_id, operator_session_id, "expired"))
                continue

            if hub.has_live_subscribers_for_session(organization_id, operator_session_id):
                idle_since.pop(key, None)
                continue

            first_idle = idle_since.get(key)
            if first_idle is None:
                idle_since[key] = now
                continue
            if now - first_idle >= grace_seconds:
                OrchestratorRegistry.remove(organization_id, operator_session_id)
                idle_since.pop(key, None)
                removed.append((organization_id, operator_session_id, "idle"))

    # Drop bookkeeping for orchestrators that no longer exist.
    live_keys = {key for key, _ in entries}
    for stale_key in [key for key in idle_since if key not in live_keys]:
        idle_since.pop(stale_key, None)

    if removed:
        logger.info("Reaped %d idle/expired orchestrator(s): %s", len(removed), removed)
    return removed
