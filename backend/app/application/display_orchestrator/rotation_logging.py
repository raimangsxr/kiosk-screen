from __future__ import annotations

import logging

from app.application.display_orchestrator.rotation_plan import RotationPlanSnapshot

logger = logging.getLogger(__name__)


def _snapshot_extra(
    snapshot: RotationPlanSnapshot,
    *,
    organization_id: str,
    operator_session_id: str,
    event: str,
    reason: str,
) -> dict[str, object]:
    return {
        "event": event,
        "organizationId": organization_id,
        "operatorSessionId": operator_session_id,
        "reason": reason or snapshot.reason,
        "showing": (
            {"id": snapshot.showing.id, "title": snapshot.showing.title}
            if snapshot.showing is not None
            else None
        ),
        "next": (
            {"id": snapshot.next.id, "title": snapshot.next.title}
            if snapshot.next is not None
            else None
        ),
        "novelties": list(snapshot.novelties),
    }
    if snapshot.rescheduled_regular is not None:
        extra["rescheduledRegular"] = {
            "id": snapshot.rescheduled_regular.id,
            "title": snapshot.rescheduled_regular.title,
        }
    if snapshot.novelty_defer_counts:
        extra["deferCounts"] = dict(snapshot.novelty_defer_counts)
    return extra


def log_rotation_plan(
    snapshot: RotationPlanSnapshot,
    *,
    organization_id: str,
    operator_session_id: str,
    reason: str,
) -> None:
    logger.info(
        "rotation_plan",
        extra=_snapshot_extra(
            snapshot,
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event="rotation_plan",
            reason=reason,
        ),
    )


def log_rotation_replan(
    snapshot: RotationPlanSnapshot,
    *,
    organization_id: str,
    operator_session_id: str,
    reason: str,
) -> None:
    logger.info(
        "rotation_replan",
        extra=_snapshot_extra(
            snapshot,
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event="rotation_replan",
            reason=reason,
        ),
    )
