from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import hmac
import os

from app.repositories.base import new_id, utc_now


def hash_password(password: str, salt: str | None = None) -> str:
    chosen_salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), chosen_salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${chosen_salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, salt, expected = password_hash.split("$", 2)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    actual = hash_password(password, salt).split("$", 2)[2]
    return hmac.compare_digest(actual, expected)


@dataclass(frozen=True)
class SessionToken:
    id: str
    user_id: str
    valid_until: datetime


def create_session_token(user_id: str, duration_minutes: int, now: datetime | None = None) -> SessionToken:
    if duration_minutes <= 0:
        raise ValueError("duration_minutes must be positive")
    issued_at = now or utc_now()
    return SessionToken(id=new_id(), user_id=user_id, valid_until=issued_at + timedelta(minutes=duration_minutes))

