from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.schemas import IframeRequest
from app.domain.display_events import create_display_event
from app.repositories.events import DisplayEventRepository
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.iframe import Iframe


class IframeService:
    def __init__(self, session: Session):
        self.session = session

    def list(self, organization_id: str) -> list[Iframe]:
        return list(
            self.session.scalars(
                select(Iframe)
                .where(Iframe.organization_id == organization_id)
                .order_by(Iframe.created_at.asc())
            )
        )

    def get(self, organization_id: str, iframe_id: str) -> Iframe:
        iframe = self.session.scalar(
            select(Iframe).where(Iframe.organization_id == organization_id, Iframe.id == iframe_id)
        )
        if iframe is None:
            raise LookupError("Iframe not found.")
        return iframe

    def create(self, organization_id: str, request: IframeRequest, current_user: str) -> Iframe:
        url = self._clean_url(request.url)
        self._ensure_unique(organization_id, url)
        iframe = Iframe(
            organization_id=organization_id,
            url=url,
            created_by_user_id=current_user,
            updated_by_user_id=current_user,
        )
        self.session.add(iframe)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("An iframe with this URL already exists.") from exc
        return iframe

    def update(self, organization_id: str, iframe_id: str, request: IframeRequest, current_user: str) -> Iframe:
        iframe = self.get(organization_id, iframe_id)
        url = self._clean_url(request.url)
        self._ensure_unique(organization_id, url, exclude_id=iframe_id)
        iframe.url = url
        iframe.updated_by_user_id = current_user
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("An iframe with this URL already exists.") from exc
        return iframe

    def delete(self, organization_id: str, iframe_id: str, current_user: str) -> None:
        iframe = self.get(organization_id, iframe_id)
        states = list(
            self.session.scalars(
                select(DisplayControlState).where(
                    DisplayControlState.organization_id == organization_id,
                    DisplayControlState.selected_iframe_id == iframe_id,
                )
            )
        )
        for state in states:
            state.content_mode = "loop"
            state.selected_iframe_id = None
            state.updated_by_user_id = current_user
            DisplayEventRepository(self.session).record(
                create_display_event(
                    organization_id=organization_id,
                    event_type="remote_control_iframe_deleted",
                    severity="info",
                    message="Selected iframe was deleted; display returned to rotation.",
                    entity_type="iframe",
                    entity_id=iframe_id,
                    metadata={
                        "iframeId": iframe_id,
                        "displaySessionId": state.display_session_id,
                        "userId": current_user,
                    },
                    created_by_user_id=current_user,
                )
            )
        self.session.delete(iframe)
        self.session.commit()

    def _clean_url(self, url: str) -> str:
        clean = (url or "").strip()
        parsed = urlparse(clean)
        if not clean or parsed.scheme not in {"http", "https"} or not parsed.netloc or any(ch.isspace() for ch in clean):
            raise ValueError("URL is not a valid http(s) URL.")
        if len(clean) > 1024:
            raise ValueError("URL is too long.")
        return clean

    def _ensure_unique(self, organization_id: str, url: str, exclude_id: str | None = None) -> None:
        query = select(Iframe).where(Iframe.organization_id == organization_id, Iframe.url == url)
        if exclude_id is not None:
            query = query.where(Iframe.id != exclude_id)
        if self.session.scalar(query) is not None:
            raise ValueError("An iframe with this URL already exists.")
