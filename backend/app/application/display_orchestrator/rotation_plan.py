from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

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
    state: dict,
) -> TopContentItem | None:
    pending_novelties = novelty_queue(eligible)
    if pending_novelties:
        return pending_novelties[0]

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

    if state.get("isPaused") or state.get("contentMode") == "iframe":
        return RotationPlanSnapshot(
            showing=None,
            next=None,
            novelties=novelty_ids,
            reason=reason,
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
        )

    next_item = _pick_planned_next(eligible, state)
    return RotationPlanSnapshot(
        showing=_content_ref(showing_item),
        next=_content_ref(next_item),
        novelties=novelty_ids,
        reason=reason,
    )
