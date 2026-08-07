from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.application.display_orchestrator.rotation_logic import (
    novelty_queue,
    pick_due_recurring,
    recurring_queue,
)
from app.application.display_orchestrator.service import _pick_next_regular, _regular_queue
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_top_content

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator


@dataclass(frozen=True)
class ContentRef:
    id: str
    title: str


@dataclass(frozen=True)
class RotationPlanSnapshot:
    showing: ContentRef | None
    next: ContentRef | None
    novelties: tuple[str, ...]
    reason: str = ""
    rescheduled_regular: ContentRef | None = None
    novelty_defer_counts: dict[str, int] | None = None


def _content_ref(item: TopContentItem | None) -> ContentRef | None:
    if item is None:
        return None
    return ContentRef(id=str(item.id), title=item.title)


def _lookup_content(
    session: Session,
    organization_id: str,
    content_id: str | None,
) -> TopContentItem | None:
    if not content_id:
        return None
    eligible = {str(item.id): item for item in eligible_top_content(session, organization_id)}
    return eligible.get(str(content_id))


def _pick_planned_next(
    eligible: list[TopContentItem],
    state: dict[str, Any],
    *,
    orchestrator: DisplayOrchestrator | None = None,
    session: Session | None = None,
) -> TopContentItem | None:
    pending_novelties = novelty_queue(eligible)
    if pending_novelties:
        head = pending_novelties[0]
        if orchestrator is not None and session is not None:
            from app.application.display_orchestrator.novelty_defer import (
                get_connected_kiosk_ids,
                is_novelty_ready,
            )

            connected_ids = get_connected_kiosk_ids(orchestrator)
            current_state = orchestrator._load_state()  # noqa: SLF001
            if is_novelty_ready(current_state, str(head.id), connected_ids):
                return head
        else:
            return head

    rescheduled_id = state.get("rescheduledRegularContentId")
    if rescheduled_id and session is not None and orchestrator is not None:
        rescheduled = _lookup_content(session, orchestrator.organization_id, str(rescheduled_id))
        if rescheduled is not None:
            return rescheduled

    counters = dict(state.get("recurringCounters") or {})
    recurring_items = recurring_queue(eligible)
    due = pick_due_recurring(recurring_items, counters)
    if due is not None:
        return due

    regular = _regular_queue(eligible)
    if regular:
        return _pick_next_regular(regular, state.get("regularCursorId"))

    filler = recurring_queue(eligible)
    if filler:
        return _pick_next_regular(filler, state.get("fillerCursorId"))

    return None


def compute_rotation_plan_snapshot(
    orchestrator: DisplayOrchestrator,
    session: Session,
    *,
    reason: str = "",
) -> RotationPlanSnapshot:
    state = orchestrator._load_state()  # noqa: SLF001
    eligible = eligible_top_content(session, orchestrator.organization_id)
    novelty_ids = tuple(str(item.id) for item in novelty_queue(eligible))
    defer_counts = dict(state.get("noveltyDeferCounts") or {}) or None

    rescheduled_id = state.get("rescheduledRegularContentId")
    rescheduled_item = (
        _lookup_content(session, orchestrator.organization_id, str(rescheduled_id))
        if rescheduled_id
        else None
    )

    if state.get("isPaused") or state.get("contentMode") == "iframe":
        return RotationPlanSnapshot(
            showing=None,
            next=None,
            novelties=novelty_ids,
            reason=reason,
            rescheduled_regular=_content_ref(rescheduled_item),
            novelty_defer_counts=defer_counts,
        )

    showing_item = _lookup_content(
        session,
        orchestrator.organization_id,
        state.get("currentTopContentId"),
    )

    if state.get("contentMode") != "loop":
        return RotationPlanSnapshot(
            showing=_content_ref(showing_item),
            next=None,
            novelties=novelty_ids,
            reason=reason,
            rescheduled_regular=_content_ref(rescheduled_item),
            novelty_defer_counts=defer_counts,
        )

    next_item = _pick_planned_next(eligible, state, orchestrator=orchestrator, session=session)
    return RotationPlanSnapshot(
        showing=_content_ref(showing_item),
        next=_content_ref(next_item),
        novelties=novelty_ids,
        reason=reason,
        rescheduled_regular=_content_ref(rescheduled_item),
        novelty_defer_counts=defer_counts,
    )
