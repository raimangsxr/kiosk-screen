"""Integration test: admin novelty flag cleared after max-defer discard (CHG-056)."""
from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "defer discard test"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def test_novelty_discarded_after_max_defer_clears_admin_flag(
    api_client: TestClient,
    public_api_key: tuple[dict, str],
) -> None:
    _record, raw_key = public_api_key
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    config = api_client.get("/api/display/configuration")
    assert config.status_code == 200
    body = config.json()
    body["noveltyMaxDeferTransitions"] = 1
    updated = api_client.put("/api/display/configuration", json=body)
    assert updated.status_code == 200

    regular = api_client.post("/api/content", json={
        "title": "Regular only",
        "contentType": "photo",
        "sourceReference": "https://example.com/r.jpg",
        "isActive": True,
        "displayOrder": 1,
        "durationSeconds": 15,
    })
    assert regular.status_code == 201

    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw_key}"},
        data={"title": "Discard me"},
        files={"file": ("discard.png", PNG_BYTES, "image/png")},
    )
    assert upload.status_code == 201
    content_id = upload.json()["id"]

    api_client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    open_resp = api_client.post("/api/display/open")
    assert open_resp.status_code == 200

    hub = get_display_sse_hub()
    hub.start()
    register = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "discard-client", "label": "Discard kiosk"},
    )
    assert register.status_code == 201
    registration = hub.get_kiosk(register.json()["kioskId"])
    assert registration is not None

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    factory = OrchestratorRegistry._session_factory  # noqa: SLF001
    assert factory is not None
    with factory() as session:
        orchestrator._update_state({"noveltyDeferCounts": {content_id: 1}})  # noqa: SLF001
        orchestrator.advance_top(session, reason="test")

    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    content = api_client.get("/api/content")
    assert content.status_code == 200
    item = next(row for row in content.json() if row["id"] == content_id)
    assert item["isNovelty"] is False
