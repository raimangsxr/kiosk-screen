from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.api.schemas import ContentItemRequest
from app.config import get_settings
from app.domain.availability import validate_availability_window
from app.domain.display_events import create_display_event
from app.domain.media import UnsupportedExtensionError, detect_media_type_from_extension, validate_rotation_animation
from app.repositories.content import ContentRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.content import TopContentItem
from app.services.api_key_service import ApiKeyService
from app.services.display_order import assign_ordered_display_orders, next_display_order
from app.services.media_storage_service import MediaStorageService


def _validate_fixed_recurring_exclusivity(is_fixed: bool | None, recurring_every_x_iterations: int | None) -> None:
    """FR-016: a Content cannot be both fixed and recurring."""
    if is_fixed and recurring_every_x_iterations is not None:
        raise ValueError("Un Content no puede ser fijo y recurrente a la vez.")
    if recurring_every_x_iterations is not None and recurring_every_x_iterations < 1:
        raise ValueError("La cadencia debe ser un entero >= 1.")


def validate_content(session: Session, organization_id: str, payload: ContentItemRequest) -> None:
    validate_availability_window(payload.available_from, payload.available_until)
    validate_rotation_animation(payload.rotation_animation)
    if payload.content_type is not None and payload.content_type not in {"photo", "video"}:
        raise ValueError("invalid_content_type")
    if payload.is_active and not payload.source_reference:
        raise ValueError("Active content requires a source reference.")
    _validate_fixed_recurring_exclusivity(payload.is_fixed, payload.recurring_every_x_iterations)


def validate_uploaded_content(payload: ContentItemRequest) -> None:
    validate_availability_window(payload.available_from, payload.available_until)
    validate_rotation_animation(payload.rotation_animation)
    if payload.content_type is not None and payload.content_type not in {"photo", "video"}:
        raise ValueError("invalid_content_type")
    _validate_fixed_recurring_exclusivity(payload.is_fixed, payload.recurring_every_x_iterations)


class ContentService:
    def __init__(self, session: Session):
        self.session = session
        self.repository = ContentRepository(session)
        self.settings = get_settings()

    def list_items(self, organization_id: str) -> list[TopContentItem]:
        return self.repository.list(organization_id)

    def create(self, organization_id: str, user_id: str, payload: ContentItemRequest) -> TopContentItem:
        validate_content(self.session, organization_id, payload)
        display_order = (
            payload.display_order
            if payload.display_order is not None
            else next_display_order(self.session, TopContentItem, organization_id, "content")
        )
        item = TopContentItem(
            organization_id=organization_id,
            title=payload.title,
            content_type=payload.content_type,
            source_reference=payload.source_reference,
            approved_domain_id=None,
            is_active=payload.is_active,
            display_order=display_order,
            duration_seconds=payload.duration_seconds,
            rotation_animation=payload.rotation_animation,
            animation_duration_milliseconds=payload.animation_duration_milliseconds,
            available_from=payload.available_from,
            available_until=payload.available_until,
            is_fixed=bool(payload.is_fixed),
            recurring_every_x_iterations=payload.recurring_every_x_iterations,
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
        item.approved_domain_id = None
        item.is_active = payload.is_active
        item.display_order = payload.display_order
        item.duration_seconds = payload.duration_seconds
        item.rotation_animation = payload.rotation_animation
        item.animation_duration_milliseconds = payload.animation_duration_milliseconds
        item.available_from = payload.available_from
        item.available_until = payload.available_until
        item.is_fixed = bool(payload.is_fixed)
        item.recurring_every_x_iterations = payload.recurring_every_x_iterations
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
        validate_uploaded_content(payload)
        # FR-025 / FR-027 / FR-028: autodetect content_type from the filename extension
        # when the explicit field is missing or contradicts the extension. The extension
        # wins (TD-003).
        detected = detect_media_type_from_extension(getattr(upload, "filename", None))
        requested = payload.content_type
        if requested is None or (requested != detected):
            if requested is not None and requested != detected:
                # Audit override (TD-003).
                DisplayEventRepository(self.session).record(
                    create_display_event(
                        organization_id=organization_id,
                        event_type="content_type_autodetected",
                        severity="info",
                        message=(
                            f"Content type autodetected from extension for {upload.filename}"
                        ),
                        entity_type="top_content",
                        entity_id=None,
                        created_by_user_id=user_id,
                        metadata={
                            "filename": upload.filename,
                            "extension": (upload.filename or "").rsplit(".", 1)[-1].lower()
                            if upload.filename and "." in upload.filename
                            else "",
                            "detectedContentType": detected,
                            "requestedContentType": requested,
                            "source": "admin",
                        },
                    )
                )
            content_type_value = detected
        else:
            content_type_value = requested
        media_type = "image" if content_type_value == "photo" else "video"
        media = MediaStorageService(self.session).save_upload(organization_id, user_id, upload, media_type)
        try:
            display_order = (
                payload.display_order
                if payload.display_order is not None
                else next_display_order(self.session, TopContentItem, organization_id, "content")
            )
            item = TopContentItem(
                organization_id=organization_id,
                title=payload.title,
                content_type=content_type_value,
                source_reference=media.public_reference,
                media_file_id=media.id,
                approved_domain_id=None,
                is_active=payload.is_active,
                display_order=display_order,
                duration_seconds=payload.duration_seconds,
                rotation_animation=payload.rotation_animation,
                animation_duration_milliseconds=payload.animation_duration_milliseconds,
                available_from=payload.available_from,
                available_until=payload.available_until,
                is_fixed=bool(payload.is_fixed),
                recurring_every_x_iterations=payload.recurring_every_x_iterations,
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
        # FR-026 / TD-004: detect by extension, not by MIME header. The MIME header
        # may lie; the extension is more reliable for automation use cases. The
        # public API never accepts is_fixed / recurring_every_x_iterations; those
        # values, if present on the request payload, are silently ignored and
        # always persisted as False / None (TD-004).
        try:
            content_kind = detect_media_type_from_extension(getattr(upload, "filename", None))
        except UnsupportedExtensionError as exc:
            # Map to the typed error; the unsupported_extension message is logged
            # via the standard media_uploaded audit path inside save_upload.
            raise UnsupportedMediaTypeError() from exc
        media_type = "image" if content_kind == "photo" else "video"

        # Acquire the per-organization advisory lock for the duration of the transaction.
        # Released automatically on commit or rollback.
        # The lock is Postgres-only; on SQLite (used by integration tests) we skip
        # it — the surrounding transaction still serializes the write at the
        # connection level for the test, and the in-memory SQLite engine never
        # actually serves concurrent writers in the test harness.
        bind = self.session.get_bind()
        if bind is not None and bind.dialect.name == "postgresql":
            self.session.execute(
                select(func.pg_advisory_xact_lock(func.hashtext(f"content_append:{organization_id}")))
            )

        # Save the file (may raise on size / type validation); the lock is held
        # for the duration but the file is small relative to the lock window.
        # Translate MediaStorageService's ValueError into the typed errors so the
        # public endpoint returns 413/415 instead of 500.
        from app.shared.errors.application_errors import MediaTooLargeError, UnsupportedMediaTypeError

        try:
            media = MediaStorageService(self.session).save_upload(
                organization_id, None, upload, media_type
            )
        except ValueError as exc:
            message = str(exc).lower()
            # Match the media-domain validator's error messages by their stable
            # fragments (these strings are produced by app.domain.media.validate_media_upload).
            if "mb" in message or "too large" in message or "exceeds" in message:
                raise MediaTooLargeError(self.settings.image_upload_max_bytes if media_type == "image" else self.settings.video_upload_max_bytes) from exc
            if "unsupported" in message:
                raise UnsupportedMediaTypeError() from exc
            raise

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
                # FR-014 / FR-016 / TD-004: public API never sets these flags.
                is_fixed=False,
                recurring_every_x_iterations=None,
                created_by_user_id=None,
                updated_by_user_id=None,
            )
            self.repository.add(item)
            self.session.flush()

            # Audit event (FR-014) — the API key id is recorded, not a user id.
            # The item's id is populated by SQLAlchemy on flush, so we can
            # reference it as entity_id.
            self._record_change(
                organization_id,
                None,
                "content_changed",
                f"Content added via public API: {title}",
                item.id,
                metadata={"source": "public_api", "api_key_id": api_key_id},
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

    def reorder(self, organization_id: str, user_id: str, ordered_ids: list[str]) -> None:
        from app.shared.errors.application_errors import ReorderIdsMismatchError

        existing_ids = {
            item.id for item in self.repository.list(organization_id)
        }
        if set(ordered_ids) != existing_ids:
            raise ReorderIdsMismatchError()
        updated = assign_ordered_display_orders(
            self.session, TopContentItem, organization_id, "content", ordered_ids
        )
        if updated != len(ordered_ids):
            raise ReorderIdsMismatchError()
        self._record_change(
            organization_id, user_id, "content_changed", "Content reordered",
            metadata={"count": updated}
        )
        self.session.commit()

    def _record_change(
        self,
        organization_id: str,
        user_id: str,
        event_type: str,
        message: str,
        entity_id: str | None = None,
        metadata: dict[str, object] | None = None,
    ) -> None:
        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type=event_type,
                severity="info",
                message=message,
                entity_type="top_content",
                entity_id=entity_id,
                created_by_user_id=user_id,
                metadata=metadata,
            )
        )
