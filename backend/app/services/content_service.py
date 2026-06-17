from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.api.schemas import ContentItemRequest
from app.domain.availability import validate_availability_window
from app.domain.display_events import create_display_event
from app.domain.embedded_domains import is_domain_approved
from app.domain.media import validate_rotation_animation
from app.repositories.content import ContentRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem
from app.services.media_storage_service import MediaStorageService


def _approved_domains(session: Session, organization_id: str) -> set[str]:
    return {
        domain.domain for domain in session.query(ApprovedEmbeddedDomain).filter(
            ApprovedEmbeddedDomain.organization_id == organization_id,
            ApprovedEmbeddedDomain.is_active.is_(True)
        )
    }


def validate_content(session: Session, organization_id: str, payload: ContentItemRequest) -> None:
    validate_availability_window(payload.available_from, payload.available_until)
    validate_rotation_animation(payload.rotation_animation)
    if payload.content_type not in {"photo", "video", "embedded_web"}:
        raise ValueError("Unsupported content type.")
    if payload.is_active and not payload.source_reference:
        raise ValueError("Active content requires a source reference.")
    if payload.content_type == "embedded_web" and not is_domain_approved(payload.source_reference, _approved_domains(session, organization_id)):
        raise ValueError("Embedded content domain is not approved.")


def validate_uploaded_content(payload: ContentItemRequest) -> None:
    validate_availability_window(payload.available_from, payload.available_until)
    validate_rotation_animation(payload.rotation_animation)
    if payload.content_type not in {"photo", "video"}:
        raise ValueError("Uploaded main content must be an image or video.")


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
            rotation_animation=payload.rotation_animation,
            animation_duration_milliseconds=payload.animation_duration_milliseconds,
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
        item.rotation_animation = payload.rotation_animation
        item.animation_duration_milliseconds = payload.animation_duration_milliseconds
        item.available_from = payload.available_from
        item.available_until = payload.available_until
        item.updated_by_user_id = user_id
        self._record_change(organization_id, user_id, "content_changed", "Content updated", item.id)
        self.session.commit()
        return item

    def create_uploaded(
        self,
        organization_id: str,
        user_id: str,
        upload: UploadFile,
        payload: ContentItemRequest
    ) -> TopContentItem:
        if payload.content_type not in {"photo", "video"}:
            raise ValueError("Uploaded main content must be an image or video.")
        validate_uploaded_content(payload)
        media_type = "image" if payload.content_type == "photo" else "video"
        media = MediaStorageService(self.session).save_upload(organization_id, user_id, upload, media_type)
        try:
            item = TopContentItem(
                organization_id=organization_id,
                title=payload.title,
                content_type=payload.content_type,
                source_reference=media.public_reference,
                media_file_id=media.id,
                approved_domain_id=None,
                is_active=payload.is_active,
                display_order=payload.display_order,
                duration_seconds=payload.duration_seconds,
                rotation_animation=payload.rotation_animation,
                animation_duration_milliseconds=payload.animation_duration_milliseconds,
                available_from=payload.available_from,
                available_until=payload.available_until,
                created_by_user_id=user_id,
                updated_by_user_id=user_id
            )
            self.repository.add(item)
            self._record_change(organization_id, user_id, "media_uploaded", "Main content media uploaded", item.id)
            self.session.commit()
            return item
        except Exception:
            self.session.rollback()
            MediaStorageService(self.session).delete_file(media)
            raise

    def delete(self, organization_id: str, user_id: str, content_id: str) -> None:
        item = self.repository.get(organization_id, content_id)
        if item is None:
            raise LookupError("Content item not found.")
        media_id = item.media_file_id
        self.repository.delete(item)
        self._record_change(organization_id, user_id, "content_changed", "Content removed", content_id)
        self.session.flush()
        if media_id:
            MediaStorageService(self.session).delete_if_unreferenced(media_id, organization_id)
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
