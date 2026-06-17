from pathlib import Path
import shutil
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.domain.media import MediaValidationLimits, validate_media_upload
from app.repositories.base import new_id
from app.repositories.media import MediaRepository
from app.repositories.models.media import MediaFileReference


class MediaStorageService:
    def __init__(self, session: Session):
        self.session = session
        self.settings = get_settings()
        self.repository = MediaRepository(session)
        self.root = Path(self.settings.media_storage_path)

    def save_upload(self, organization_id: str, user_id: str, upload: UploadFile, media_type: str) -> MediaFileReference:
        content_type = upload.content_type or "application/octet-stream"
        suffix = Path(upload.filename or "").suffix.lower()
        media_id = new_id()
        relative_path = Path(organization_id) / f"{media_id}-{uuid4().hex}{suffix}"
        absolute_path = self.root / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)

        bytes_written = 0
        try:
            with absolute_path.open("wb") as target:
                while chunk := upload.file.read(1024 * 1024):
                    bytes_written += len(chunk)
                    target.write(chunk)
            validate_media_upload(
                media_type,
                content_type,
                bytes_written,
                MediaValidationLimits(
                    image_max_bytes=self.settings.image_upload_max_bytes,
                    video_max_bytes=self.settings.video_upload_max_bytes
                )
            )
        except Exception:
            absolute_path.unlink(missing_ok=True)
            raise
        finally:
            upload.file.seek(0)

        media = MediaFileReference(
            id=media_id,
            organization_id=organization_id,
            storage_path=str(relative_path),
            public_reference=f"/api/media/{media_id}",
            original_filename=Path(upload.filename or "upload").name,
            media_type=media_type,
            content_type=content_type,
            file_size_bytes=bytes_written,
            created_by_user_id=user_id
        )
        self.repository.add(media)
        return media

    def absolute_path(self, media: MediaFileReference) -> Path:
        path = (self.root / media.storage_path).resolve()
        root = self.root.resolve()
        if root not in path.parents and path != root:
            raise ValueError("Invalid media storage path.")
        return path

    def delete_file(self, media: MediaFileReference) -> None:
        self.absolute_path(media).unlink(missing_ok=True)

    def delete_if_unreferenced(self, media_id: str, organization_id: str) -> None:
        media = self.repository.get(organization_id, media_id)
        if media is None:
            return
        if self.repository.reference_count(organization_id, media.id) == 0:
            self.delete_file(media)
            self.session.delete(media)
