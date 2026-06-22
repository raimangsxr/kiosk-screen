from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Literal


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_LOGO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}
ALLOWED_ROTATION_ANIMATIONS = {"none", "fade", "slide"}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov"}
ALLOWED_UPLOAD_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
ContentTypeLiteral = Literal["photo", "video"]


class UnsupportedExtensionError(ValueError):
    """Raised when a filename has no recognisable upload extension."""


SUPPORTED_EXTENSIONS_MESSAGE = (
    "Tipo de archivo no reconocido. Extensiones válidas: "
    "jpg, jpeg, png, gif, webp, mp4, webm, ogg, mov."
)


@dataclass(frozen=True)
class MediaValidationLimits:
    image_max_bytes: int
    video_max_bytes: int


def validate_rotation_animation(value: str | None) -> None:
    if value is not None and value not in ALLOWED_ROTATION_ANIMATIONS:
        raise ValueError("Rotation animation must be none, fade, or slide.")


def detect_media_type_from_extension(filename: str | None) -> ContentTypeLiteral:
    """Map a filename's extension to ``"photo"`` or ``"video"``.

    Raises :class:`UnsupportedExtensionError` when the filename is missing or
    the extension is not in :data:`ALLOWED_UPLOAD_EXTENSIONS`.
    """
    if not filename:
        raise UnsupportedExtensionError(SUPPORTED_EXTENSIONS_MESSAGE)
    suffix = PurePosixPath(filename).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "photo"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    raise UnsupportedExtensionError(SUPPORTED_EXTENSIONS_MESSAGE)


def validate_media_upload(media_type: str, content_type: str, file_size_bytes: int, limits: MediaValidationLimits) -> None:
    if file_size_bytes <= 0:
        raise ValueError("Uploaded file cannot be empty.")
    if media_type == "image":
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Unsupported image type.")
        if file_size_bytes > limits.image_max_bytes:
            raise ValueError("Image uploads must be 25 MB or smaller.")
        return
    if media_type == "video":
        if content_type not in ALLOWED_VIDEO_TYPES:
            raise ValueError("Unsupported video type.")
        if file_size_bytes > limits.video_max_bytes:
            raise ValueError("Video uploads must be 500 MB or smaller.")
        return
    if media_type == "logo":
        validate_logo_upload(content_type, file_size_bytes, limits.image_max_bytes)
        return
    raise ValueError("Unsupported media type.")


def validate_logo_upload(content_type: str, size_bytes: int, max_bytes: int = 1024 * 1024) -> None:
    if size_bytes <= 0:
        raise ValueError("Logo file is empty.")
    if content_type not in ALLOWED_LOGO_TYPES:
        raise ValueError("Unsupported file type. Allowed: PNG, JPG, WebP, SVG.")
    if size_bytes > max_bytes:
        raise ValueError("Logo file too large (max 1 MB).")
