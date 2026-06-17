import pytest

from app.domain.media import MediaValidationLimits, validate_media_upload, validate_rotation_animation
from app.domain.rotation import resolve_effective_rotation


def test_media_validation_rejects_invalid_type_and_size():
    limits = MediaValidationLimits(image_max_bytes=10, video_max_bytes=20)

    validate_media_upload("image", "image/png", 10, limits)
    validate_media_upload("video", "video/mp4", 20, limits)

    with pytest.raises(ValueError):
        validate_media_upload("image", "application/pdf", 1, limits)
    with pytest.raises(ValueError):
        validate_media_upload("image", "image/png", 11, limits)


def test_rotation_validation_and_effective_defaults():
    validate_rotation_animation("fade")
    with pytest.raises(ValueError):
        validate_rotation_animation("spin")

    effective = resolve_effective_rotation(None, None, None, 15, "slide", 300)
    assert effective.duration_seconds == 15
    assert effective.rotation_animation == "slide"
    assert effective.animation_duration_milliseconds == 300
