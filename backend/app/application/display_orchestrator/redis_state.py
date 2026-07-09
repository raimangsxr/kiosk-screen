from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import redis

from app.config import get_settings

_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(get_settings().redis_url, decode_responses=True)
    return _client


def reset_redis_client(client: redis.Redis | None = None) -> None:
    global _client
    _client = client


def orchestrator_key(organization_id: str, session_id: str) -> str:
    return f"orchestrator:{organization_id}:{session_id}"


def sse_buffer_key(organization_id: str, session_id: str) -> str:
    return f"sse:buffer:{organization_id}:{session_id}"


def sse_kiosk_key(kiosk_id: str) -> str:
    return f"sse:kiosk:{kiosk_id}"


def pubsub_channel(organization_id: str) -> str:
    return f"pubsub:org:{organization_id}:display"


def redis_get_json(key: str) -> dict[str, Any] | None:
    raw = get_redis_client().get(key)
    if raw is None:
        return None
    return json.loads(raw)


def redis_set_json(key: str, value: dict[str, Any], *, ex: int | None = None) -> None:
    payload = json.dumps(value, separators=(",", ":"), default=_json_default)
    if ex is None:
        get_redis_client().set(key, payload)
    else:
        get_redis_client().set(key, payload, ex=ex)


def redis_delete(key: str) -> None:
    get_redis_client().delete(key)


def buffer_push_event(
    organization_id: str,
    session_id: str,
    envelope: dict[str, Any],
    *,
    max_events: int = 100,
    ttl_seconds: int = 600,
) -> None:
    key = sse_buffer_key(organization_id, session_id)
    client = get_redis_client()
    pipeline = client.pipeline()
    pipeline.rpush(key, json.dumps(envelope, separators=(",", ":"), default=_json_default))
    pipeline.ltrim(key, -max_events, -1)
    pipeline.expire(key, ttl_seconds)
    pipeline.execute()


def buffer_events_since(
    organization_id: str,
    session_id: str,
    last_sequence: int,
) -> list[dict[str, Any]]:
    key = sse_buffer_key(organization_id, session_id)
    raw_items = get_redis_client().lrange(key, 0, -1)
    events: list[dict[str, Any]] = []
    for raw in raw_items:
        envelope = json.loads(raw)
        if envelope.get("sequence", 0) > last_sequence:
            events.append(envelope)
    return events


def _json_default(value: object) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
