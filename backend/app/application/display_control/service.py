from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.availability import is_within_availability
from app.domain.display_events import create_display_event
from app.repositories.base import utc_now
from app.repositories.events import DisplayEventRepository
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.operator_session import OperatorSession


class DisplayControlService:
    def __init__(self, session: Session):
        self.session = session

    def latest_active_session(self, organization_id: str) -> OperatorSession | None:
        now = utc_now()
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
            selected_content_id=None,
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
        selected_content_id: str | None,
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
            selected_content_id=selected_content_id,
            ads_visible=ads_visible,
        )

    def update_state(
        self,
        organization_id: str,
        display_session_id: str,
        user_id: str,
        *,
        content_mode: str,
        selected_content_id: str | None,
        ads_visible: bool,
    ) -> DisplayControlState:
        state = self.ensure_default_state(organization_id, display_session_id, user_id)
        previous_ads_visible = state.ads_visible
        if content_mode not in {"loop", "iframe"}:
            raise ValueError("Remote control mode must be loop or iframe.")

        if content_mode == "iframe":
            if selected_content_id is None:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Iframe mode requires selected content.", "warning")
                raise ValueError("Iframe mode requires selected content.")
            try:
                self._eligible_iframe(organization_id, selected_content_id)
            except ValueError:
                self._record(organization_id, user_id, "remote_control_invalid_iframe", "Selected iframe is not available.", "warning")
                raise
            state.selected_content_id = selected_content_id
        else:
            state.selected_content_id = None

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

    def list_iframe_options(self, organization_id: str) -> list[TopContentItem]:
        now = utc_now()
        items = list(
            self.session.scalars(
                select(TopContentItem)
                .where(
                    TopContentItem.organization_id == organization_id,
                    TopContentItem.content_type == "embedded_web",
                    TopContentItem.is_active.is_(True),
                )
                .order_by(TopContentItem.display_order)
            )
        )
        return [item for item in items if self._is_iframe_eligible(item, now)]

    def selected_iframe(self, state: DisplayControlState) -> TopContentItem | None:
        if state.content_mode != "iframe" or state.selected_content_id is None:
            return None
        try:
            return self._eligible_iframe(state.organization_id, state.selected_content_id)
        except ValueError:
            return None

    def _eligible_iframe(self, organization_id: str, content_id: str) -> TopContentItem:
        item = self.session.scalar(
            select(TopContentItem).where(
                TopContentItem.organization_id == organization_id,
                TopContentItem.id == content_id,
            )
        )
        if item is None or not self._is_iframe_eligible(item, utc_now()):
            raise ValueError("Selected iframe is not available.")
        return item

    def _is_iframe_eligible(self, item: TopContentItem, now) -> bool:
        if item.content_type != "embedded_web" or not item.is_active:
            return False
        if not is_within_availability(now, item.available_from, item.available_until):
            return False
        if item.approved_domain_id is None:
            return False
        domain = self.session.scalar(
            select(ApprovedEmbeddedDomain).where(
                ApprovedEmbeddedDomain.organization_id == item.organization_id,
                ApprovedEmbeddedDomain.id == item.approved_domain_id,
                ApprovedEmbeddedDomain.is_active.is_(True),
            )
        )
        return domain is not None

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
