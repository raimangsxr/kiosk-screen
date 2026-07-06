"""Regression: public upload is only reachable via /api/public (CHG-029 FR-001)."""
import io

import pytest
from fastapi.testclient import TestClient

PNG_BYTES = b"\x89PNG\r\n\x1a\n"


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    response = api_client.post("/api/admin/api-keys", json={"label": "router regression"})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["record"], body["rawKey"]


def test_public_upload_succeeds_on_documented_path(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Via public mount"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Via public mount"


def test_admin_content_upload_rejects_bearer_key_without_session(
    api_client: TestClient, public_api_key
):
    _record, raw = public_api_key
    api_client.cookies.clear()
    response = api_client.post(
        "/api/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Should not land here"},
        files={"file": ("hi.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code in {401, 403, 404, 422}
    assert response.status_code != 201
