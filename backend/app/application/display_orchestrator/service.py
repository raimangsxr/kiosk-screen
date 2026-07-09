from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.command_builder import (
    build_show_ads_payload,
    build_show_content_payload,
    next_command_id,
)
from app.application.display_orchestrator.scheduler import OrchestratorScheduler
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.domain.display_events import create_display_event
from app.repositories.events import DisplayEventRepository
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.services.display_service import eligible_ads, eligible_top_content, get_display_state

logger = logging.getLogger(__name__)

EMPTY_QUEUE_DEBOUNCE_SECONDS = 0.2
PROCESSED_EVENT_LIMIT = 32
ORCHESTRATOR_TTL_SECONDS = 3_600


def _default_state() -> dict[str, Any]:
    return {
        "contentMode": "loop",
        "isPaused": False,
        "adsVisible": True,
        "selectedIframeId": None,
        "selectedFixedContentId": None,
        "currentTopCommandId": None,
        "currentTopContentId": None,
        "currentAdCommandId": None,
        "currentAdStartIndex": 0,
        "regularCursorId": None,
        "commandSequence": 0,
        "playlistDirty": False,
        "pendingInlineAdCount": None,
        "processedKioskEvents": [],
        "loopCursorBeforeFixed": None,
        "fillerCursorId": None,
        "recurringCounters": {},
        "noveltyBurstActive": False,
    }


def _regular_queue(items: list[TopContentItem]) -> list[TopContentItem]:
    return [
        item
        for item in items
        if not item.is_novelty and item.recurring_every_x_iterations is None
    ]


def _pick_next_regular(queue: list[TopContentItem], cursor_id: str | None) -> TopContentItem | None:
    if not queue:
        return None
    ordered = sorted(queue, key=lambda item: item.display_order)
    if cursor_id is None:
        return ordered[0]
    ids = [str(item.id) for item in ordered]
    cursor = str(cursor_id)
    try:
        index = ids.index(cursor)
    except ValueError:
        return ordered[0]
    return ordered[(index + 1) % len(ordered)]


def _pick_previous_regular(queue: list[TopContentItem], cursor_id: str | None) -> TopContentItem | None:
    if not queue:
        return None
    ordered = sorted(queue, key=lambda item: item.display_order)
    if cursor_id is None:
        return ordered[-1]
    ids = [str(item.id) for item in ordered]
    cursor = str(cursor_id)
    try:
        index = ids.index(cursor)
    except ValueError:
        return ordered[-1]
    return ordered[(index - 1) % len(ordered)]


class DisplayOrchestrator:
    def __init__(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        session_factory: Callable[[], Session],
    ) -> None:
        self.organization_id = organization_id
        self.operator_session_id = operator_session_id
        self._session_factory = session_factory
        self._lock = threading.RLock()
        self._empty_queue_timer: threading.Timer | None = None
        self._scheduler = OrchestratorScheduler(
            on_top_timer=self._on_top_timer,
            on_ad_timer=self._on_ad_timer,
            on_availability_timer=self._on_availability_timer,
        )

    def bootstrap(self, session: Session) -> None:
        with self._lock:
            state = _default_state()
            redis_state.redis_set_json(
                redis_state.orchestrator_key(self.organization_id, self.operator_session_id),
                state,
                ex=ORCHESTRATOR_TTL_SECONDS,
            )
        display_state = get_display_state(session, self.organization_id)
        remote = display_state.remote_control
        if remote is not None:
            self._update_state(
                {
                    "contentMode": remote.content_mode,
                    "isPaused": remote.navigation_command == "pause",
                    "adsVisible": remote.ads_visible,
                    "selectedIframeId": remote.selected_iframe_id,
                    "selectedFixedContentId": remote.selected_fixed_content_id,
                }
            )
        self._show_initial_content(session, display_state.configuration)
        self._show_initial_ads(session, display_state.configuration)
        self._emit_snapshot(session, display_state.configuration)
        self._scheduler.arm_availability(30)

    def mark_content_mutated(self) -> None:
        self._update_state({"playlistDirty": True})
        session = self._session_factory()
        try:
            from app.application.display_orchestrator.remote_control import check_fixed_auto_fallback
            from app.application.display_orchestrator.rotation_logic import (
                prune_recurring_counters,
                recurring_queue,
            )

            check_fixed_auto_fallback(self, session)
            eligible = eligible_top_content(session, self.organization_id)
            state = self._load_state()
            counters = prune_recurring_counters(
                dict(state.get("recurringCounters") or {}),
                recurring_queue(eligible),
            )
            self._update_state({"recurringCounters": counters})
        finally:
            session.close()

    def apply_remote_state(self, session: Session, remote: object, *, reason: str) -> None:
        from app.application.display_orchestrator.remote_control import apply_remote_state

        apply_remote_state(self, session, remote, reason=reason)

    def handle_remote_navigation(self, session: Session, remote: object, *, command: str) -> None:
        from app.application.display_orchestrator.remote_control import handle_remote_navigation

        handle_remote_navigation(self, session, remote, command=command)

    def apply_config_deferred_fields(self, changed_fields: list[str], after_values: dict[str, object]) -> None:
        patch: dict[str, Any] = {}
        if "inlineAdCount" in changed_fields:
            patch["pendingInlineAdCount"] = after_values.get("inlineAdCount")
        if patch:
            self._update_state(patch)

    def handle_video_ended(self, session: Session, *, command_id: str) -> bool:
        state = self._load_state()
        if state.get("isPaused"):
            return False
        if command_id != state.get("currentTopCommandId"):
            return False
        processed = list(state.get("processedKioskEvents") or [])
        if command_id in processed:
            return False
        processed.append(command_id)
        if len(processed) > PROCESSED_EVENT_LIMIT:
            processed = processed[-PROCESSED_EVENT_LIMIT:]
        self._update_state({"processedKioskEvents": processed})
        self.advance_top(session, reason="video_ended")
        return True

    def handle_media_error(
        self,
        session: Session,
        *,
        command_id: str,
        content_id: str | None,
        metadata: dict[str, Any] | None,
    ) -> None:
        DisplayEventRepository(session).record(
            create_display_event(
                organization_id=self.organization_id,
                event_type="media_error",
                severity="warning",
                message="Kiosk reported media playback error",
                metadata={
                    "commandId": command_id,
                    "contentId": content_id,
                    **(metadata or {}),
                },
            )
        )
        session.commit()

    def advance_top(self, session: Session, *, reason: str = "rotation_advance") -> bool:
        from app.application.display_orchestrator.rotation_logic import advance_loop_top

        return advance_loop_top(self, session, reason=reason)

    def advance_ad(self, session: Session, *, reason: str = "ad_rotation") -> None:
        state = self._load_state()
        if not state.get("adsVisible", True):
            return

        configuration = self._configuration(session)
        if configuration is None:
            self._arm_ad_timer(10)
            return

        ads = eligible_ads(session, self.organization_id)
        if not ads:
            self._arm_ad_timer(configuration.default_ad_duration_seconds)
            return

        pending_inline_ad_count = state.get("pendingInlineAdCount")
        inline_ad_count = (
            int(pending_inline_ad_count)
            if pending_inline_ad_count is not None
            else configuration.inline_ad_count
        )

        start_index = int(state.get("currentAdStartIndex") or 0)
        visible_count = inline_ad_count or 1
        next_start = (start_index + visible_count) % len(ads)

        command_sequence = int(state.get("commandSequence") or 0) + 1
        command_id = next_command_id(command_sequence)
        payload = build_show_ads_payload(
            ads=ads,
            configuration=configuration,
            command_id=command_id,
            start_index=start_index,
            reason=reason,
            inline_ad_count=inline_ad_count,
        )
        self._update_state(
            {
                "commandSequence": command_sequence,
                "currentAdCommandId": command_id,
                "currentAdStartIndex": next_start,
                "pendingInlineAdCount": None,
            }
        )
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="show_ads",
            payload=payload,
        )
        self._arm_ad_timer(configuration.default_ad_duration_seconds)

    def ensure_ad_rotation(self, session: Session) -> None:
        """Re-arm ad rotation and republish the current ad window for joining kiosks."""
        state = self._load_state()
        if not state.get("adsVisible", True):
            return

        configuration = self._configuration(session)
        if configuration is None:
            return

        ads = eligible_ads(session, self.organization_id)
        if not ads:
            return

        visible_count = configuration.inline_ad_count or 1
        next_index = int(state.get("currentAdStartIndex") or visible_count)
        display_start = (next_index - visible_count) % len(ads)
        command_id = state.get("currentAdCommandId")
        if command_id is None:
            command_sequence = int(state.get("commandSequence") or 0) + 1
            command_id = next_command_id(command_sequence)
            display_start = 0
        else:
            command_id = str(command_id)

        payload = build_show_ads_payload(
            ads=ads,
            configuration=configuration,
            command_id=command_id,
            start_index=display_start,
            reason="sync",
            inline_ad_count=configuration.inline_ad_count,
        )
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="show_ads",
            payload=payload,
        )
        self._arm_ad_timer(configuration.default_ad_duration_seconds)

    def sync_remote_control_pause(self, session: Session) -> bool:
        """Align orchestrator pause state with persisted remote control."""
        display_state = get_display_state(session, self.organization_id)
        remote = display_state.remote_control
        is_paused = remote is not None and remote.navigation_command == "pause"
        state = self._load_state()
        if state.get("isPaused") != is_paused:
            self._update_state({"isPaused": is_paused})
        if is_paused:
            self._scheduler.cancel_top()
        return is_paused

    def ensure_top_rotation(self, session: Session) -> None:
        """Re-arm top rotation and republish the current content window for joining kiosks."""
        self.sync_remote_control_pause(session)
        state = self._load_state()
        if state.get("isPaused"):
            return
        if state.get("contentMode", "loop") != "loop":
            return

        configuration = self._configuration(session)
        if configuration is None:
            return

        content_id = state.get("currentTopContentId")
        command_id = state.get("currentTopCommandId")
        if not content_id or not command_id:
            self._show_initial_content(session, configuration)
            return

        item = session.scalar(
            select(TopContentItem).where(
                TopContentItem.organization_id == self.organization_id,
                TopContentItem.id == content_id,
            )
        )
        if item is None:
            self.advance_top(session, reason="sync_missing_content")
            return

        playback_mode = "video" if item.content_type == "video" else "timer"
        payload = build_show_content_payload(
            item=item,
            configuration=configuration,
            command_id=str(command_id),
            reason="sync",
            playback_mode=playback_mode,
        )
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="show_content",
            payload=payload,
        )
        self._arm_top_timer(payload)

    def schedule_empty_queue_audit(self) -> None:
        with self._lock:
            if self._empty_queue_timer is not None:
                self._empty_queue_timer.cancel()
            timer = threading.Timer(EMPTY_QUEUE_DEBOUNCE_SECONDS, self._emit_empty_queue_audit)
            timer.daemon = True
            self._empty_queue_timer = timer
            timer.start()

    def shutdown(self) -> None:
        with self._lock:
            if self._empty_queue_timer is not None:
                self._empty_queue_timer.cancel()
                self._empty_queue_timer = None
        self._scheduler.cancel_all()

    def current_snapshot_extras(self) -> dict[str, Any]:
        state = self._load_state()
        return {
            "currentTopCommandId": state.get("currentTopCommandId"),
            "currentTopContentId": state.get("currentTopContentId"),
            "currentAdCommandId": state.get("currentAdCommandId"),
            "currentAdStartIndex": state.get("currentAdStartIndex"),
        }

    def _show_initial_content(self, session: Session, configuration: KioskDisplayConfiguration) -> None:
        queue = _regular_queue(eligible_top_content(session, self.organization_id))
        if not queue:
            self.schedule_empty_queue_audit()
            return
        first = sorted(queue, key=lambda item: item.display_order)[0]
        command_id = next_command_id(1)
        playback_mode = "video" if first.content_type == "video" else "timer"
        payload = build_show_content_payload(
            item=first,
            configuration=configuration,
            command_id=command_id,
            reason="bootstrap",
            playback_mode=playback_mode,
        )
        self._update_state(
            {
                "commandSequence": 1,
                "currentTopCommandId": command_id,
                "currentTopContentId": str(first.id),
                "regularCursorId": str(first.id),
            }
        )
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="show_content",
            payload=payload,
        )
        self._arm_top_timer(payload)

    def _show_initial_ads(self, session: Session, configuration: KioskDisplayConfiguration) -> None:
        state = self._load_state()
        if not state.get("adsVisible", True):
            return
        ads = eligible_ads(session, self.organization_id)
        if not ads:
            return
        command_id = next_command_id(2)
        payload = build_show_ads_payload(
            ads=ads,
            configuration=configuration,
            command_id=command_id,
            start_index=0,
            reason="bootstrap",
        )
        self._update_state(
            {
                "commandSequence": 2,
                "currentAdCommandId": command_id,
                "currentAdStartIndex": configuration.inline_ad_count or 1,
            }
        )
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="show_ads",
            payload=payload,
        )
        self._arm_ad_timer(configuration.default_ad_duration_seconds)

    def _emit_snapshot(self, session: Session, configuration: KioskDisplayConfiguration) -> None:
        from app.application.display_orchestrator.snapshot_builder import build_snapshot_payload

        snapshot = build_snapshot_payload(session, self.organization_id, orchestrator=self)
        get_display_sse_hub().publish(
            organization_id=self.organization_id,
            operator_session_id=self.operator_session_id,
            event_type="snapshot",
            payload=snapshot,
        )

    def _emit_empty_queue_audit(self) -> None:
        session = self._session_factory()
        try:
            state = self._load_state()
            configuration = self._configuration(session)
            DisplayEventRepository(session).record(
                create_display_event(
                    organization_id=self.organization_id,
                    event_type="orchestrator_empty_queue",
                    severity="warning",
                    message="Orchestrator found no eligible regular top content",
                    metadata={"contentMode": state.get("contentMode", "loop")},
                )
            )
            session.commit()
            content_id = state.get("currentTopContentId")
            if configuration is not None and content_id:
                item = next(
                    (row for row in eligible_top_content(session, self.organization_id) if str(row.id) == content_id),
                    None,
                )
                if item is not None:
                    command_sequence = int(state.get("commandSequence") or 0) + 1
                    command_id = next_command_id(command_sequence)
                    payload = build_show_content_payload(
                        item=item,
                        configuration=configuration,
                        command_id=command_id,
                        reason="empty_queue_fallback",
                        playback_mode="manual",
                    )
                    payload["playback"]["mode"] = "manual"
                    self._update_state(
                        {
                            "commandSequence": command_sequence,
                            "currentTopCommandId": command_id,
                        }
                    )
                    get_display_sse_hub().publish(
                        organization_id=self.organization_id,
                        operator_session_id=self.operator_session_id,
                        event_type="show_content",
                        payload=payload,
                    )
        finally:
            session.close()

    def _record_top_advanced(
        self,
        session: Session,
        *,
        command_id: str,
        reason: str,
        content_id: str,
    ) -> None:
        DisplayEventRepository(session).record(
            create_display_event(
                organization_id=self.organization_id,
                event_type="orchestrator_advanced",
                severity="info",
                message="Orchestrator advanced top content",
                metadata={"commandId": command_id, "reason": reason, "contentId": content_id},
            )
        )
        session.commit()

    def _arm_top_timer(self, payload: dict[str, Any]) -> None:
        if self._load_state().get("isPaused"):
            self._scheduler.cancel_top()
            return
        playback = payload.get("playback") or {}
        mode = playback.get("mode")
        if mode == "manual":
            self._scheduler.cancel_top()
            return
        duration = float(playback.get("durationSeconds") or 0)
        delay = float(playback.get("videoEndDelaySeconds") or 0)
        if mode == "video":
            duration += delay
        if duration <= 0:
            duration = 1.0
        self._scheduler.arm_top(duration)

    def _arm_ad_timer(self, duration_seconds: int | None) -> None:
        seconds = float(duration_seconds or 10)
        self._scheduler.arm_ad(seconds)

    def _on_availability_timer(self) -> None:
        session = self._session_factory()
        try:
            from app.application.display_orchestrator.rotation_logic import run_availability_tick

            run_availability_tick(self, session)
        finally:
            session.close()

    def _on_top_timer(self) -> None:
        session = self._session_factory()
        try:
            with self._lock:
                if self._load_state().get("isPaused"):
                    return
                advanced = self.advance_top(session, reason="timer")
                if not advanced and not self._load_state().get("isPaused"):
                    self.ensure_top_rotation(session)
        except Exception:
            logger.exception("Top rotation timer failed")
            try:
                with self._lock:
                    if not self._load_state().get("isPaused"):
                        self.ensure_top_rotation(session)
            except Exception:
                logger.exception("Top rotation recovery failed")
        finally:
            session.close()

    def _on_ad_timer(self) -> None:
        session = self._session_factory()
        try:
            self.advance_ad(session)
        except Exception:
            logger.exception("Ad rotation timer failed")
            state = self._load_state()
            if state.get("adsVisible", True):
                configuration = self._configuration(session)
                if configuration is not None:
                    self._arm_ad_timer(configuration.default_ad_duration_seconds)
        finally:
            session.close()

    def _configuration(self, session: Session) -> KioskDisplayConfiguration | None:
        return session.scalar(
            select(KioskDisplayConfiguration).where(
                KioskDisplayConfiguration.organization_id == self.organization_id
            )
        )

    def _load_state(self) -> dict[str, Any]:
        stored = redis_state.redis_get_json(
            redis_state.orchestrator_key(self.organization_id, self.operator_session_id)
        )
        if stored is None:
            stored = _default_state()
            redis_state.redis_set_json(
                redis_state.orchestrator_key(self.organization_id, self.operator_session_id),
                stored,
                ex=ORCHESTRATOR_TTL_SECONDS,
            )
        return stored

    def _update_state(self, patch: dict[str, Any]) -> None:
        state = self._load_state()
        state.update(patch)
        redis_state.redis_set_json(
            redis_state.orchestrator_key(self.organization_id, self.operator_session_id),
            state,
            ex=ORCHESTRATOR_TTL_SECONDS,
        )
