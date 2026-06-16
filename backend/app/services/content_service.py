from sqlalchemy.orm import Session

from app.api.schemas import ContentItemRequest
from app.domain.availability import validate_availability_window
from app.domain.display_events import create_display_event
from app.domain.embedded_domains import is_domain_approved
from app.repositories.content import ContentRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem


def _approved_domains(session: Session, organization_id: str) -> set[str]:
    return {
        domain.domain for domain in session.query(ApprovedEmbeddedDomain).filter(
            ApprovedEmbeddedDomain.organization_id == organization_id,
            ApprovedEmbeddedDomain.is_active.is_(True)
        )
    }


def validate_content(session: Session, organization_id: str, payload: ContentItemRequest) -> None:
    validate_availability_window(payload.available_from, payload.available_until)
    if payload.content_type not in {"photo", "video", "embedded_web"}:
        raise ValueError("Unsupported content type.")
    if payload.is_active and not payload.source_reference:
        raise ValueError("Active content requires a source reference.")
    if payload.content_type == "embedded_web" and not is_domain_approved(payload.source_reference, _approved_domains(session, organization_id)):
        raise ValueError("Embedded content domain is not approved.")


class ContentService:
    def __init__(self, session: Session):
        self.session = session
        self.repository = ContentRepository(session)

    def list(self, organization_id: str) -> list[TopContentItem]:
        return self.repository.list(organization_id)

    def create(self, organization_id: str, user_id: str, payload: ContentItemRequest) -> TopContentItem:
        validate_content(self.session, organization_id, payload)
        item = TopContentItem(
            organization_id=organization_id,
            title=payload.title,
            content_type=payload.content_type,
            source_reference=payload.source_reference,
            approved_domain_id=str(payload.approved_domain_id) if payload.approved_domain_id else None,
            is_active=payload.is_active,
            display_order=payload.display_order,
            duration_seconds=payload.duration_seconds,
            available_from=payload.available_from,
            available_until=payload.available_until,
            created_by_user_id=user_id,
            updated_by_user_id=user_id
        )
        self.repository.add(item)
        self._record_change(organization_id, user_id, "content_changed", "Content created")
        self.session.commit()
        return item

    def update(self, organization_id: str, user_id: str, content_id: str, payload: ContentItemRequest) -> TopContentItem:
        item = self.repository.get(organization_id, content_id)
        if item is None:
            raise LookupError("Content item not found.")
        validate_content(self.session, organization_id, payload)
        item.title = payload.title
        item.content_type = payload.content_type
        item.source_reference = payload.source_reference
        item.approved_domain_id = str(payload.approved_domain_id) if payload.approved_domain_id else None
        item.is_active = payload.is_active
        item.display_order = payload.display_order
        item.duration_seconds = payload.duration_seconds
        item.available_from = payload.available_from
        item.available_until = payload.available_until
        item.updated_by_user_id = user_id
        self._record_change(organization_id, user_id, "content_changed", "Content updated", item.id)
        self.session.commit()
        return item

    def delete(self, organization_id: str, user_id: str, content_id: str) -> None:
        item = self.repository.get(organization_id, content_id)
        if item is None:
            raise LookupError("Content item not found.")
        self.repository.delete(item)
        self._record_change(organization_id, user_id, "content_changed", "Content removed", content_id)
        self.session.commit()

    def _record_change(self, organization_id: str, user_id: str, event_type: str, message: str, entity_id: str | None = None) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type=event_type,
                severity="info",
                message=message,
                entity_type="top_content",
                entity_id=entity_id,
                created_by_user_id=user_id
            )
        )
