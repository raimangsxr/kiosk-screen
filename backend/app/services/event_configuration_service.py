import json
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.api.schemas import BrandingLayout
from app.config import get_settings
from app.domain.display_events import create_display_event
from app.domain.media import validate_logo_upload
from app.repositories.configuration import ConfigurationRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.media import MediaRepository
from app.repositories.models.event_configuration import EventConfiguration
from app.services.media_storage_service import MediaStorageService


MAX_TEXT_LENGTH = 255
MAX_EVENT_DURATION_MINUTES = 1440


class EventConfigurationService:
    def __init__(self, session: Session):
        self.session = session
        self.repository = ConfigurationRepository(session)
        self.media_storage = MediaStorageService(session)
        self.media_repository = MediaRepository(session)

    def get_or_create(self, organization_id: str) -> EventConfiguration:
        row = self.repository.get_or_create_event_for_organization(organization_id)
        self.session.commit()
        return row

    def update(
        self,
        organization_id: str,
        user_id: str,
        payload: dict[str, Any],
        file: UploadFile | None = None,
        remove_logo: bool = False,
    ) -> EventConfiguration:
        if file is not None and remove_logo:
            raise ValueError("Contradictory fields: 'file' and 'removeLogo' must not both be set.")

        row = self.repository.get_or_create_event_for_organization(organization_id)
        event_name = self._clean_text(payload.get("eventName", payload.get("event_name", row.event_name)), "eventName")
        organizer_name = self._clean_text(
            payload.get("organizerName", payload.get("organizer_name", row.organizer_name)),
            "organizerName",
        )
        event_duration_minutes = self._clean_duration(
            payload.get(
                "eventDurationMinutes",
                payload.get("event_duration_minutes", row.event_duration_minutes),
            )
        )
        logo_layout = self._clean_layout(payload.get("logoLayout"), "logoLayout")
        event_name_layout = self._clean_layout(payload.get("eventNameLayout"), "eventNameLayout")

        previous_logo_id = row.organizer_logo_media_id
        new_logo_id: str | None = previous_logo_id
        changed_fields: list[str] = []

        if event_name != row.event_name:
            changed_fields.append("eventName")
        if organizer_name != row.organizer_name:
            changed_fields.append("organizerName")
        if event_duration_minutes != row.event_duration_minutes:
            changed_fields.append("eventDurationMinutes")
        if logo_layout != row.logo_layout:
            changed_fields.append("logoLayout")
        if event_name_layout != row.event_name_layout:
            changed_fields.append("eventNameLayout")

        if file is not None:
            self._validate_file(file)
            media = self.media_storage.save_upload(organization_id, user_id, file, media_type="logo")
            row.organizer_logo_media_id = media.id
            new_logo_id = media.id
            if new_logo_id != previous_logo_id:
                changed_fields.append("organizerLogoMediaId")
        elif remove_logo:
            row.organizer_logo_media_id = None
            new_logo_id = None
            if previous_logo_id is not None:
                changed_fields.append("organizerLogoMediaId")

        row.event_name = event_name
        row.organizer_name = organizer_name
        row.event_duration_minutes = event_duration_minutes
        row.logo_layout = logo_layout
        row.event_name_layout = event_name_layout
        row.updated_by_user_id = user_id
        self.session.flush()

        if previous_logo_id and previous_logo_id != row.organizer_logo_media_id:
            self.media_storage.delete_if_unreferenced(previous_logo_id, organization_id)

        DisplayEventRepository(self.session).record(
            create_display_event(
                organization_id=organization_id,
                event_type="event_configuration_changed",
                severity="info",
                message="Event configuration changed",
                metadata=self._event_metadata(row.id, changed_fields, previous_logo_id, new_logo_id, user_id),
                entity_type="event_configuration",
                entity_id=row.id,
                created_by_user_id=user_id,
            )
        )
        self.session.commit()
        return row

    def logo_media(self, row: EventConfiguration):
        if not row.organizer_logo_media_id:
            return None
        return self.media_repository.get(row.organization_id, row.organizer_logo_media_id)

    def _validate_file(self, file: UploadFile) -> None:
        content_type = file.content_type or "application/octet-stream"
        current_position = file.file.tell()
        file.file.seek(0, 2)
        size_bytes = file.file.tell()
        file.file.seek(current_position)
        validate_logo_upload(content_type, size_bytes, get_settings().image_upload_max_bytes)

    def _clean_text(self, value: object, field_name: str) -> str:
        cleaned = str(value or "").strip()
        if len(cleaned) > MAX_TEXT_LENGTH:
            raise ValueError(f"{field_name} must be 255 characters or fewer.")
        return cleaned

    def _clean_duration(self, value: object) -> int:
        try:
            minutes = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("eventDurationMinutes must be an integer.") from exc
        if minutes <= 0:
            raise ValueError("eventDurationMinutes must be greater than 0.")
        if minutes > MAX_EVENT_DURATION_MINUTES:
            raise ValueError("eventDurationMinutes must be 1440 or fewer.")
        return minutes

    def _clean_layout(self, value: object, field_name: str) -> dict | None:
        """Parse a layout payload into a dict suitable for JSONB storage.

        Accepts the wire format produced by the PUT FormData
        (JSON-encoded string) or an already-parsed dict (e.g. from
        a test). Returns None when the field is absent, empty, or
        the JSON literal `null`, so the column falls back to NULL
        and the kiosko renders the documented visual defaults.
        """
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            if stripped == "" or stripped.lower() == "null":
                return None
            try:
                value = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{field_name} must be a JSON object or null.") from exc
        if isinstance(value, dict):
            if value == {}:
                return None
            try:
                layout = BrandingLayout.model_validate(value)
            except Exception as exc:
                raise ValueError(self._format_layout_error(field_name, exc)) from exc
            return layout.model_dump(by_alias=True, exclude_none=True)
        raise ValueError(f"{field_name} must be a JSON object or null.")

    def _format_layout_error(self, field_name: str, exc: Exception) -> str:
        """Translate a Pydantic validation error into a field-keyed
        message the admin form can display directly.
        """
        message = str(exc)
        if "BrandingLayout" in message:
            message = message.split("BrandingLayout", 1)[-1].strip()
        return f"{field_name}: {message}" if message else f"{field_name} is invalid."

    def _event_metadata(
        self,
        event_configuration_id: str,
        changed_fields: list[str],
        previous_logo_id: str | None,
        new_logo_id: str | None,
        user_id: str,
    ) -> dict[str, object]:
        metadata: dict[str, object] = {
            "eventConfigurationId": event_configuration_id,
            "changedFields": changed_fields,
            "userId": user_id,
        }
        if previous_logo_id != new_logo_id:
            metadata["previousLogoMediaId"] = previous_logo_id
            metadata["newLogoMediaId"] = new_logo_id
        return metadata
