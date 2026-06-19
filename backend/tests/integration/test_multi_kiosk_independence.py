"""Multi-kiosk independence integration test (spec 009 US3, SC-008).

Two polling clients on the same org must both see the new item independently
and the server's response payload must be byte-identical for both clients
(no per-client state coupling).
"""
import json

from fastapi.testclient import TestClient


def _create_key_via_admin(api_client: TestClient) -> str:
    """Create a key via the admin endpoint and return the raw key."""
    response = api_client.post("/api/admin/api-keys", json={"label": "multi-kiosk"})
    assert response.status_code == 201, response.text
    return response.json()["rawKey"]


def test_two_clients_polling_get_independent_state(api_client: TestClient):
    # Login as admin and create an API key.
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    raw = _create_key_via_admin(api_client)

    # Both clients fetch the display state.
    state_a = api_client.get("/api/display/state")
    state_b = api_client.get("/api/display/state")
    assert state_a.status_code == 200
    assert state_b.status_code == 200
    initial_ids = {item["id"] for item in state_a.json()["topContent"]}
    assert {item["id"] for item in state_b.json()["topContent"]} == initial_ids

    # Upload a new item via the public API.
    upload = api_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw}"},
        data={"title": "new arrival"},
        files={"file": ("hi.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert upload.status_code == 201, upload.text
    new_id = upload.json()["id"]

    # Both clients re-fetch the state and see the new item.
    state_a2 = api_client.get("/api/display/state")
    state_b2 = api_client.get("/api/display/state")
    ids_a = {item["id"] for item in state_a2.json()["topContent"]}
    ids_b = {item["id"] for item in state_b2.json()["topContent"]}
    assert new_id in ids_a
    assert new_id in ids_b
    # The two responses are byte-identical.
    assert json.dumps(state_a2.json(), sort_keys=True) == json.dumps(state_b2.json(), sort_keys=True)


def test_two_kiosks_drain_their_own_queues_independently(api_client: TestClient):
    """The server returns the same state to all clients; per-client queue
    state is the client-side rotation service's responsibility. This test
    asserts the server does not leak per-client state.
    """
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    _create_key_via_admin(api_client)

    state1 = api_client.get("/api/display/state").json()
    state2 = api_client.get("/api/display/state").json()

    ids1 = [item["id"] for item in state1["topContent"]]
    ids2 = [item["id"] for item in state2["topContent"]]
    assert ids1 == ids2

    # The response does NOT include per-client state.
    for key in ("currentItemId", "noveltyQueue", "clientCursor", "kioskSessionId"):
        assert key not in state1
        assert key not in state2