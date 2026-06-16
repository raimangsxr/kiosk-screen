from datetime import datetime, timedelta, timezone

import pytest

from app.domain.availability import is_within_availability, resolve_duration_seconds, validate_availability_window


def test_availability_window_and_duration_rules():
    now = datetime.now(timezone.utc)

    assert is_within_availability(now, now - timedelta(minutes=1), now + timedelta(minutes=1)) is True
    assert is_within_availability(now, now + timedelta(minutes=1), None) is False
    assert resolve_duration_seconds(None, 10) == 10

    with pytest.raises(ValueError):
        validate_availability_window(now, now)

