"""Audit-trail tests for POST /api/public/content/upload (spec 009 US5).

Covers FR-014 (content_changed DisplayEvent with source=public_api),
FR-015 (lastUsedAt only on 201), and the no-overlay/quiet-kiosk contract
asserted by the display component spec (T032). The kiosk-side assertion is
implicit: the backend never returns any visual cue payload, and the
frontend display component spec guarantees no overlay/toast/badge is
rendered on poll.
"""
import secrets

import pytest
from fastapi.testclient import TestClient

from app.repositories.models.display_event import DisplayEvent
from app.repositories.session import get_session


PNG_BYTES = b"\x89PNG\r\n\x1a\n"


def _generate_raw_key() -> str:
    body = secrets.token_urlsafe(8)
    return f"ksk_live_{body}_{secrets.token_urlsafe(24)}"


def _admin_login(client: TestClient) -> None:
    r = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert r.status_code == 200, r.text


def _create_key(client: TestClient, label: str) -> dict:
    r = client.post("/api/admin/api-keys", json={"label": label})
    assert r.status_code == 201, r.text
    return r.json()


def _content_changed_events(client: TestClient) -> list[DisplayEvent]:
    """Read all content_changed events for the seed organization from the
    same in-memory DB the test client uses."""
    # Force the dependency override to be materialised so we share the engine.
    client.get("/api/display/state")
    gen = client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        events = (
            session.query(DisplayEvent)
            .filter(
                DisplayEvent.event_type == "content_changed",
            )
            .order_by(DisplayEvent.created_at.asc())
            .all()
        )
        # Detach so the session can be closed without losing the data.
        session.expunge_all()
        return events
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()


def _api_key_last_used(client: TestClient, key_id: str):
    gen = client.app.dependency_overrides[get_session]()
    session = next(gen)
    try:
        from app.repositories.models.api_key import ApiKey

        record = session.query(ApiKey).filter(ApiKey.id == key_id).one_or_none()
        last_used = record.last_used_at if record is not None else None
        session.expunge_all()
        return last_used
    finally:
        try:
            next(gen)
        except StopIteration:
            pass
        session.close()


@pytest.fixture
def public_api_key(api_client: TestClient) -> tuple[dict, str]:
    _admin_login(api_client)
    body = _create_key(api_client, label="audit fixture")
    return body["record"], body["rawKey"]


# --- FR-014: content_changed event on success ---------------------------------


def test_public_upload_records_content_changed_event_with_source(
    api_client: TestClient, public_api_key
):
    """A successful public upload MUST produce exactly one content_changed
    DisplayEvent with event_metadata->>'source'='public_api' and
    event_metadata->>'api_key_id'=<key_id>.
    """
    record, raw = public_api_key
    key_id = record["id"]

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Audited upload"},
        files={"file": ("audited.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    new_item_id = response.json()["id"]

    events = _content_changed_events(api_client)
    matching = [e for e in events if e.entity_id == new_item_id]
    assert len(matching) == 1, f"expected 1 event, got {len(matching)}"
    event = matching[0]
    assert event.event_type == "content_changed"
    assert event.entity_type == "top_content"
    assert event.severity == "info"
    assert event.event_metadata is not None
    assert event.event_metadata.get("source") == "public_api"
    assert event.event_metadata.get("api_key_id") == key_id
    assert event.created_by_user_id is None


def test_public_upload_event_message_identifies_source(
    api_client: TestClient, public_api_key
):
    """The event message is the operator-visible audit description and must
    reflect that the upload came from the public API."""
    _record, raw = public_api_key
    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "Operator log"},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    item_id = response.json()["id"]

    events = [e for e in _content_changed_events(api_client) if e.entity_id == item_id]
    assert len(events) == 1
    assert "public API" in events[0].message


# --- FR-014: no event on error paths -----------------------------------------


def test_public_upload_records_no_event_on_400(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    before = _content_changed_events(api_client)

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": ""},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 400

    after = _content_changed_events(api_client)
    assert len(after) == len(before), "no event should be created on 400"


def test_public_upload_records_no_event_on_401(api_client: TestClient):
    before = _content_changed_events(api_client)

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {_generate_raw_key()}"},
        data={"title": "x"},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 401

    after = _content_changed_events(api_client)
    assert len(after) == len(before), "no event should be created on 401"


def test_public_upload_records_no_event_on_403(api_client: TestClient, public_api_key):
    """After revoking a key, a subsequent attempt MUST NOT record a
    content_changed event (FR-014 only fires on success)."""
    record, raw = public_api_key
    _admin_login(api_client)
    revoke_resp = api_client.delete(f"/api/admin/api-keys/{record['id']}")
    assert revoke_resp.status_code == 204

    before = _content_changed_events(api_client)

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "x"},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "inactive_api_key"

    after = _content_changed_events(api_client)
    assert len(after) == len(before), "no event should be created on 403"


def test_public_upload_records_no_event_on_415(api_client: TestClient, public_api_key):
    _record, raw = public_api_key
    before = _content_changed_events(api_client)

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "x"},
        files={"file": ("doc.html", b"<html></html>", "text/html")},
    )
    assert response.status_code == 415

    after = _content_changed_events(api_client)
    assert len(after) == len(before), "no event should be created on 415"


def test_public_upload_records_no_event_on_413(api_client: TestClient, public_api_key, monkeypatch):
    _record, raw = public_api_key
    from app.domain.media import MediaValidationLimits
    from app.services import media_storage_service as mss

    real_validate = mss.validate_media_upload

    def patched_validate(media_type, content_type, file_size_bytes, limits):
        tiny = MediaValidationLimits(image_max_bytes=4, video_max_bytes=limits.video_max_bytes)
        return real_validate(media_type, content_type, file_size_bytes, tiny)

    mss.validate_media_upload = patched_validate
    try:
        before = _content_changed_events(api_client)
        response = api_client.post(
            "/api/public/content/upload",
            headers={"Authorization": f"Bearer {raw}"},
            data={"title": "x"},
            files={"file": ("x.png", PNG_BYTES, "image/png")},
        )
        assert response.status_code == 413
        after = _content_changed_events(api_client)
        assert len(after) == len(before), "no event should be created on 413"
    finally:
        mss.validate_media_upload = real_validate


# --- FR-015: lastUsedAt semantics combined with FR-014 ----------------------


def test_public_upload_last_used_only_on_201(api_client: TestClient, public_api_key):
    """Combined FR-015 + US5 acceptance scenario 1: the operator can confirm
    the upload by checking the key's lastUsedAt AND the content_changed
    event. Both signals must appear together, and only on 201."""
    record, raw = public_api_key
    key_id = record["id"]
    assert _api_key_last_used(api_client, key_id) is None

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "x"},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    item_id = response.json()["id"]

    # Both signals present.
    assert _api_key_last_used(api_client, key_id) is not None
    events = [e for e in _content_changed_events(api_client) if e.entity_id == item_id]
    assert len(events) == 1
    assert events[0].event_metadata.get("source") == "public_api"


def test_public_upload_failed_400_leaves_no_audit_trail(api_client: TestClient, public_api_key):
    """On 4xx, neither lastUsedAt nor a content_changed event is updated."""
    record, raw = public_api_key
    key_id = record["id"]
    events_before = _content_changed_events(api_client)
    used_before = _api_key_last_used(api_client, key_id)
    assert used_before is None

    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": ""},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 400

    assert _api_key_last_used(api_client, key_id) is None
    assert _content_changed_events(api_client) == events_before


def test_public_upload_no_visual_cue_in_response(api_client: TestClient, public_api_key):
    """Backend contract: the 201 response carries only the ContentItemSchema.
    There is no overlay/toast/badge payload — the kiosk is silent (US5
    acceptance scenario 3, asserted end-to-end by the display component
    spec T032)."""
    _record, raw = public_api_key
    response = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "x"},
        files={"file": ("x.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201
    body = response.json()
    # The response is exactly the content item shape — no notification payload.
    forbidden_keys = {"overlay", "toast", "badge", "notification"}
    assert forbidden_keys.isdisjoint(body.keys())
