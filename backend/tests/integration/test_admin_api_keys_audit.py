"""Audit-trail tests for /api/admin/api-keys/* (spec 009 US5, FR-022A).

Each admin action on an API key MUST produce exactly one DisplayEvent with:
- event_type = "api_key_changed"
- entity_type = "api_key"
- entity_id = <key_id>
- created_by_user_id = <admin_user_id>
- event_metadata = {"action": "create"|"rotate"|"revoke", "key_label": "<label>"}
- severity = "info" for create/rotate, "warning" for revoke

Failed actions (409 on rotate-revoked, 404 on unknown id) MUST NOT create
events. The second call of an idempotent revoke is a no-op and MUST NOT
create a duplicate event.
"""
import pytest
from fastapi.testclient import TestClient

from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.user import User
from app.repositories.session import get_session


SECRET_KEYS = {"password", "token", "secret", "session"}


def _admin_login(client: TestClient) -> None:
    r = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert r.status_code == 200, r.text


def _create_key(client: TestClient, label: str) -> dict:
    r = client.post("/api/admin/api-keys", json={"label": label})
    assert r.status_code == 201, r.text
    return r.json()


def _admin_user_id(client: TestClient) -> str:
    """Read the seed admin's user id from the same in-memory DB the client uses."""
    client.get("/api/display/state")
    gen = client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        admin = session.query(User).filter(User.email == "admin@example.com").one()
        admin_id = admin.id
        session.expunge_all()
        return admin_id
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()


def _api_key_events(client: TestClient, key_id: str) -> list[DisplayEvent]:
    client.get("/api/display/state")
    gen = client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        events = (
            session.query(DisplayEvent)
            .filter(
                DisplayEvent.event_type == "api_key_changed",
                DisplayEvent.entity_type == "api_key",
                DisplayEvent.entity_id == key_id,
            )
            .order_by(DisplayEvent.created_at.asc())
            .all()
        )
        session.expunge_all()
        return events
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()


def _assert_secret_free(metadata: dict | None) -> None:
    """FR-022A: the event payload is a non-secret payload. The raw key and
    the hash MUST NOT appear."""
    assert metadata is not None
    lower_keys = {k.lower() for k in metadata}
    assert lower_keys.isdisjoint(SECRET_KEYS), f"secret keys leaked: {lower_keys}"
    for value in metadata.values():
        assert not isinstance(value, str) or not value.startswith("ksk_live_"), \
            "raw key value leaked into event metadata"


# --- create action ----------------------------------------------------------


def test_create_records_single_event_with_info_severity(api_client: TestClient):
    _admin_login(api_client)
    admin_id = _admin_user_id(api_client)

    body = _create_key(api_client, label="audit-create")
    key_id = body["record"]["id"]

    events = _api_key_events(api_client, key_id)
    assert len(events) == 1, f"expected exactly 1 event, got {len(events)}"
    event = events[0]
    assert event.event_type == "api_key_changed"
    assert event.entity_type == "api_key"
    assert event.entity_id == key_id
    assert event.created_by_user_id == admin_id
    assert event.severity == "info"
    assert event.event_metadata == {"action": "create", "key_label": "audit-create"}
    _assert_secret_free(event.event_metadata)


# --- rotate action ----------------------------------------------------------


def test_rotate_records_single_event_with_info_severity(api_client: TestClient):
    _admin_login(api_client)
    admin_id = _admin_user_id(api_client)
    body = _create_key(api_client, label="audit-rotate")
    key_id = body["record"]["id"]

    # Clear the create event so we measure only the rotate one.
    rotate_resp = api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    assert rotate_resp.status_code == 200, rotate_resp.text

    # We expect the create event plus the rotate event.
    events = _api_key_events(api_client, key_id)
    assert len(events) == 2
    rotate_event = events[-1]
    assert rotate_event.event_type == "api_key_changed"
    assert rotate_event.entity_id == key_id
    assert rotate_event.created_by_user_id == admin_id
    assert rotate_event.severity == "info"
    assert rotate_event.event_metadata == {"action": "rotate", "key_label": "audit-rotate"}
    _assert_secret_free(rotate_event.event_metadata)


# --- revoke action ----------------------------------------------------------


def test_revoke_records_single_event_with_warning_severity(api_client: TestClient):
    _admin_login(api_client)
    admin_id = _admin_user_id(api_client)
    body = _create_key(api_client, label="audit-revoke")
    key_id = body["record"]["id"]

    revoke_resp = api_client.delete(f"/api/admin/api-keys/{key_id}")
    assert revoke_resp.status_code == 204

    events = _api_key_events(api_client, key_id)
    # create + revoke
    assert len(events) == 2
    revoke_event = events[-1]
    assert revoke_event.event_type == "api_key_changed"
    assert revoke_event.entity_id == key_id
    assert revoke_event.created_by_user_id == admin_id
    assert revoke_event.severity == "warning"
    assert revoke_event.event_metadata == {"action": "revoke", "key_label": "audit-revoke"}
    _assert_secret_free(revoke_event.event_metadata)


# --- idempotent revoke: second call MUST NOT create a duplicate event ------


def test_revoke_is_idempotent_audit_wise(api_client: TestClient):
    _admin_login(api_client)
    body = _create_key(api_client, label="idempotent revoke")
    key_id = body["record"]["id"]

    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204
    after_first = _api_key_events(api_client, key_id)
    # create + revoke = 2 events.
    assert len(after_first) == 2

    # Second call is a no-op; no new event.
    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204
    after_second = _api_key_events(api_client, key_id)
    assert len(after_second) == 2


# --- failed actions MUST NOT create events ---------------------------------


def test_rotate_revoked_records_no_event(api_client: TestClient):
    """409 on rotate-revoked MUST NOT create an api_key_changed event."""
    _admin_login(api_client)
    body = _create_key(api_client, label="rotate-after-revoke")
    key_id = body["record"]["id"]

    assert api_client.delete(f"/api/admin/api-keys/{key_id}").status_code == 204
    after_revoke = _api_key_events(api_client, key_id)
    # create + revoke = 2 events; the failed rotate must not add a third.
    assert len(after_revoke) == 2

    resp = api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    assert resp.status_code == 409
    assert resp.json()["code"] == "api_key_revoked"

    after_failed_rotate = _api_key_events(api_client, key_id)
    assert len(after_failed_rotate) == 2


def test_rotate_unknown_records_no_event(api_client: TestClient):
    _admin_login(api_client)
    before = _api_key_events(api_client, "00000000-0000-0000-0000-000000000000")
    assert before == []

    resp = api_client.post("/api/admin/api-keys/00000000-0000-0000-0000-000000000000/rotate")
    assert resp.status_code in (400, 404)

    after = _api_key_events(api_client, "00000000-0000-0000-0000-000000000000")
    assert after == []


def test_revoke_unknown_records_no_event(api_client: TestClient):
    _admin_login(api_client)
    resp = api_client.delete("/api/admin/api-keys/00000000-0000-0000-0000-000000000000")
    assert resp.status_code in (400, 404)
    after = _api_key_events(api_client, "00000000-0000-0000-0000-000000000000")
    assert after == []


# --- create rejected on invalid input: no event ----------------------------


def test_create_invalid_label_records_no_event(api_client: TestClient):
    _admin_login(api_client)
    bad = api_client.post("/api/admin/api-keys", json={"label": ""})
    assert bad.status_code == 400
    bad2 = api_client.post("/api/admin/api-keys", json={"label": "x" * 121})
    assert bad2.status_code == 400

    # No event with entity_type=api_key should have been created.
    client = api_client
    client.get("/api/display/state")
    gen = client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        count = session.query(DisplayEvent).filter(
            DisplayEvent.event_type == "api_key_changed"
        ).count()
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()
    assert count == 0


# --- queryable by entityId -------------------------------------------------


def test_events_are_queryable_by_entity_id(api_client: TestClient):
    """The contract notes that events are queryable by entityId to reconstruct
    the full history of a key. We create, rotate, and revoke a key, then
    assert that filtering DisplayEvent by entity_id returns the full
    ordered trail."""
    _admin_login(api_client)
    body = _create_key(api_client, label="full history")
    key_id = body["record"]["id"]

    api_client.post(f"/api/admin/api-keys/{key_id}/rotate")
    api_client.delete(f"/api/admin/api-keys/{key_id}")

    events = _api_key_events(api_client, key_id)
    actions_in_order = [e.event_metadata["action"] for e in events]
    assert actions_in_order == ["create", "rotate", "revoke"]
    severities_in_order = [e.severity for e in events]
    assert severities_in_order == ["info", "info", "warning"]
