"""Integration tests for novelty defer SSE flow (CHG-056)."""
from __future__ import annotations

import io
import queue
import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.preload import pending_novelty_items
from app.application.display_orchestrator.sse_hub import get_display_sse_hub

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "defer rotation test"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def _wait_for_event(subscriber, event_type: str, *, timeout: float = 2.0, predicate=None):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] != event_type:
            continue
        if predicate is not None and not predicate(event):
            continue
        return event
    return None


def test_novelty_preload_ready_and_deferred_emit_flow(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw_key = public_api_key
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    api_client.post("/api/content", json={
        "title": "Regular A",
        "contentType": "photo",
        "sourceReference": "https://example.com/a.jpg",
        "isActive": True,
        "displayOrder": 1,
        "durationSeconds": 15,
    })
    api_client.post("/api/content", json={
        "title": "Regular B",
        "contentType": "photo",
        "sourceReference": "https://example.com/b.jpg",
        "isActive": True,
        "displayOrder": 2,
        "durationSeconds": 15,
    })

    api_client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    api_client.post("/api/display/open")

    hub = get_display_sse_hub()
    hub.start()
    register = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "defer-client", "label": "Pantalla defer"},
    )
    assert register.status_code == 201
    kiosk_id = register.json()["kioskId"]
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw_key}"},
        data={"title": "Deferred novelty"},
        files={"file": ("novelty.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    factory = OrchestratorRegistry._session_factory  # noqa: SLF001
    assert factory is not None
    with factory() as session:
        orchestrator.advance_top(session, reason="test")

    defer_event = _wait_for_event(
        subscriber,
        "show_content",
        predicate=lambda event: event["payload"]["content"]["id"] != content_id,
    )
    assert defer_event is not None

    with factory() as session:
        orchestrator.handle_novelty_preload_ready(
            session,
            kiosk_id=kiosk_id,
            content_id=content_id,
        )
        orchestrator.advance_top(session, reason="test")
        state = orchestrator._load_state()  # noqa: SLF001
        assert state["currentTopContentId"] == content_id

    novelty_event = _wait_for_event(
        subscriber,
        "show_content",
        predicate=lambda event: event["payload"]["content"]["id"] == content_id,
        timeout=3.0,
    )
    assert novelty_event is not None
    assert novelty_event["payload"]["reason"] == "novelty"


def test_snapshot_pending_novelties_include_defer_metadata(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw_key = public_api_key
    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw_key}"},
        data={"title": "Snapshot novelty"},
        files={"file": ("snap.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201

    api_client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    api_client.post("/api/display/open")

    hub = get_display_sse_hub()
    hub.start()
    register = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": f"snap-{uuid4().hex[:8]}", "label": "Snap kiosk"},
    )
    assert register.status_code == 201
    registration = hub.get_kiosk(register.json()["kioskId"])
    assert registration is not None

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    factory = OrchestratorRegistry._session_factory  # noqa: SLF001
    assert factory is not None
    with factory() as session:
        pending = pending_novelty_items(orchestrator, session)

    assert pending
    entry = pending[0]
    assert "deferCount" in entry
    assert "maxDefer" in entry
    assert "downloadReady" in entry
