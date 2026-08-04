"""Integration tests for display preload SSE (CHG-050)."""
from __future__ import annotations

import io
import queue
import time

import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.main import app

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "preload test"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def _wait_for_event(subscriber, event_type: str, *, timeout: float = 2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == event_type:
            return event
    return None


def test_public_upload_emits_preload_with_is_novelty(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw = public_api_key
    api_client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    api_client.post("/api/display/open")

    hub = get_display_sse_hub()
    hub.start()
    register = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "preload-client", "label": "Pantalla preload"},
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
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Heavy novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    event = _wait_for_event(subscriber, "preload")
    assert event is not None
    items = event["payload"]["items"]
    assert any(item["contentId"] == content_id and item["isNovelty"] is True for item in items)


def test_show_content_emits_preload_for_next_regular(
    api_client: TestClient,
) -> None:
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
        json={"clientInstanceId": "regular-preload", "label": "Pantalla regular"},
    )
    assert register.status_code == 201
    registration = hub.get_kiosk(register.json()["kioskId"])
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    orchestrator._scheduler.cancel_all()
    factory = app.state.orchestrator_session_factory
    with factory() as session:
        orchestrator.advance_top(session, reason="test")

    show_event = _wait_for_event(subscriber, "show_content")
    assert show_event is not None
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    with factory() as session:
        orchestrator.advance_top(session, reason="test")

    preload_event = _wait_for_event(subscriber, "preload")
    assert preload_event is not None
    assert any(item.get("isNovelty") is False for item in preload_event["payload"]["items"])
