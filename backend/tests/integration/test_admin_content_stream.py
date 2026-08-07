"""Integration tests for admin content inventory SSE (CHG-047)."""
import queue
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.application.admin_content.sse_hub import get_admin_content_sse_hub
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.repositories.models.user import User

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "admin content sse"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def _organization_id(api_client: TestClient) -> str:
    factory = api_client.app.state.orchestrator_session_factory
    with factory() as session:
        user = session.scalar(select(User).where(User.email == "admin@example.com"))
        assert user is not None
        return user.organization_id


def _drain_subscriber(subscriber) -> None:
    while not subscriber.events.empty():
        subscriber.events.get_nowait()


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


def test_unauthenticated_stream_returns_401(api_client: TestClient) -> None:
    response = api_client.get("/api/admin/content/stream")
    assert response.status_code == 401


def test_operator_role_not_required_for_stream_route(api_client: TestClient) -> None:
    """Stream auth uses get_stream_user (CHG-048/051); operators may connect and
    the auth path never pins a DB connection for the stream's lifetime."""
    from app.api.content_stream import open_admin_content_stream
    from app.auth.dependencies import get_stream_user

    user_dep = open_admin_content_stream.__defaults__[0]  # type: ignore[index]
    assert user_dep.dependency is get_stream_user


def test_admin_mutation_publishes_content_inventory_changed(api_client: TestClient) -> None:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    org_id = _organization_id(api_client)

    hub = get_admin_content_sse_hub()
    hub.start()
    subscriber = hub.subscribe(org_id)
    _drain_subscriber(subscriber)

    created = api_client.post(
        "/api/content",
        json={
            "title": "SSE test item",
            "contentType": "photo",
            "sourceReference": "https://example.com/photo.jpg",
            "isActive": True,
            "displayOrder": 99,
        },
    )
    assert created.status_code == 201

    event = subscriber.events.get(timeout=2)
    assert event["type"] == "content_inventory_changed"
    assert event["reason"] == "mutation"


def test_public_upload_publishes_content_inventory_changed(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw = public_api_key
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    org_id = _organization_id(api_client)

    hub = get_admin_content_sse_hub()
    hub.start()
    subscriber = hub.subscribe(org_id)
    _drain_subscriber(subscriber)

    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Public SSE novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201

    event = subscriber.events.get(timeout=2)
    assert event["type"] == "content_inventory_changed"
    assert event["reason"] == "mutation"


def test_novelty_consume_publishes_novelty_consumed(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw = public_api_key
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    org_id = _organization_id(api_client)

    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Consume novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    api_client.post("/api/display/open")
    kiosk = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "sse-consume", "label": "Pantalla SSE"},
    )
    assert kiosk.status_code == 201
    kiosk_id = kiosk.json()["kioskId"]

    display_hub = get_display_sse_hub()
    display_hub.start()
    registration = display_hub.get_kiosk(kiosk_id)
    assert registration is not None
    display_hub.subscribe(registration)
    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None

    admin_hub = get_admin_content_sse_hub()
    admin_hub.start()
    subscriber = admin_hub.subscribe(org_id)
    _drain_subscriber(subscriber)

    factory = api_client.app.state.orchestrator_session_factory
    with factory() as session:
        # CHG-056: the orchestrator defers the novelty until every connected kiosk
        # reports its media ready, so emission (and consumption) needs readiness first.
        orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_id, content_id=content_id)
        orchestrator.advance_top(session, reason="test")

    event = _wait_for_event(subscriber, "content_inventory_changed")
    assert event is not None
    assert event["reason"] == "novelty_consumed"
