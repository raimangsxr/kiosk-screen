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
