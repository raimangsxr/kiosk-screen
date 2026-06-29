from fastapi.testclient import TestClient


def test_event_branding_is_public_and_limited(api_client: TestClient):
    response = api_client.get("/api/event-branding")

    assert response.status_code == 200
    assert set(response.json()) == {
        "eventName",
        "organizerName",
        "organizerLogoUrl",
        "logoLayout",
        "eventNameLayout",
    }


def test_event_branding_reflects_saved_event_configuration(api_client: TestClient):
    login = api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert login.status_code == 200
    saved = api_client.put(
        "/api/event-configuration",
        data={
            "eventName": "Spring Summit 2026",
            "organizerName": "ACME Events",
            "eventDurationMinutes": "180",
        },
        files={"_": ("", b"")},
    )
    assert saved.status_code == 200

    response = api_client.get("/api/event-branding")

    assert response.status_code == 200
    assert response.json() == {
        "eventName": "Spring Summit 2026",
        "organizerName": "ACME Events",
        "organizerLogoUrl": None,
        "logoLayout": None,
        "eventNameLayout": None,
    }
