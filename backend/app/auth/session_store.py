from __future__ import annotations

import hashlib
import hmac
import time
from collections import defaultdict

DEFAULT_SESSION_SECRET = "development-only-session-secret"
DEFAULT_BOOTSTRAP_ADMIN_PASSWORD = "admin"


class LoginRateLimiter:
    """Per-client failed-login throttle (in-process, CHG-031 MVP)."""

    def __init__(self, *, max_attempts: int = 10, window_seconds: int = 15 * 60) -> None:
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._failures: dict[str, list[float]] = defaultdict(list)

    def is_limited(self, client_key: str, *, now: float | None = None) -> bool:
        current = now if now is not None else time.monotonic()
        attempts = self._prune(client_key, current)
        return len(attempts) >= self._max_attempts

    def record_failure(self, client_key: str, *, now: float | None = None) -> None:
        current = now if now is not None else time.monotonic()
        attempts = self._prune(client_key, current)
        attempts.append(current)
        self._failures[client_key] = attempts

    def reset(self, client_key: str) -> None:
        self._failures.pop(client_key, None)

    def _prune(self, client_key: str, now: float) -> list[float]:
        cutoff = now - self._window_seconds
        attempts = [ts for ts in self._failures.get(client_key, []) if ts >= cutoff]
        self._failures[client_key] = attempts
        return attempts


login_rate_limiter = LoginRateLimiter()


def sign_session_cookie_value(session_id: str, session_secret: str) -> str:
    signature = hmac.new(
        session_secret.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{session_id}.{signature}"


def parse_signed_session_cookie_value(cookie_value: str, session_secret: str) -> str | None:
    if "." not in cookie_value:
        return None
    session_id, provided_sig = cookie_value.rsplit(".", 1)
    if not session_id or not provided_sig:
        return None
    expected_sig = hmac.new(
        session_secret.encode("utf-8"),
        session_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(provided_sig, expected_sig):
        return None
    return session_id
