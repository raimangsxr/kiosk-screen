from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.application.display_orchestrator.command_builder import build_show_content_payload, next_command_id
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_top_content

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator


def novelty_queue(items: list[TopContentItem]) -> list[TopContentItem]:
    return sorted(
        [item for item in items if item.is_novelty],
        key=lambda item: item.display_order,
    )


def recurring_queue(items: list[TopContentItem]) -> list[TopContentItem]:
    return sorted(
        [
            item
            for item in items
            if not item.is_novelty
            and item.recurring_every_x_iterations is not None
            and item.recurring_every_x_iterations >= 1
        ],
        key=lambda item: item.display_order,
    )


def increment_recurring_counters(
    counters: dict[str, int],
    recurring_items: list[TopContentItem],
) -> dict[str, int]:
    next_counters = dict(counters)
    for item in recurring_items:
        key = str(item.id)
        next_counters[key] = next_counters.get(key, 0) + 1
    return next_counters


def pick_due_recurring(
    recurring_items: list[TopContentItem],
    counters: dict[str, int],
) -> TopContentItem | None:
    due = [
        item
        for item in recurring_items
        if counters.get(str(item.id), 0) >= item.recurring_every_x_iterations
    ]
    if not due:
        return None
    return sorted(due, key=lambda item: item.display_order)[0]


def prune_recurring_counters(
    counters: dict[str, int],
    recurring_items: list[TopContentItem],
) -> dict[str, int]:
    allowed = {str(item.id) for item in recurring_items}
    return {key: value for key, value in counters.items() if key in allowed}


def reset_recurring_counter(counters: dict[str, int], content_id: str) -> dict[str, int]:
    next_counters = dict(counters)
    next_counters[str(content_id)] = 0
    return next_counters


def advance_loop_top(
    orchestrator: DisplayOrchestrator,
    session: Session,
    *,
    reason: str = "rotation_advance",
) -> bool:
    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("isPaused") and not reason.startswith("remote_"):
        return False
    if state.get("contentMode") != "loop":
        return False

    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return False

    eligible = eligible_top_content(session, orchestrator.organization_id)
    counters = prune_recurring_counters(
        dict(state.get("recurringCounters") or {}),
        recurring_queue(eligible),
    )
    recurring_items = recurring_queue(eligible)

    pending_novelties = novelty_queue(eligible)
    if pending_novelties:
        item = pending_novelties[0]
        consume_novelty(session, orchestrator.organization_id, str(item.id))
        emit_top_content(
            orchestrator,
            session,
            item,
            configuration,
            reason="novelty",
            update_regular_cursor=False,
            counters=counters,
        )
        return True

    due = pick_due_recurring(recurring_items, counters)
    if due is not None:
        counters = reset_recurring_counter(counters, str(due.id))
        emit_top_content(
            orchestrator,
            session,
            due,
            configuration,
            reason="recurring_due",
            update_regular_cursor=False,
            counters=counters,
        )
        return True

    from app.application.display_orchestrator.service import _pick_next_regular, _regular_queue

    regular = _regular_queue(eligible)
    if regular:
        next_item = _pick_next_regular(regular, state.get("regularCursorId"))
        if next_item is None:
            orchestrator.schedule_empty_queue_audit()
            return False
        emit_preload(orchestrator, session, regular, next_item)
        counters = increment_recurring_counters(counters, recurring_items)
        emit_top_content(
            orchestrator,
            session,
            next_item,
            configuration,
            reason=reason,
            update_regular_cursor=True,
            counters=counters,
        )
        return True

    filler = recurring_queue(eligible)
    if filler:
        from app.application.display_orchestrator.service import _pick_next_regular

        next_item = _pick_next_regular(filler, state.get("fillerCursorId"))
        if next_item is None:
            orchestrator.schedule_empty_queue_audit()
            return False
        emit_top_content(
            orchestrator,
            session,
            next_item,
            configuration,
            reason=reason,
            update_regular_cursor=False,
            counters=counters,
            update_filler_cursor=True,
        )
        return True

    orchestrator._update_state({"recurringCounters": counters, "playlistDirty": False})  # noqa: SLF001
    orchestrator.schedule_empty_queue_audit()
    return False


def consume_novelty(session: Session, organization_id: str, content_id: str) -> None:
    session.execute(
        update(TopContentItem)
        .where(
            TopContentItem.id == content_id,
            TopContentItem.organization_id == organization_id,
            TopContentItem.is_novelty.is_(True),
        )
        .values(is_novelty=False)
    )
    session.commit()


def emit_top_content(
    orchestrator: DisplayOrchestrator,
    session: Session,
    item: TopContentItem,
    configuration,
    *,
    reason: str,
    update_regular_cursor: bool,
    counters: dict[str, int],
    update_filler_cursor: bool = False,
) -> dict[str, Any]:
    state = orchestrator._load_state()  # noqa: SLF001
    command_sequence = int(state.get("commandSequence") or 0) + 1
    command_id = next_command_id(command_sequence)
    playback_mode = "video" if item.content_type == "video" else "timer"
    payload = build_show_content_payload(
        item=item,
        configuration=configuration,
        command_id=command_id,
        reason=reason,
        playback_mode=playback_mode,
    )
    patch: dict[str, Any] = {
        "commandSequence": command_sequence,
        "currentTopCommandId": command_id,
        "currentTopContentId": str(item.id),
        "playlistDirty": False,
        "processedKioskEvents": [],
        "recurringCounters": counters,
        "noveltyBurstActive": reason == "novelty",
    }
    if update_regular_cursor:
        patch["regularCursorId"] = str(item.id)
    if update_filler_cursor:
        patch["fillerCursorId"] = str(item.id)
    if orchestrator._load_state().get("isPaused") and not reason.startswith("remote_"):  # noqa: SLF001
        return payload
    orchestrator._update_state(patch)  # noqa: SLF001
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="show_content",
        payload=payload,
    )
    orchestrator._record_top_advanced(  # noqa: SLF001
        session,
        command_id=command_id,
        reason=reason,
        content_id=str(item.id),
    )
    orchestrator._arm_top_timer(payload)  # noqa: SLF001
    return payload


def emit_preload(
    orchestrator: DisplayOrchestrator,
    session: Session,
    regular_queue: list[TopContentItem],
    current_item: TopContentItem,
) -> None:
    from app.application.display_orchestrator.service import _pick_next_regular

    upcoming = _pick_next_regular(regular_queue, str(current_item.id))
    if upcoming is None or upcoming.id == current_item.id:
        return
    media_url = _media_url(upcoming)
    if media_url is None:
        return
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="preload",
        payload={
            "items": [
                {
                    "contentId": str(upcoming.id),
                    "mediaUrl": media_url,
                    "contentType": upcoming.content_type,
                    "mediaVersion": str(upcoming.id),
                }
            ],
            "leadTimeSeconds": 5,
        },
    )


def run_availability_tick(orchestrator: DisplayOrchestrator, session: Session) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") != "loop" or state.get("isPaused"):
        return
    content_id = state.get("currentTopContentId")
    if not content_id:
        return
    eligible_ids = {str(item.id) for item in eligible_top_content(session, orchestrator.organization_id)}
    if content_id not in eligible_ids:
        advance_loop_top(orchestrator, session, reason="availability")


def _media_url(item: TopContentItem) -> str | None:
    media_file = getattr(item, "media_file", None)
    if media_file is not None and getattr(media_file, "public_reference", None):
        return media_file.public_reference
    if item.source_reference:
        return item.source_reference
    return None
