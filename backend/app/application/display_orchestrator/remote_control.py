from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.mappers import to_iframe_schema
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.command_builder import (
    build_show_content_payload,
    next_command_id,
)
from app.application.display_orchestrator.service import (
    _pick_next_regular,
    _pick_previous_regular,
    _regular_queue,
)
from app.application.display_orchestrator.rotation_logic import reset_recurring_counter
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_top_content

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator


def apply_remote_state(
    orchestrator: DisplayOrchestrator,
    session: Session,
    remote: DisplayControlState,
    *,
    reason: str,
) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    previous_mode = state.get("contentMode", "loop")
    new_mode = remote.content_mode
    is_paused = remote.navigation_command == "pause"

    patch: dict[str, Any] = {
        "contentMode": new_mode,
        "adsVisible": remote.ads_visible,
        "selectedIframeId": remote.selected_iframe_id,
        "selectedFixedContentId": remote.selected_fixed_content_id,
        "isPaused": is_paused,
    }

    if previous_mode != "fixed" and new_mode == "fixed":
        patch["loopCursorBeforeFixed"] = state.get("regularCursorId")

    if previous_mode == "fixed" and new_mode == "loop":
        before_fixed = state.get("loopCursorBeforeFixed")
        queue = _regular_queue(eligible_top_content(session, orchestrator.organization_id))
        if before_fixed and queue:
            resume_item = _pick_next_regular(queue, before_fixed)
            if resume_item is not None:
                patch["regularCursorId"] = str(resume_item.id)
        patch["loopCursorBeforeFixed"] = None

    orchestrator._update_state(patch)  # noqa: SLF001
    publish_mode_changed(
        orchestrator,
        content_mode=new_mode,
        is_paused=is_paused,
        ads_visible=remote.ads_visible,
        selected_fixed_content_id=remote.selected_fixed_content_id,
        reason=reason,
    )

    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return

    if new_mode == "iframe" and remote.selected_iframe_id:
        emit_iframe(orchestrator, session, remote.selected_iframe_id, reason=reason)
        return

    if new_mode == "fixed" and remote.selected_fixed_content_id:
        item = _lookup_content(session, orchestrator.organization_id, remote.selected_fixed_content_id)
        if item is not None and item.is_fixed:
            emit_fixed_content(orchestrator, session, item, configuration, reason=reason)
            return
        _fallback_fixed_to_loop(orchestrator, session, remote, reason="fixed_auto_fallback")
        return

    if new_mode == "loop":
        if is_paused:
            orchestrator._scheduler.cancel_top()  # noqa: SLF001
            return
        cursor_id = orchestrator._load_state().get("regularCursorId")  # noqa: SLF001
        item = _resolve_loop_item(session, orchestrator.organization_id, cursor_id)
        if item is not None:
            emit_loop_content(orchestrator, session, item, configuration, reason=reason)


def handle_remote_navigation(
    orchestrator: DisplayOrchestrator,
    session: Session,
    remote: DisplayControlState,
    *,
    command: str,
) -> None:
    if command == "pause":
        with orchestrator._lock:  # noqa: SLF001
            orchestrator._update_state({"isPaused": True})  # noqa: SLF001
            orchestrator._scheduler.cancel_top()  # noqa: SLF001
        publish_mode_changed(
            orchestrator,
            content_mode=remote.content_mode,
            is_paused=True,
            ads_visible=remote.ads_visible,
            selected_fixed_content_id=remote.selected_fixed_content_id,
            reason="remote_pause",
        )
        return

    if command == "resume":
        with orchestrator._lock:  # noqa: SLF001
            orchestrator._update_state({"isPaused": False})  # noqa: SLF001
        publish_mode_changed(
            orchestrator,
            content_mode=remote.content_mode,
            is_paused=False,
            ads_visible=remote.ads_visible,
            selected_fixed_content_id=remote.selected_fixed_content_id,
            reason="remote_resume",
        )
        if remote.content_mode == "loop":
            with orchestrator._lock:  # noqa: SLF001
                rearm_current_loop_content(orchestrator, session)
        return

    if remote.content_mode != "loop":
        return

    orchestrator._update_state({"isPaused": False})  # noqa: SLF001

    if command == "next":
        orchestrator.advance_top(session, reason="remote_next")
        return

    if command == "previous":
        advance_top_previous(orchestrator, session, reason="remote_previous")
        return

    if command == "jump_to" and remote.jump_to_content_id:
        show_content_by_id(
            orchestrator,
            session,
            remote.jump_to_content_id,
            reason="remote_jump_to",
        )


def check_fixed_auto_fallback(orchestrator: DisplayOrchestrator, session: Session) -> None:
    service = DisplayControlService(session)
    try:
        remote = service.get_state_for_active_session(orchestrator.organization_id)
    except LookupError:
        return
    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") != "fixed":
        return
    if remote.content_mode == "fixed":
        return
    apply_remote_state(orchestrator, session, remote, reason="fixed_auto_fallback")


def publish_mode_changed(
    orchestrator: DisplayOrchestrator,
    *,
    content_mode: str,
    is_paused: bool,
    ads_visible: bool,
    selected_fixed_content_id: str | None,
    reason: str,
) -> None:
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="mode_changed",
        payload={
            "contentMode": content_mode,
            "isPaused": is_paused,
            "adsVisible": ads_visible,
            "selectedFixedContentId": selected_fixed_content_id,
            "reason": reason,
        },
    )


def emit_iframe(
    orchestrator: DisplayOrchestrator,
    session: Session,
    iframe_id: str,
    *,
    reason: str,
) -> None:
    iframe = session.scalar(
        select(Iframe).where(
            Iframe.organization_id == orchestrator.organization_id,
            Iframe.id == iframe_id,
        )
    )
    if iframe is None:
        return
    state = orchestrator._load_state()  # noqa: SLF001
    command_sequence = int(state.get("commandSequence") or 0) + 1
    command_id = next_command_id(command_sequence)
    orchestrator._update_state(  # noqa: SLF001
        {
            "commandSequence": command_sequence,
            "currentTopCommandId": command_id,
            "currentTopContentId": None,
        }
    )
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="show_iframe",
        payload={
            "commandId": command_id,
            "iframe": to_iframe_schema(iframe).model_dump(mode="json", by_alias=True),
            "reason": reason,
        },
    )
    orchestrator._scheduler.cancel_top()  # noqa: SLF001


def emit_fixed_content(
    orchestrator: DisplayOrchestrator,
    session: Session,
    item: TopContentItem,
    configuration,
    *,
    reason: str,
) -> None:
    playback_mode = "fixed_loop" if item.content_type == "video" else "manual"
    _emit_show_content(
        orchestrator,
        session,
        item,
        configuration,
        reason=reason,
        playback_mode=playback_mode,
        update_cursor=False,
    )
    orchestrator._scheduler.cancel_top()  # noqa: SLF001


def emit_loop_content(
    orchestrator: DisplayOrchestrator,
    session: Session,
    item: TopContentItem,
    configuration,
    *,
    reason: str,
) -> None:
    playback_mode = "video" if item.content_type == "video" else "timer"
    payload = _emit_show_content(
        orchestrator,
        session,
        item,
        configuration,
        reason=reason,
        playback_mode=playback_mode,
        update_cursor=True,
    )
    orchestrator._arm_top_timer(payload)  # noqa: SLF001


def show_content_by_id(
    orchestrator: DisplayOrchestrator,
    session: Session,
    content_id: str,
    *,
    reason: str,
) -> None:
    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return
    item = _lookup_content(session, orchestrator.organization_id, content_id)
    if item is None:
        return
    state = orchestrator._load_state()  # noqa: SLF001
    counters = dict(state.get("recurringCounters") or {})
    if item.recurring_every_x_iterations is not None:
        counters = reset_recurring_counter(counters, str(item.id))
        orchestrator._update_state({"recurringCounters": counters})  # noqa: SLF001
    playback_mode = "video" if item.content_type == "video" else "timer"
    payload = _emit_show_content(
        orchestrator,
        session,
        item,
        configuration,
        reason=reason,
        playback_mode=playback_mode,
        update_cursor=True,
    )
    orchestrator._arm_top_timer(payload)  # noqa: SLF001
    orchestrator._record_top_advanced(  # noqa: SLF001
        session,
        command_id=payload["commandId"],
        reason=reason,
        content_id=str(item.id),
    )


def advance_top_previous(orchestrator: DisplayOrchestrator, session: Session, *, reason: str) -> None:
    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return
    state = orchestrator._load_state()  # noqa: SLF001
    queue = _regular_queue(eligible_top_content(session, orchestrator.organization_id))
    if not queue:
        orchestrator.schedule_empty_queue_audit()
        return
    previous_item = _pick_previous_regular(queue, state.get("regularCursorId"))
    if previous_item is None:
        return
    playback_mode = "video" if previous_item.content_type == "video" else "timer"
    payload = _emit_show_content(
        orchestrator,
        session,
        previous_item,
        configuration,
        reason=reason,
        playback_mode=playback_mode,
        update_cursor=True,
    )
    orchestrator._arm_top_timer(payload)  # noqa: SLF001
    orchestrator._record_top_advanced(  # noqa: SLF001
        session,
        command_id=payload["commandId"],
        reason=reason,
        content_id=str(previous_item.id),
    )


def rearm_current_loop_content(orchestrator: DisplayOrchestrator, session: Session) -> None:
    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return
    state = orchestrator._load_state()  # noqa: SLF001
    content_id = state.get("currentTopContentId")
    if not content_id:
        return
    item = _lookup_content(session, orchestrator.organization_id, content_id)
    if item is None:
        return
    playback_mode = "video" if item.content_type == "video" else "timer"
    payload = build_show_content_payload(
        item=item,
        configuration=configuration,
        command_id=state.get("currentTopCommandId") or next_command_id(1),
        reason="remote_resume",
        playback_mode=playback_mode,
    )
    orchestrator._arm_top_timer(payload)  # noqa: SLF001


def _fallback_fixed_to_loop(
    orchestrator: DisplayOrchestrator,
    session: Session,
    remote: DisplayControlState,
    *,
    reason: str,
) -> None:
    orchestrator._update_state(  # noqa: SLF001
        {
            "contentMode": "loop",
            "selectedFixedContentId": None,
            "selectedIframeId": None,
            "isPaused": False,
        }
    )
    publish_mode_changed(
        orchestrator,
        content_mode="loop",
        is_paused=False,
        ads_visible=remote.ads_visible,
        selected_fixed_content_id=None,
        reason=reason,
    )
    configuration = orchestrator._configuration(session)  # noqa: SLF001
    if configuration is None:
        return
    cursor_id = orchestrator._load_state().get("regularCursorId")  # noqa: SLF001
    item = _resolve_loop_item(session, orchestrator.organization_id, cursor_id)
    if item is not None:
        emit_loop_content(orchestrator, session, item, configuration, reason=reason)


def _emit_show_content(
    orchestrator: DisplayOrchestrator,
    session: Session,
    item: TopContentItem,
    configuration,
    *,
    reason: str,
    playback_mode: str,
    update_cursor: bool,
) -> dict[str, Any]:
    state = orchestrator._load_state()  # noqa: SLF001
    command_sequence = int(state.get("commandSequence") or 0) + 1
    command_id = next_command_id(command_sequence)
    payload = build_show_content_payload(
        item=item,
        configuration=configuration,
        command_id=command_id,
        reason=reason,
        playback_mode=playback_mode,
    )
    if playback_mode in {"manual", "fixed_loop"}:
        payload["playback"]["mode"] = playback_mode
        payload["playback"]["loopVideo"] = playback_mode == "fixed_loop"
    patch: dict[str, Any] = {
        "commandSequence": command_sequence,
        "currentTopCommandId": command_id,
        "currentTopContentId": str(item.id),
        "processedKioskEvents": [],
    }
    if update_cursor:
        patch["regularCursorId"] = str(item.id)
    orchestrator._update_state(patch)  # noqa: SLF001
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="show_content",
        payload=payload,
    )
    return payload


def _lookup_content(session: Session, organization_id: str, content_id: str) -> TopContentItem | None:
    return session.scalar(
        select(TopContentItem).where(
            TopContentItem.organization_id == organization_id,
            TopContentItem.id == content_id,
        )
    )


def _resolve_loop_item(session: Session, organization_id: str, cursor_id: str | None) -> TopContentItem | None:
    queue = _regular_queue(eligible_top_content(session, organization_id))
    if not queue:
        return None
    if cursor_id:
        item = _lookup_content(session, organization_id, cursor_id)
        queue_ids = {str(row.id) for row in queue}
        if item is not None and str(item.id) in queue_ids:
            return item
    return sorted(queue, key=lambda row: row.display_order)[0]
