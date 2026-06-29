import json

from fastapi.testclient import TestClient


def _login(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert response.status_code == 200


def test_get_and_put_event_configuration(api_client: TestClient):
    _login(api_client)

    initial = api_client.get("/api/event-configuration")
    assert initial.status_code == 200
    assert initial.json()["eventDurationMinutes"] == 240

    updated = api_client.put(
        "/api/event-configuration",
        data={
            "eventName": "Spring Summit 2026",
            "organizerName": "ACME Events",
            "eventDurationMinutes": "180",
        },
        files={"_": ("", b"")},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["eventName"] == "Spring Summit 2026"
    assert body["organizerName"] == "ACME Events"
    assert body["eventDurationMinutes"] == 180

    events = api_client.get("/api/events").json()
    assert any(event["eventType"] == "event_configuration_changed" for event in events)


def test_event_configuration_rejects_ambiguous_logo_intent(api_client: TestClient):
    _login(api_client)

    response = api_client.put(
        "/api/event-configuration",
        data={"eventDurationMinutes": "180", "removeLogo": "true"},
        files={"file": ("logo.png", b"png", "image/png")},
    )

    assert response.status_code == 400
    assert "must not both be set" in response.json()["detail"]


def test_event_configuration_rejects_bad_logo_type(api_client: TestClient):
    _login(api_client)

    response = api_client.put(
        "/api/event-configuration",
        data={"eventDurationMinutes": "180"},
        files={"file": ("logo.bmp", b"bitmap", "image/bmp")},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_event_configuration_round_trip_logo_layout(api_client: TestClient):
    """CHG-023 US1 / T017 — valid logoLayout round-trips via PUT / GET."""
    _login(api_client)

    logo_payload = {"size": 4, "x": 2, "y": 0, "transparency": 80, "borderRadius": 2}
    response = api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "logoLayout": json.dumps(logo_payload),
        },
        files={"_": ("", b"")},
    )
    assert response.status_code == 200
    assert response.json()["logoLayout"] == logo_payload

    fetched = api_client.get("/api/event-configuration")
    assert fetched.status_code == 200
    assert fetched.json()["logoLayout"] == logo_payload


def test_event_configuration_round_trip_event_name_layout(api_client: TestClient):
    """CHG-023 US2 / T022 — valid eventNameLayout round-trips via PUT / GET."""
    _login(api_client)

    event_name_payload = {"size": 2, "x": 60, "y": 1, "transparency": 90, "borderRadius": 8}
    response = api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "eventNameLayout": json.dumps(event_name_payload),
        },
        files={"_": ("", b"")},
    )
    assert response.status_code == 200
    assert response.json()["eventNameLayout"] == event_name_payload

    fetched = api_client.get("/api/event-configuration")
    assert fetched.json()["eventNameLayout"] == event_name_payload


def test_event_configuration_rejects_out_of_range_logo_layout(api_client: TestClient):
    """CHG-023 US4 / T028 — Pydantic range violation surfaces as HTTP 400 with field-keyed detail."""
    _login(api_client)

    response = api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "logoLayout": json.dumps({"size": 999}),
        },
        files={"_": ("", b"")},
    )
    assert response.status_code == 400
    assert "logoLayout" in response.json()["detail"]


def test_event_configuration_rejects_out_of_range_event_name_layout(api_client: TestClient):
    """CHG-023 US4 — range violation on event-name fields surfaces as HTTP 400 with field-keyed detail."""
    _login(api_client)

    response = api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "eventNameLayout": json.dumps({"transparency": 150}),
        },
        files={"_": ("", b"")},
    )
    assert response.status_code == 400
    assert "eventNameLayout" in response.json()["detail"]


def test_event_configuration_layout_none_round_trip(api_client: TestClient):
    """CHG-023 US5 — sending null layout clears the column so the kiosko falls back to defaults."""
    _login(api_client)

    api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "logoLayout": json.dumps({"size": 12}),
        },
        files={"_": ("", b"")},
    )

    api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "logoLayout": "null",
        },
        files={"_": ("", b"")},
    )

    fetched = api_client.get("/api/event-configuration").json()
    assert fetched["logoLayout"] is None


def test_event_configuration_layout_in_audit_event(api_client: TestClient):
    """CHG-023 T017/T022 — every layout change emits an `event_configuration_changed` event.

    The full `changedFields` payload lives in the row's
    `event_events.metadata` column (internal audit trail); the
    integration surface only exposes the event envelope. The
    service-level helper `_event_metadata` is covered by the
    EventConfigurationService unit tests.
    """
    _login(api_client)

    api_client.put(
        "/api/event-configuration",
        data={
            "eventDurationMinutes": "180",
            "logoLayout": json.dumps({"size": 8}),
            "eventNameLayout": json.dumps({"size": 2}),
        },
        files={"_": ("", b"")},
    )

    events = api_client.get("/api/events").json()
    assert any(
        event["eventType"] == "event_configuration_changed"
        and event["severity"] == "info"
        for event in events
    )
