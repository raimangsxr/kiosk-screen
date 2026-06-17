from dataclasses import dataclass


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}
ALLOWED_ROTATION_ANIMATIONS = {"none", "fade", "slide"}


@dataclass(frozen=True)
class MediaValidationLimits:
    image_max_bytes: int
    video_max_bytes: int


def validate_rotation_animation(value: str | None) -> None:
    if value is not None and value not in ALLOWED_ROTATION_ANIMATIONS:
        raise ValueError("Rotation animation must be none, fade, or slide.")


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
    raise ValueError("Unsupported media type.")
