from datetime import datetime, timezone

from app.auth.service import create_session_token, hash_password, verify_password


def test_password_hashing_and_session_duration():
    password_hash = hash_password("secret", salt="fixed-salt")

    assert verify_password("secret", password_hash) is True
    assert verify_password("wrong", password_hash) is False

    now = datetime(2026, 6, 16, tzinfo=timezone.utc)
    token = create_session_token("user-1", 90, now=now)

    assert token.user_id == "user-1"
    assert (token.valid_until - now).total_seconds() == 90 * 60

