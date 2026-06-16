from datetime import datetime


def is_within_availability(
    now: datetime,
    available_from: datetime | None = None,
    available_until: datetime | None = None
) -> bool:
    if available_from is not None and now < available_from:
        return False
    if available_until is not None and now > available_until:
        return False
    return True


def validate_availability_window(
    available_from: datetime | None,
    available_until: datetime | None
) -> None:
    if available_from is not None and available_until is not None and available_until <= available_from:
        raise ValueError("available_until must be after available_from")


def resolve_duration_seconds(duration_seconds: int | None, default_duration_seconds: int) -> int:
    duration = duration_seconds if duration_seconds is not None else default_duration_seconds
    if duration <= 0:
        raise ValueError("duration must be positive")
    return duration

