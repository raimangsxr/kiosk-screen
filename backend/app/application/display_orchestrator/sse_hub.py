from __future__ import annotations

import asyncio
import json
import logging
import queue
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import redis

from sqlalchemy.orm import Session

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.config_mutation import build_config_updated_payload
from app.api.schemas import EventBrandingSchema, KioskConfigurationSchema
from app.domain.display_events import create_display_event
from app.repositories.events import DisplayEventRepository
from app.repositories.kiosk_connections import KioskConnectionRepository

logger = logging.getLogger(__name__)

PROTOCOL_VERSION = 1
PING_INTERVAL_SECONDS = 30
BUFFER_TTL_SECONDS = 600
DISPLAY_SSE_QUEUE_MAXSIZE = 64
# Suppress duplicate connect/disconnect audit rows for the same kiosk inside
# this window so a reconnect storm cannot amplify DB writes (register + stream
# open already fire twice for a single connect).
CONNECTION_AUDIT_DEBOUNCE_SECONDS = 5.0


@dataclass(frozen=True)
class KioskRegistration:
    kiosk_id: str
    organization_id: str
    operator_session_id: str
    client_instance_id: str
    label: str | None


@dataclass
class StreamSubscriber:
    connection_id: str
    kiosk_id: str
    organization_id: str
    operator_session_id: str
    events: queue.Queue[dict[str, Any]]
    # Bound by the async stream endpoint so producer threads (orchestrator
    # timers, Redis pub/sub) can wake the awaiting generator without blocking
    # a thread-pool worker per connection.
    loop: asyncio.AbstractEventLoop | None = field(default=None)
    wakeup: asyncio.Event | None = field(default=None)

    def bind_loop(self, loop: asyncio.AbstractEventLoop, wakeup: asyncio.Event) -> None:
        self.loop = loop
        self.wakeup = wakeup

    def signal(self) -> None:
        loop = self.loop
        wakeup = self.wakeup
        if loop is None or wakeup is None:
            return
        try:
            loop.call_soon_threadsafe(wakeup.set)
        except RuntimeError:
            # Loop already closed (connection torn down); nothing to wake.
            pass


class DisplaySseHub:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._subscribers: dict[str, StreamSubscriber] = {}
        self._kiosks: dict[str, KioskRegistration] = {}
        self._client_instance_index: dict[tuple[str, str], str] = {}
        self._sequences: dict[tuple[str, str], int] = {}
        self._conn_audit_at: dict[str, float] = {}
        self._snapshot_cache: dict[tuple[str, str], dict[str, Any]] = {}
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
                name="display-sse-pubsub",
                daemon=True,
            )
            self._pubsub_thread.start()

    def stop(self) -> None:
        self._pubsub_stop.set()
        thread = self._pubsub_thread
        if thread is not None:
            thread.join(timeout=2)
        self._pubsub_thread = None

    def register_kiosk(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        client_instance_id: str,
        label: str | None,
    ) -> KioskRegistration:
        kiosk_id = str(uuid4())
        registration = KioskRegistration(
            kiosk_id=kiosk_id,
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            client_instance_id=client_instance_id,
            label=label,
        )
        with self._lock:
            index_key = (organization_id, client_instance_id)
            prior_kiosk_id = self._client_instance_index.get(index_key)
            if prior_kiosk_id is not None:
                self._disconnect_kiosk_locked(prior_kiosk_id, reason="superseded")
            self._kiosks[kiosk_id] = registration
            self._client_instance_index[index_key] = kiosk_id
        redis_state.redis_set_json(
            redis_state.sse_kiosk_key(kiosk_id),
            {
                "kioskId": kiosk_id,
                "organizationId": organization_id,
                "operatorSessionId": operator_session_id,
                "clientInstanceId": client_instance_id,
                "label": label,
                "replicaId": self._replica_id,
            },
            ex=86_400,
        )
        return registration

    def end_operator_session(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        reason: str,
    ) -> None:
        messages = {
            "superseded": "A new display session was opened.",
            "expired": "The display session expired.",
            "disabled": "The display session was disabled.",
            "operator_closed": "The operator closed the display session.",
        }
        self.publish(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="session_ended",
            payload={
                "reason": reason,
                "message": messages.get(reason, "Display stream connection ended."),
            },
        )
        with self._lock:
            kiosk_ids = [
                kiosk_id
                for kiosk_id, registration in self._kiosks.items()
                if registration.organization_id == organization_id
                and registration.operator_session_id == operator_session_id
            ]
            for kiosk_id in kiosk_ids:
                registration = self._kiosks.pop(kiosk_id, None)
                if registration is None:
                    continue
                index_key = (registration.organization_id, registration.client_instance_id)
                if self._client_instance_index.get(index_key) == kiosk_id:
                    self._client_instance_index.pop(index_key, None)
                self._conn_audit_at.pop(kiosk_id, None)
                redis_state.redis_delete(redis_state.sse_kiosk_key(kiosk_id))
            connection_ids = [
                connection_id
                for connection_id, subscriber in self._subscribers.items()
                if subscriber.organization_id == organization_id
                and subscriber.operator_session_id == operator_session_id
            ]
            for connection_id in connection_ids:
                self._subscribers.pop(connection_id, None)
            self._sequences.pop((organization_id, operator_session_id), None)
            self._snapshot_cache.pop((organization_id, operator_session_id), None)

    def _should_record_conn_audit(self, kiosk_id: str) -> bool:
        """Debounce connect/disconnect audit rows per kiosk.

        The live-connection state (``KioskConnection``) is always updated; only
        the append-only ``DisplayEvent`` audit trail is coalesced so a flapping
        connection cannot flood it. Register + stream-open fire for a single
        connect, so this also collapses that redundant pair into one row.
        """
        now = time.monotonic()
        with self._lock:
            last = self._conn_audit_at.get(kiosk_id)
            if last is not None and now - last < CONNECTION_AUDIT_DEBOUNCE_SECONDS:
                return False
            self._conn_audit_at[kiosk_id] = now
        return True

    def record_kiosk_connected(
        self,
        session: Session,
        registration: KioskRegistration,
        *,
        display_device_id: str | None = None,
    ) -> None:
        KioskConnectionRepository(session).record_connected(
            kiosk_id=registration.kiosk_id,
            organization_id=registration.organization_id,
            operator_session_id=registration.operator_session_id,
            client_instance_id=registration.client_instance_id,
            label=registration.label,
            display_device_id=display_device_id,
        )
        if self._should_record_conn_audit(registration.kiosk_id):
            DisplayEventRepository(session).record(
                create_display_event(
                    organization_id=registration.organization_id,
                    event_type="kiosk_connected",
                    severity="info",
                    message="Display kiosk connected to SSE stream",
                    entity_type="kiosk",
                    entity_id=registration.kiosk_id,
                    metadata={
                        "operatorSessionId": registration.operator_session_id,
                        "clientInstanceId": registration.client_instance_id,
                        "label": registration.label,
                    },
                )
            )
        session.commit()

    def record_kiosk_disconnected(self, session: Session, registration: KioskRegistration) -> None:
        KioskConnectionRepository(session).record_disconnected(registration.kiosk_id)
        if self._should_record_conn_audit(registration.kiosk_id):
            DisplayEventRepository(session).record(
                create_display_event(
                    organization_id=registration.organization_id,
                    event_type="kiosk_disconnected",
                    severity="info",
                    message="Display kiosk disconnected from SSE stream",
                    entity_type="kiosk",
                    entity_id=registration.kiosk_id,
                    metadata={
                        "operatorSessionId": registration.operator_session_id,
                        "clientInstanceId": registration.client_instance_id,
                        "label": registration.label,
                    },
                )
            )
        session.commit()

    def list_registrations(self, organization_id: str) -> list[KioskRegistration]:
        """Return kiosks with an active SSE subscriber (stream open)."""
        with self._lock:
            live_kiosk_ids = {subscriber.kiosk_id for subscriber in self._subscribers.values()}
            return [
                registration
                for registration in self._kiosks.values()
                if registration.organization_id == organization_id
                and registration.kiosk_id in live_kiosk_ids
            ]

    def fanout_to_kiosk(self, kiosk_id: str, envelope: dict[str, Any]) -> None:
        with self._lock:
            subscribers = [
                subscriber
                for subscriber in self._subscribers.values()
                if subscriber.kiosk_id == kiosk_id
            ]
        for subscriber in subscribers:
            self._enqueue_bounded(subscriber, envelope)

    def _enqueue_bounded(self, subscriber: StreamSubscriber, envelope: dict[str, Any]) -> None:
        event_queue = subscriber.events
        try:
            event_queue.put_nowait(envelope)
        except queue.Full:
            try:
                event_queue.get_nowait()
            except queue.Empty:
                pass
            try:
                event_queue.put_nowait(envelope)
            except queue.Full:
                pass
        subscriber.signal()

    def has_live_subscribers_for_session(self, organization_id: str, operator_session_id: str) -> bool:
        """True when at least one open SSE stream belongs to this session (R2)."""
        with self._lock:
            return any(
                subscriber.organization_id == organization_id
                and subscriber.operator_session_id == operator_session_id
                for subscriber in self._subscribers.values()
            )

    def get_cached_snapshot(
        self, organization_id: str, operator_session_id: str
    ) -> dict[str, Any] | None:
        with self._lock:
            return self._snapshot_cache.get((organization_id, operator_session_id))

    def cache_snapshot(
        self, organization_id: str, operator_session_id: str, payload: dict[str, Any]
    ) -> None:
        with self._lock:
            self._snapshot_cache[(organization_id, operator_session_id)] = payload

    def get_kiosk(self, kiosk_id: str) -> KioskRegistration | None:
        with self._lock:
            registration = self._kiosks.get(kiosk_id)
            if registration is not None:
                return registration
        stored = redis_state.redis_get_json(redis_state.sse_kiosk_key(kiosk_id))
        if stored is None:
            return None
        return KioskRegistration(
            kiosk_id=stored["kioskId"],
            organization_id=stored["organizationId"],
            operator_session_id=stored["operatorSessionId"],
            client_instance_id=stored["clientInstanceId"],
            label=stored.get("label"),
        )

    def subscribe(self, registration: KioskRegistration) -> StreamSubscriber:
        connection_id = str(uuid4())
        subscriber = StreamSubscriber(
            connection_id=connection_id,
            kiosk_id=registration.kiosk_id,
            organization_id=registration.organization_id,
            operator_session_id=registration.operator_session_id,
            events=queue.Queue(maxsize=DISPLAY_SSE_QUEUE_MAXSIZE),
        )
        with self._lock:
            self._subscribers[connection_id] = subscriber
        return subscriber

    def unsubscribe(self, connection_id: str) -> None:
        with self._lock:
            self._subscribers.pop(connection_id, None)

    def publish_config_updated(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        before: KioskConfigurationSchema,
        after: KioskConfigurationSchema,
    ) -> dict[str, Any]:
        payload = build_config_updated_payload(before, after)
        return self.publish(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="config_updated",
            payload=payload,
        )

    def publish_branding_updated(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        branding: EventBrandingSchema,
    ) -> dict[str, Any]:
        return self.publish(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="branding_updated",
            payload=branding.model_dump(mode="json", by_alias=True),
        )

    def publish(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        envelope = self._build_envelope(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type=event_type,
            payload=payload,
        )
        redis_state.buffer_push_event(organization_id, operator_session_id, envelope)
        self._fanout_local(organization_id, operator_session_id, envelope)
        try:
            redis_state.get_redis_client().publish(
                redis_state.pubsub_channel(organization_id),
                json.dumps(
                    {"sourceReplicaId": self._replica_id, "envelope": envelope},
                    separators=(",", ":"),
                ),
            )
        except redis.RedisError:
            logger.exception("Failed to publish display SSE event to Redis")
        return envelope

    def build_snapshot_envelope(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        snapshot_payload: dict[str, Any],
    ) -> dict[str, Any]:
        return self.publish(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="snapshot",
            payload=snapshot_payload,
        )

    def build_ping_envelope(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
    ) -> dict[str, Any]:
        return self._build_envelope(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="ping",
            payload={"serverTime": _utc_now_iso()},
            advance_sequence=False,
        )

    def replay_or_snapshot(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        last_event_id: int | None,
        snapshot_payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        if last_event_id is None:
            envelope = self._build_envelope(
                organization_id=organization_id,
                operator_session_id=operator_session_id,
                event_type="snapshot",
                payload=snapshot_payload,
            )
            redis_state.buffer_push_event(organization_id, operator_session_id, envelope)
            return [envelope]
        replay = redis_state.buffer_events_since(organization_id, operator_session_id, last_event_id)
        if replay:
            return replay
        envelope = self._build_envelope(
            organization_id=organization_id,
            operator_session_id=operator_session_id,
            event_type="snapshot",
            payload=snapshot_payload,
        )
        redis_state.buffer_push_event(organization_id, operator_session_id, envelope)
        return [envelope]

    def _build_envelope(
        self,
        *,
        organization_id: str,
        operator_session_id: str,
        event_type: str,
        payload: dict[str, Any],
        advance_sequence: bool = True,
    ) -> dict[str, Any]:
        sequence_key = (organization_id, operator_session_id)
        with self._lock:
            if advance_sequence:
                next_sequence = self._sequences.get(sequence_key, 0) + 1
                self._sequences[sequence_key] = next_sequence
            else:
                next_sequence = self._sequences.get(sequence_key, 0)
        return {
            "v": PROTOCOL_VERSION,
            "type": event_type,
            "sequence": next_sequence,
            "emittedAt": _utc_now_iso(),
            "operatorSessionId": operator_session_id,
            "organizationId": organization_id,
            "payload": payload,
        }

    def _fanout_local(self, organization_id: str, operator_session_id: str, envelope: dict[str, Any]) -> None:
        with self._lock:
            # Any delivered event (local or cross-replica) means the session
            # state moved on, so the cached snapshot is stale (R3).
            self._snapshot_cache.pop((organization_id, operator_session_id), None)
            subscribers = [
                subscriber
                for subscriber in self._subscribers.values()
                if subscriber.organization_id == organization_id
                and subscriber.operator_session_id == operator_session_id
            ]
        for subscriber in subscribers:
            self._enqueue_bounded(subscriber, envelope)

    def _disconnect_kiosk_locked(self, kiosk_id: str, *, reason: str) -> None:
        registration = self._kiosks.pop(kiosk_id, None)
        if registration is None:
            return
        index_key = (registration.organization_id, registration.client_instance_id)
        if self._client_instance_index.get(index_key) == kiosk_id:
            self._client_instance_index.pop(index_key, None)
        self._conn_audit_at.pop(kiosk_id, None)
        ended = self.publish(
            organization_id=registration.organization_id,
            operator_session_id=registration.operator_session_id,
            event_type="session_ended",
            payload={
                "reason": reason,
                "message": "Display stream connection ended.",
            },
        )
        self._fanout_local(registration.organization_id, registration.operator_session_id, ended)
        connection_ids = [
            connection_id
            for connection_id, subscriber in self._subscribers.items()
            if subscriber.kiosk_id == kiosk_id
        ]
        for connection_id in connection_ids:
            self._subscribers.pop(connection_id, None)
        redis_state.redis_delete(redis_state.sse_kiosk_key(kiosk_id))

    def _pubsub_listener(self) -> None:
        # Reconnect with backoff instead of dying on the first Redis hiccup,
        # which would silently stop cross-replica fan-out until restart (R5).
        backoff = 1.0
        while not self._pubsub_stop.is_set():
            try:
                client = redis_state.get_redis_client()
                pubsub = client.pubsub(ignore_subscribe_messages=True)
                pubsub.psubscribe("pubsub:org:*:display")
            except redis.RedisError:
                logger.exception("Display SSE pub/sub subscribe failed; retrying in %.0fs", backoff)
                if self._pubsub_stop.wait(backoff):
                    return
                backoff = min(backoff * 2, 30.0)
                continue

            backoff = 1.0
            try:
                while not self._pubsub_stop.is_set():
                    try:
                        message = pubsub.get_message(timeout=1.0)
                    except redis.RedisError:
                        logger.exception("Display SSE pub/sub read error; reconnecting")
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
                    else:
                        envelope = parsed
                    self._fanout_local(
                        envelope["organizationId"], envelope["operatorSessionId"], envelope
                    )
            finally:
                try:
                    pubsub.close()
                except redis.RedisError:
                    logger.exception("Failed to close display SSE pub/sub")

            if self._pubsub_stop.wait(backoff):
                return
            backoff = min(backoff * 2, 30.0)


_hub: DisplaySseHub | None = None


def get_display_sse_hub() -> DisplaySseHub:
    global _hub
    if _hub is None:
        _hub = DisplaySseHub()
    return _hub


def reset_display_sse_hub() -> None:
    global _hub
    if _hub is not None:
        _hub.stop()
    _hub = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
