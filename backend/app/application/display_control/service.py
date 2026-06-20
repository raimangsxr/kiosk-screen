from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import uuid4

from app.domain.display_events import create_display_event
from app.repositories.base import utc_now
from app.repositories.events import DisplayEventRepository
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe
from app.repositories.models.operator_session import OperatorSession


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
        return self.ensure_default_state(organization_id, display_session.id, display_session.user_id)

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
            ads_visible=True,
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
    ) -> DisplayControlState:
        state = self.ensure_default_state(organization_id, display_session_id, user_id)
        previous_ads_visible = state.ads_visible
        if content_mode not in {"loop", "iframe"}:
            raise ValueError("Remote control mode must be loop or iframe.")

        if content_mode == "iframe":
            if selected_iframe_id is None:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Iframe mode requires selected content.", "warning")
                raise ValueError("Iframe mode requires selected content.")
            if self._iframe(organization_id, selected_iframe_id) is None:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Selected iframe is not available.", "warning")
                raise ValueError("Selected iframe is not available.")
            state.selected_iframe_id = selected_iframe_id
        else:
            state.selected_iframe_id = None

        state.content_mode = content_mode
        state.ads_visible = ads_visible
        state.updated_by_user_id = user_id
        if previous_ads_visible != ads_visible:
            self._record(
                organization_id,
                user_id,
                "remote_control_ads_visibility_changed",
                "Remote control ads visibility changed",
                metadata={"adsVisible": ads_visible},
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

    def issue_navigation_command(
        self,
        organization_id: str,
        user_id: str,
        *,
        command: str,
    ) -> DisplayControlState:
        if command not in {"next", "previous"}:
            raise ValueError("Navigation command must be next or previous.")
        state = self.get_state_for_active_session(organization_id)
        if state.content_mode != "loop":
            raise ValueError("Navigation commands require rotation mode.")

        state.navigation_command = command
        state.navigation_command_id = str(uuid4())
        state.updated_by_user_id = user_id
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

    def _iframe(self, organization_id: str, iframe_id: str) -> Iframe | None:
        return self.session.scalar(
            select(Iframe).where(Iframe.organization_id == organization_id, Iframe.id == iframe_id)
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
