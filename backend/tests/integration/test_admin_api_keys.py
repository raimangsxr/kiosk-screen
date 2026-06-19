"""Integration tests for the admin API key endpoints (spec 009 US2).

Covers FR-018 (admin-only), FR-019 (raw key returned once on create),
FR-020 (in-place rotation invalidates the previous value), FR-021 (no raw in
list), FR-022 (multiple keys per org), FR-022A (audit event).
"""
import secrets

import pytest
from fastapi.testclient import TestClient


def _admin_login(client: TestClient) -> None:
    r = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert r.status_code == 200, r.text


def _create_key(client: TestClient, label: str = "test") -> dict:
    r = client.post("/api/admin/api-keys", json={"label": label})
    assert r.status_code == 201, r.text
    return r.json()


# --- FR-018: admin-only access -----------------------------------------------


def test_list_api_keys_requires_admin(api_client: TestClient):
    # No session — unauthenticated
    r = api_client.get("/api/admin/api-keys")
    assert r.status_code in (401, 403)


def test_create_api_key_returns_raw_key_once(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="my integration")
    assert "rawKey" in body
    assert body["rawKey"].startswith("ksk_live_")
    assert body["record"]["label"] == "my integration"
    assert body["record"]["isActive"] is True
    assert body["record"]["lastRotatedAt"] is None
    assert body["record"]["revokedAt"] is None
    assert body["record"]["lastUsedAt"] is None


def test_list_does_not_include_raw_key(api_client: TestClient):
    _admin_login(api_client)
    _create_key(api_client, label="never-raw")
    listing = api_client.get("/api/admin/api-keys")
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1
    assert "rawKey" not in items[0]
    assert "keyHash" not in items[0]
    assert items[0]["label"] == "never-raw"
    assert items[0]["keyPrefix"].startswith("ksk_live_")


def test_create_rejects_blank_label(api_client: TestClient):
    _admin_login(api_client)
    r = api_client.post("/api/admin/api-keys", json={"label": ""})
    # The route maps empty title to a typed error, returning 400 title_required.
    assert r.status_code == 400
    assert r.json()["code"] == "title_required"


def test_create_rejects_oversized_label(api_client: TestClient):
    _admin_login(api_client)
    r = api_client.post("/api/admin/api-keys", json={"label": "x" * 121})
    assert r.status_code == 400
    assert r.json()["code"] == "title_too_long"


# --- FR-020: in-place rotation invalidates the previous value ----------------


def test_rotate_replaces_raw_and_invalidates_previous(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="rotate me")
    key_id = body["record"]["id"]
    old_raw = body["rawKey"]
    old_prefix = body["record"]["keyPrefix"]

    rotate_resp = api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    assert rotate_resp.status_code == 200, rotate_resp.text
    new = rotate_resp.json()
    assert new["rawKey"] != old_raw
    assert new["record"]["keyPrefix"] != old_prefix
    assert new["record"]["id"] == key_id
    assert new["record"]["label"] == "rotate me"
    assert new["record"]["lastRotatedAt"] is not None

    # The old key value no longer works on the public endpoint.
    r = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {old_raw}"},
        data={"title": "x"},
        files={"file": ("hi.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert r.status_code == 401

    # The new key works.
    r = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {new['rawKey']}"},
        data={"title": "x"},
        files={"file": ("hi.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert r.status_code == 201


def test_rotate_unknown_id_returns_404(api_client: TestClient):
    _admin_login(api_client)
    r = api_client.post("/api/admin/api-keys/00000000-0000-0000-0000-000000000000/rotate")
    assert r.status_code in (400, 404)


def test_rotate_revoked_returns_409(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="revoke then rotate")
    key_id = body["record"]["id"]
    # Revoke first
    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204
    # Now rotate
    r = api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    assert r.status_code == 409
    assert r.json()["code"] == "api_key_revoked"


# --- FR-021: revoke invalidates the key ------------------------------------


def test_revoke_marks_inactive_and_invalidates(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="revoke me")
    key_id = body["record"]["id"]
    raw = body["rawKey"]

    r = api_client.delete(f"/api/admin/api-keys/{key_id}")
    assert r.status_code == 204

    # The public endpoint now returns 403 (inactive)
    r = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "x"},
        files={"file": ("hi.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert r.status_code == 403
    assert r.json()["code"] == "inactive_api_key"

    # The list now shows the key as inactive with revokedAt populated.
    listing = api_client.get("/api/admin/api-keys")
    item = next(i for i in listing.json() if i["id"] == key_id)
    assert item["isActive"] is False
    assert item["revokedAt"] is not None


def test_revoke_is_idempotent(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="revoke twice")
    key_id = body["record"]["id"]
    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204
    # Second revoke returns 204 (no-op)
    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204


def test_revoke_unknown_returns_404(api_client: TestClient):
    _admin_login(api_client)
    r = api_client.delete("/api/admin/api-keys/00000000-0000-0000-0000-000000000000")
    assert r.status_code in (400, 404)


# --- FR-022: multiple keys per org -------------------------------------------


def test_multiple_keys_per_org(api_client: TestClient):
    _admin_login(api_client)
    _create_key(api_client, label="first")
    _create_key(api_client, label="second")
    _create_key(api_client, label="third")
    listing = api_client.get("/api/admin/api-keys")
    assert listing.status_code == 200
    labels = {item["label"] for item in listing.json()}
    assert labels == {"first", "second", "third"}


# --- FR-022A: audit events --------------------------------------------------


def test_create_rotate_revoke_record_audit_events(api_client: TestClient):
    """The api_key_changed events are recorded with the correct action
    and severity. We trigger each action via the admin endpoint and then
    query the events endpoint to verify the audit trail.

    Note: the ``/api/events`` endpoint currently returns only the basic event
    fields; we therefore exercise the audit via a targeted call to the events
    list and assert the count of api_key_changed events for this key id.
    """
    from app.repositories.models.display_event import DisplayEvent
    from app.repositories.session import get_session

    _admin_login(api_client)
    body = _create_key(api_client, label="audit me")
    key_id = body["record"]["id"]

    api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    api_client.delete(f"/api/admin/api-keys/{key_id}")

    # Trigger a request to ensure the session is built, then read the same DB.
    api_client.get("/api/display/state")
    gen = api_client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        events = session.query(DisplayEvent).filter(
            DisplayEvent.entity_type == "api_key",
            DisplayEvent.entity_id == key_id,
        ).all()
        actions = {(e.event_type, e.event_metadata.get("action"), e.severity) for e in events}
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()
    expected = {
        ("api_key_changed", "create", "info"),
        ("api_key_changed", "rotate", "info"),
        ("api_key_changed", "revoke", "warning"),
    }
    assert actions == expected, f"got {actions}"