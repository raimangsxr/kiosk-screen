from __future__ import annotations

import json
import logging
import queue
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import redis

from app.application.display_orchestrator import redis_state

logger = logging.getLogger(__name__)

PROTOCOL_VERSION = 1
PING_INTERVAL_SECONDS = 30


def admin_content_pubsub_channel(organization_id: str) -> str:
    return f"pubsub:org:{organization_id}:admin-content"


@dataclass
class AdminContentSubscriber:
    connection_id: str
    organization_id: str
    events: queue.Queue[dict[str, Any]]


class AdminContentSseHub:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._subscribers: dict[str, AdminContentSubscriber] = {}
        self._pubsub_thread: threading.Thread | None = None
        self._pubsub_stop = threading.Event()
        self._replica_id = str(uuid4())

    def start(self) -> None:
        with self._lock:
            if self._pubsub_thread is not None:
                return
            self._pubsub_stop.clear()
            self._pubsub_thread = threading.Thread(
                target=self._pubsub_listener,
                name="admin-content-sse-pubsub",
                daemon=True,
            )
            self._pubsub_thread.start()

    def stop(self) -> None:
        self._pubsub_stop.set()
        thread = self._pubsub_thread
        if thread is not None:
            thread.join(timeout=2)
        self._pubsub_thread = None

    def subscribe(self, organization_id: str) -> AdminContentSubscriber:
        connection_id = str(uuid4())
        subscriber = AdminContentSubscriber(
            connection_id=connection_id,
            organization_id=organization_id,
            events=queue.Queue(),
        )
        with self._lock:
            self._subscribers[connection_id] = subscriber
        return subscriber

    def unsubscribe(self, connection_id: str) -> None:
        with self._lock:
            self._subscribers.pop(connection_id, None)

    def publish(self, organization_id: str, *, reason: str = "mutation") -> dict[str, Any]:
        envelope = {
            "v": PROTOCOL_VERSION,
            "type": "content_inventory_changed",
            "at": _utc_now_iso(),
            "reason": reason,
        }
        self._publish_envelope(organization_id, envelope)
        return envelope

    def publish_now_playing_changed(
        self,
        organization_id: str,
        *,
        content_id: str | None,
        title: str | None = None,
    ) -> dict[str, Any]:
        envelope: dict[str, Any] = {
            "v": PROTOCOL_VERSION,
            "type": "now_playing_changed",
            "at": _utc_now_iso(),
            "contentId": content_id,
        }
        if content_id is not None and title is not None:
            envelope["title"] = title
        self._publish_envelope(organization_id, envelope)
        return envelope

    def build_now_playing_replay_envelope(
        self,
        *,
        content_id: str | None,
        title: str | None = None,
    ) -> dict[str, Any]:
        envelope: dict[str, Any] = {
            "v": PROTOCOL_VERSION,
            "type": "now_playing_changed",
            "at": _utc_now_iso(),
            "contentId": content_id,
        }
        if content_id is not None and title is not None:
            envelope["title"] = title
        return envelope

    def _publish_envelope(self, organization_id: str, envelope: dict[str, Any]) -> None:
        self._fanout_local(organization_id, envelope)
        try:
            redis_state.get_redis_client().publish(
                admin_content_pubsub_channel(organization_id),
                json.dumps(
                    {
                        "sourceReplicaId": self._replica_id,
                        "organizationId": organization_id,
                        "envelope": envelope,
                    },
                    separators=(",", ":"),
                ),
            )
        except redis.RedisError:
            logger.exception("Failed to publish admin content SSE event to Redis")

    def build_ping_comment(self) -> str:
        return ": ping\n\n"

    def _fanout_local(self, organization_id: str, envelope: dict[str, Any]) -> None:
        with self._lock:
            subscribers = [
                subscriber
                for subscriber in self._subscribers.values()
                if subscriber.organization_id == organization_id
            ]
        for subscriber in subscribers:
            subscriber.events.put(envelope)

    def _pubsub_listener(self) -> None:
        try:
            client = redis_state.get_redis_client()
            pubsub = client.pubsub(ignore_subscribe_messages=True)
            pubsub.psubscribe("pubsub:org:*:admin-content")
        except redis.RedisError:
            logger.exception("Admin content SSE pub/sub listener failed to start")
            return
        while not self._pubsub_stop.is_set():
            try:
                message = pubsub.get_message(timeout=1.0)
            except redis.RedisError:
                logger.exception("Admin content SSE pub/sub listener error")
                break
            if not message or message.get("type") not in {"message", "pmessage"}:
                continue
            data = message.get("data")
            if not isinstance(data, str):
                continue
            try:
                parsed = json.loads(data)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict) and "envelope" in parsed:
                if parsed.get("sourceReplicaId") == self._replica_id:
                    continue
                envelope = parsed["envelope"]
                organization_id = parsed.get("organizationId")
            else:
                envelope = parsed
                organization_id = envelope.get("organizationId")
            if organization_id:
                self._fanout_local(organization_id, envelope)
        try:
            pubsub.close()
        except redis.RedisError:
            logger.exception("Failed to close admin content SSE pub/sub")


_hub: AdminContentSseHub | None = None


def get_admin_content_sse_hub() -> AdminContentSseHub:
    global _hub
    if _hub is None:
        _hub = AdminContentSseHub()
    return _hub


def reset_admin_content_sse_hub() -> None:
    global _hub
    if _hub is not None:
        _hub.stop()
    _hub = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
