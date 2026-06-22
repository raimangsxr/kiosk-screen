from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import uuid4

from app.domain.display_events import create_display_event
from app.repositories.base import utc_now
from app.repositories.events import DisplayEventRepository
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe
from app.repositories.models.operator_session import OperatorSession


ALLOWED_CONTENT_MODES = {"loop", "iframe", "fixed"}
ALLOWED_NAVIGATION_COMMANDS = {"next", "previous", "pause", "resume"}


class DisplayControlService:
    def __init__(self, session: Session):
        self.session = session

    def latest_active_session(self, organization_id: str) -> OperatorSession | None:
        now = utc_now()
        bind = self.session.get_bind()
        if bind is not None and bind.dialect.name == "sqlite":
            now = now.replace(tzinfo=None)
        return self.session.scalar(
            select(OperatorSession)
            .where(
                OperatorSession.organization_id == organization_id,
                OperatorSession.ended_at.is_(None),
                OperatorSession.valid_until >= now,
            )
            .order_by(OperatorSession.created_at.desc())
        )

    def get_state_for_active_session(self, organization_id: str) -> DisplayControlState:
        display_session = self.latest_active_session(organization_id)
        if display_session is None:
            raise LookupError("No active display session.")
        state = self.ensure_default_state(organization_id, display_session.id, display_session.user_id)
        # FR-024: if the fixed target was deleted or unmarked, fall back to loop.
        self._auto_fallback_fixed(state, organization_id)
        return state

    def ensure_default_state(
        self,
        organization_id: str,
        display_session_id: str,
        user_id: str | None = None,
    ) -> DisplayControlState:
        state = self.session.scalar(
            select(DisplayControlState).where(
                DisplayControlState.organization_id == organization_id,
                DisplayControlState.display_session_id == display_session_id,
            )
        )
        if state is not None:
            return state

        state = DisplayControlState(
            organization_id=organization_id,
            display_session_id=display_session_id,
            content_mode="loop",
            selected_iframe_id=None,
            selected_fixed_content_id=None,
            ads_visible=True,
            fullscreen_requested=False,
            updated_by_user_id=user_id,
        )
        self.session.add(state)
        self.session.flush()
        return state

    def update_active_state(
        self,
        organization_id: str,
        user_id: str,
        *,
        content_mode: str,
        selected_iframe_id: str | None,
        ads_visible: bool,
        fullscreen_requested: bool = False,
        selected_fixed_content_id: str | None = None,
    ) -> DisplayControlState:
        display_session = self.latest_active_session(organization_id)
        if display_session is None:
            raise LookupError("No active display session.")
        return self.update_state(
            organization_id,
            display_session.id,
            user_id,
            content_mode=content_mode,
            selected_iframe_id=selected_iframe_id,
            ads_visible=ads_visible,
            fullscreen_requested=fullscreen_requested,
            selected_fixed_content_id=selected_fixed_content_id,
        )

    def update_state(
        self,
        organization_id: str,
        display_session_id: str,
        user_id: str,
        *,
        content_mode: str,
        selected_iframe_id: str | None,
        ads_visible: bool,
        fullscreen_requested: bool = False,
        selected_fixed_content_id: str | None = None,
    ) -> DisplayControlState:
        state = self.ensure_default_state(organization_id, display_session_id, user_id)
        previous_ads_visible = state.ads_visible
        previous_fullscreen_requested = state.fullscreen_requested
        previous_content_mode = state.content_mode
        previous_selected_fixed_content_id = state.selected_fixed_content_id

        if content_mode not in ALLOWED_CONTENT_MODES:
            raise ValueError("Remote control mode must be loop, iframe, or fixed.")

        if content_mode == "iframe":
            if selected_iframe_id is None:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Iframe mode requires selected content.", "warning")
                raise ValueError("Iframe mode requires selected content.")
            if self._iframe(organization_id, selected_iframe_id) is None:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Selected iframe is not available.", "warning")
                raise ValueError("Selected iframe is not available.")
            state.selected_iframe_id = selected_iframe_id
            state.selected_fixed_content_id = None
        elif content_mode == "fixed":
            if selected_fixed_content_id is None:
                raise ValueError("Fixed mode requires a selected content id.")
            target = self._fixed_content(organization_id, selected_fixed_content_id)
            if target is None:
                raise LookupError("Selected fixed content not found.")
            if not target.is_fixed:
                raise ValueError("El Content seleccionado no está marcado como fijo.")
            state.selected_fixed_content_id = selected_fixed_content_id
            state.selected_iframe_id = None
        else:  # loop
            state.selected_iframe_id = None
            state.selected_fixed_content_id = None

        # Reject ambiguous state (a non-fixed-mode carrying a fixed target).
        if content_mode != "fixed" and selected_fixed_content_id is not None:
            raise ValueError("selectedFixedContentId solo es válido en modo 'fixed'.")

        state.content_mode = content_mode
        state.ads_visible = ads_visible
        state.fullscreen_requested = fullscreen_requested
        state.updated_by_user_id = user_id

        if previous_ads_visible != ads_visible:
            self._record(
                organization_id,
                user_id,
                "remote_control_ads_visibility_changed",
                "Remote control ads visibility changed",
                metadata={"adsVisible": ads_visible},
            )
        if previous_fullscreen_requested != fullscreen_requested:
            self._record(
                organization_id,
                user_id,
                "remote_control_fullscreen_changed",
                "Remote control fullscreen request changed",
                metadata={"fullscreenRequested": fullscreen_requested},
            )

        # FR-019 / FR-020 / FR-021 / FR-024: emit display_control_fixed_changed when
        # entering/changing fixed mode. The auto-fallback path also emits this event
        # via _auto_fallback_fixed (called on read).
        fixed_changed = (
            previous_content_mode == "fixed"
            or content_mode == "fixed"
            or previous_selected_fixed_content_id != state.selected_fixed_content_id
        )
        if fixed_changed:
            self._record(
                organization_id,
                user_id,
                "display_control_fixed_changed",
                "Fixed content changed",
                metadata={
                    "previousContentMode": previous_content_mode,
                    "newContentMode": content_mode,
                    "previousSelectedFixedContentId": previous_selected_fixed_content_id,
                    "newSelectedFixedContentId": state.selected_fixed_content_id,
                },
            )

        self._record(organization_id, user_id, "remote_control_changed", "Remote control state changed")
        self.session.commit()
        return state

    def list_iframe_options(self, organization_id: str) -> list[Iframe]:
        return list(
            self.session.scalars(
                select(Iframe).where(Iframe.organization_id == organization_id).order_by(Iframe.created_at.asc())
            )
        )

    def list_fixed_eligible_contents(self, organization_id: str) -> list[TopContentItem]:
        """FR-019 / FR-022: contents marked as fixed, sorted by displayOrder."""
        return list(
            self.session.scalars(
                select(TopContentItem)
                .where(
                    TopContentItem.organization_id == organization_id,
                    TopContentItem.is_fixed.is_(True),
                )
                .order_by(TopContentItem.display_order.asc())
            )
        )

    def issue_navigation_command(
        self,
        organization_id: str,
        user_id: str,
        *,
        command: str,
    ) -> DisplayControlState:
        # FR-010 / FR-012: pause and resume are accepted alongside next/previous.
        if command not in ALLOWED_NAVIGATION_COMMANDS:
            raise ValueError("Navigation command must be next, previous, pause, or resume.")
        state = self.get_state_for_active_session(organization_id)
        if state.content_mode != "loop":
            if command in {"pause", "resume"}:
                raise ValueError("Pause/Resume solo es válido en modo rotación.")
            raise ValueError("Navigation commands require rotation mode.")

        state.navigation_command = command
        state.navigation_command_id = str(uuid4())
        state.updated_by_user_id = user_id
        if command in {"pause", "resume"}:
            self._record(
                organization_id,
                user_id,
                f"display_control_{command}d",
                f"Remote control rotation {command}",
                metadata={"contentMode": state.content_mode},
            )
        else:
            self._record(
                organization_id,
                user_id,
                "remote_control_navigation_changed",
                "Remote control navigation command changed",
                metadata={"command": command, "commandId": state.navigation_command_id},
            )
        self.session.commit()
        return state

    def selected_iframe(self, state: DisplayControlState) -> Iframe | None:
        if state.content_mode != "iframe" or state.selected_iframe_id is None:
            return None
        return self._iframe(state.organization_id, state.selected_iframe_id)

    def selected_fixed_content(self, state: DisplayControlState) -> TopContentItem | None:
        if state.content_mode != "fixed" or state.selected_fixed_content_id is None:
            return None
        return self._fixed_content(state.organization_id, state.selected_fixed_content_id)

    def record_rotation_event(
        self,
        organization_id: str,
        event_type: str,
        payload: dict[str, object],
        user_id: str | None = None,
    ) -> None:
        """FR-017 / contracts/audit-display-control.md §6: kiosk-initiated events."""
        if event_type != "content_rotation_empty":
            raise ValueError("Unsupported kiosk rotation event type.")
        self._record(
            organization_id,
            user_id,
            event_type,
            "Kiosk reported empty content rotation",
            metadata=payload,
            severity="warning",
        )
        self.session.commit()

    def _auto_fallback_fixed(self, state: DisplayControlState, organization_id: str) -> None:
        """FR-024: if the selected fixed target was deleted or unmarked,
        fall back to ``loop`` automatically and emit the audit event."""
        if state.content_mode != "fixed" or state.selected_fixed_content_id is None:
            return
        target = self._fixed_content(organization_id, state.selected_fixed_content_id)
        if target is not None and target.is_fixed:
            return
        previous_mode = state.content_mode
        previous_target = state.selected_fixed_content_id
        state.content_mode = "loop"
        state.selected_fixed_content_id = None
        state.selected_iframe_id = None
        self._record(
            organization_id,
            None,
            "display_control_fixed_changed",
            "Fixed content auto-fallback to loop",
            metadata={
                "previousContentMode": previous_mode,
                "newContentMode": "loop",
                "previousSelectedFixedContentId": previous_target,
                "newSelectedFixedContentId": None,
            },
            severity="warning",
        )
        self.session.commit()

    def _iframe(self, organization_id: str, iframe_id: str) -> Iframe | None:
        return self.session.scalar(
            select(Iframe).where(Iframe.organization_id == organization_id, Iframe.id == iframe_id)
        )

    def _fixed_content(self, organization_id: str, content_id: str) -> TopContentItem | None:
        return self.session.scalar(
            select(TopContentItem).where(
                TopContentItem.organization_id == organization_id,
                TopContentItem.id == content_id,
            )
        )

    def _record(
        self,
        organization_id: str,
        user_id: str | None,
        event_type: str,
        message: str,
        severity: str = "info",
        metadata: dict[str, object] | None = None,
    ) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type=event_type,
                severity=severity,
                message=message,
                metadata=metadata,
                created_by_user_id=user_id,
            )
        )
