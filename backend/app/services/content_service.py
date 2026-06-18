from sqlalchemy import func, select
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
from app.services.api_key_service import ApiKeyService
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

    def append_via_public_api(
        self,
        organization_id: str,
        api_key_id: str,
        upload: UploadFile,
        title: str,
    ) -> TopContentItem:
        """Append a new top-content item from a public-API upload.

        Serializes per-organization appends via a Postgres transactional advisory lock
        (FR-013) so concurrent uploads produce contiguous ``displayOrder`` values
        with no gaps, duplicates, or races.

        - Computes ``display_order = max(existing) + 1`` inside the locked transaction.
        - Records a ``content_changed`` ``DisplayEvent`` with ``source=public_api`` (FR-014).
        - Updates the API key's ``last_used_at`` only after the row commits successfully (FR-015).
        """
        from app.shared.errors.application_errors import (
            EmptyFileError,
            MissingFileError,
            MissingTitleError,
            TitleTooLongError,
            UnsupportedMediaTypeError,
        )

        # File presence and title are validated by the route; this is defensive.
        if upload is None:
            raise MissingFileError()
        if not title or not title.strip():
            raise MissingTitleError()
        if len(title) > 255:
            raise TitleTooLongError(255)

        content_type = (upload.content_type or "").lower()
        if content_type.startswith("image/"):
            media_type = "image"
            content_kind = "photo"
        elif content_type.startswith("video/"):
            media_type = "video"
            content_kind = "video"
        else:
            raise UnsupportedMediaTypeError()

        # Acquire the per-organization advisory lock for the duration of the transaction.
        # Released automatically on commit or rollback.
        self.session.execute(
            select(func.pg_advisory_xact_lock(func.hashtext(f"content_append:{organization_id}")))
        )

        # Save the file (may raise on size / type validation); the lock is held
        # for the duration but the file is small relative to the lock window.
        media = MediaStorageService(self.session).save_upload(
            organization_id, None, upload, media_type
        )

        try:
            current_max = self.session.scalar(
                select(func.max(TopContentItem.display_order)).where(
                    TopContentItem.organization_id == organization_id
                )
            )
            next_order = (current_max or 0) + 1

            item = TopContentItem(
                organization_id=organization_id,
                title=title.strip(),
                content_type=content_kind,
                source_reference=media.public_reference,
                media_file_id=media.id,
                approved_domain_id=None,
                is_active=True,
                display_order=next_order,
                created_by_user_id=None,
                updated_by_user_id=None,
            )
            self.repository.add(item)

            # Audit event (FR-014) — the API key id is recorded, not a user id.
            self._record_change(
                organization_id,
                None,
                "content_changed",
                f"Content added via public API: {title}",
                item.id,
            )

            self.session.commit()
        except Exception:
            self.session.rollback()
            try:
                MediaStorageService(self.session).delete_file(media)
            except Exception:
                pass
            raise

        # After the row is committed, mark the API key as recently used (FR-015).
        # This is intentionally OUTSIDE the locked transaction so the timestamp
        # update does not serialize behind other uploads.
        from app.repositories.api_keys import ApiKeyRepository

        try:
            ApiKeyService(ApiKeyRepository(self.session)).mark_used_by_id(api_key_id)
        except Exception:
            # Audit/last-used is best-effort; the upload itself has already succeeded.
            pass

        return item

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
