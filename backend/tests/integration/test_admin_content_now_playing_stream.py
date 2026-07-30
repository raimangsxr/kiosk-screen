"""Integration tests for admin now_playing SSE (CHG-048)."""
import queue

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
    response = api_client.post("/api/admin/api-keys", json={"label": "now playing sse"})
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


def _setup_display_with_content(api_client: TestClient) -> tuple[str, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    org_id = _organization_id(api_client)
    created = api_client.post(
        "/api/content",
        json={
            "title": "On Air Item",
            "contentType": "photo",
            "sourceReference": "https://example.com/on-air.jpg",
            "isActive": True,
            "displayOrder": 1,
        },
    )
    assert created.status_code == 201
    content_id = created.json()["id"]

    api_client.post("/api/display/open")
    kiosk = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "now-playing-kiosk", "label": "Pantalla NP"},
    )
    assert kiosk.status_code == 201
    kiosk_id = kiosk.json()["kioskId"]

    display_hub = get_display_sse_hub()
    display_hub.start()
    registration = display_hub.get_kiosk(kiosk_id)
    assert registration is not None
    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None

    factory = api_client.app.state.orchestrator_session_factory
    with factory() as session:
        orchestrator.bootstrap(session)

    return org_id, content_id


def test_get_now_playing_reflects_orchestrator_bootstrap(api_client: TestClient) -> None:
    from app.application.admin_content.hooks import get_now_playing_for_org

    org_id, _content_id = _setup_display_with_content(api_client)
    display_hub = get_display_sse_hub()
    registration = next(iter(display_hub._kiosks.values()))  # noqa: SLF001
    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    expected_id = orchestrator._load_state().get("currentTopContentId")  # noqa: SLF001

    factory = api_client.app.state.orchestrator_session_factory
    with factory() as session:
        resolved_id, title = get_now_playing_for_org(session, org_id)
    assert resolved_id == expected_id
    assert title is not None


def test_advance_top_publishes_now_playing_changed(api_client: TestClient) -> None:
    org_id, _content_id = _setup_display_with_content(api_client)

    factory = api_client.app.state.orchestrator_session_factory
    api_client.post(
        "/api/content",
        json={
            "title": "Second Item",
            "contentType": "photo",
            "sourceReference": "https://example.com/second.jpg",
            "isActive": True,
            "displayOrder": 2,
        },
    )

    hub = get_admin_content_sse_hub()
    hub.start()
    subscriber = hub.subscribe(org_id)
    _drain_subscriber(subscriber)

    display_hub = get_display_sse_hub()
    registration = next(iter(display_hub._kiosks.values()))  # noqa: SLF001
    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    before_id = orchestrator._load_state().get("currentTopContentId")  # noqa: SLF001

    with factory() as session:
        orchestrator.advance_top(session, reason="test")

    event = subscriber.events.get(timeout=2)
    assert event["type"] == "now_playing_changed"
    assert event["contentId"] is not None
    assert event["contentId"] != before_id


def test_public_upload_emits_rotation_replan_log(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
    caplog,
) -> None:
    import logging

    caplog.set_level(logging.INFO)
    _record, raw = public_api_key
    org_id, _ = _setup_display_with_content(api_client)

    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Mid-cycle novelty"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201

    replan_logs = [record for record in caplog.records if record.message == "rotation_replan"]
    assert replan_logs, "expected rotation_replan log after public upload"
    record = replan_logs[-1]
    assert record.organizationId == org_id  # type: ignore[attr-defined]
    assert record.showing is not None  # type: ignore[attr-defined]
