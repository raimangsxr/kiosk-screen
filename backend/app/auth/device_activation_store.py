from __future__ import annotations

import json
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from app.application.display_orchestrator import redis_state

USER_CODE_ALPHABET = string.ascii_uppercase
TTL_SECONDS = 900
POLL_INTERVAL_SECONDS = 2
MAX_CODE_GENERATION_ATTEMPTS = 20

ActivationStatus = Literal["pending", "authorized", "consumed", "expired"]


def _user_key(user_code: str) -> str:
    return f"device_activation:user:{user_code}"


def _device_key(device_code: str) -> str:
    return f"device_activation:device:{device_code}"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _parse_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_user_code(raw: str) -> str:
    return raw.strip().replace(" ", "").replace("-", "").upper()


def is_valid_user_code(value: str) -> bool:
    normalized = normalize_user_code(value)
    return len(normalized) == 6 and all(char in USER_CODE_ALPHABET for char in normalized)


def create_pair() -> tuple[str, str, datetime]:
    client = redis_state.get_redis_client()
    expires_at = _now_utc() + timedelta(seconds=TTL_SECONDS)
    for _ in range(MAX_CODE_GENERATION_ATTEMPTS):
        user_code = "".join(secrets.choice(USER_CODE_ALPHABET) for _ in range(6))
        device_code = str(uuid4())
        if client.exists(_user_key(user_code)):
            continue
        record: dict[str, Any] = {
            "deviceCode": device_code,
            "userCode": user_code,
            "status": "pending",
            "createdAt": _iso(_now_utc()),
            "expiresAt": _iso(expires_at),
            "authorizedByUserId": None,
            "organizationId": None,
            "rememberMe": False,
            "pollIntervalSeconds": POLL_INTERVAL_SECONDS,
        }
        client.set(_user_key(user_code), device_code, ex=TTL_SECONDS, nx=True)
        redis_state.redis_set_json(_device_key(device_code), record, ex=TTL_SECONDS)
        return user_code, device_code, expires_at
    raise RuntimeError("unable_to_allocate_activation_code")


def get_by_device_code(device_code: str) -> dict[str, Any] | None:
    record = redis_state.redis_get_json(_device_key(device_code))
    if record is None:
        return None
    if _is_expired(record):
        record["status"] = "expired"
    return record


def get_by_user_code(user_code: str) -> dict[str, Any] | None:
    normalized = normalize_user_code(user_code)
    client = redis_state.get_redis_client()
    device_code = client.get(_user_key(normalized))
    if device_code is None:
        return None
    return get_by_device_code(device_code)


def _is_expired(record: dict[str, Any]) -> bool:
    expires_at = record.get("expiresAt")
    if not isinstance(expires_at, str):
        return True
    return _parse_iso(expires_at) <= _now_utc()


def try_authorize(
    user_code: str,
    *,
    user_id: str,
    organization_id: str,
    remember_me: bool,
) -> dict[str, Any] | None:
    normalized = normalize_user_code(user_code)
    client = redis_state.get_redis_client()
    device_code = client.get(_user_key(normalized))
    if device_code is None:
        return None
    record = get_by_device_code(device_code)
    if record is None:
        return None
    if record.get("status") != "pending" or _is_expired(record):
        return None
    record["status"] = "authorized"
    record["authorizedByUserId"] = user_id
    record["organizationId"] = organization_id
    record["rememberMe"] = remember_me
    redis_state.redis_set_json(_device_key(device_code), record, ex=TTL_SECONDS)
    return record


def consume(device_code: str) -> dict[str, Any] | None:
    record = get_by_device_code(device_code)
    if record is None:
        return None
    user_code = record.get("userCode")
    if isinstance(user_code, str):
        redis_state.redis_delete(_user_key(user_code))
    redis_state.redis_delete(_device_key(device_code))
    return record


def delete_pair(user_code: str, device_code: str) -> None:
    redis_state.redis_delete(_user_key(user_code))
    redis_state.redis_delete(_device_key(device_code))
