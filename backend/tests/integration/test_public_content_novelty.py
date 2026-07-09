"""Integration tests for public-content novelty flag and consume endpoint (CHG-027)."""
import io
import queue

import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "novelty test"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def _login_display(api_client: TestClient) -> None:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    api_client.post("/api/display/open")


def test_public_upload_sets_is_novelty_true(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Novelty item"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["isNovelty"] is True


def test_admin_upload_sets_is_novelty_false(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post(
        "/api/content/upload",
        data={"title": "Admin item", "isActive": "true"},
        files={"file": ("hi.png", io.BytesIO(PNG_BYTES), "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["isNovelty"] is False


def test_display_state_includes_is_novelty_until_consumed(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Pending novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    _login_display(api_client)
    state = api_client.get("/api/display/state")
    assert state.status_code == 200
    item = next(i for i in state.json()["topContent"] if i["id"] == content_id)
    assert item["isNovelty"] is True


def test_consume_novelty_first_call_204_second_409(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Consume me"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    content_id = upload.json()["id"]

    _login_display(api_client)
    first = api_client.post(f"/api/display/content/{content_id}/consume-novelty")
    assert first.status_code == 204

    second = api_client.post(f"/api/display/content/{content_id}/consume-novelty")
    assert second.status_code == 409

    state = api_client.get("/api/display/state")
    item = next(i for i in state.json()["topContent"] if i["id"] == content_id)
    assert item["isNovelty"] is False


def test_consume_novelty_unknown_content_returns_404(api_client: TestClient):
    _login_display(api_client)
    response = api_client.post(
        "/api/display/content/00000000-0000-0000-0000-000000000099/consume-novelty"
    )
    assert response.status_code == 404


@pytest.fixture
def orchestrator_stream_client(api_client: TestClient) -> TestClient:
    return api_client


def test_orchestrator_novelty_fan_out_same_command_id(
    orchestrator_stream_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    client = orchestrator_stream_client
    _record, raw = public_api_key
    client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    client.post("/api/display/open")

    upload = client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Hall novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    hub = get_display_sse_hub()
    hub.start()
    kiosk_ids = []
    for index in range(3):
        response = client.post(
            "/api/display/kiosk/register",
            json={"clientInstanceId": f"novelty-{index}"},
        )
        assert response.status_code == 201
        kiosk_ids.append(response.json()["kioskId"])

    registration = hub.get_kiosk(kiosk_ids[0])
    assert registration is not None
    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    subscribers = [hub.subscribe(hub.get_kiosk(kiosk_id)) for kiosk_id in kiosk_ids]
    for subscriber in subscribers:
        while not subscriber.events.empty():
            subscriber.events.get_nowait()

    factory = getattr(app.state, "orchestrator_session_factory", None)
    assert factory is not None
    with factory() as session:
        orchestrator.advance_top(session, reason="test")

    command_ids: list[str] = []
    content_ids: list[str] = []
    for subscriber in subscribers:
        event = subscriber.events.get(timeout=1)
        while event["type"] != "show_content":
            event = subscriber.events.get(timeout=1)
        command_ids.append(event["payload"]["commandId"])
        content_ids.append(event["payload"]["content"]["id"])

    assert len(set(command_ids)) == 1
    assert content_ids == [content_id, content_id, content_id]
