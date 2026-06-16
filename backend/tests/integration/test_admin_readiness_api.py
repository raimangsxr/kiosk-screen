from fastapi.testclient import TestClient


def test_admin_readiness_configuration_domains_events_and_users(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    assert api_client.get("/api/readiness").status_code == 200
    configuration = api_client.get("/api/display/configuration")
    assert configuration.status_code == 200

    updated = api_client.put("/api/display/configuration", json={
        "name": "Main Kiosk",
        "defaultTopDurationSeconds": 20,
        "defaultAdDurationSeconds": 12,
        "configuredEventDurationMinutes": 180,
        "isEnabled": True
    })
    assert updated.status_code == 200
    assert updated.json()["configuredEventDurationMinutes"] == 180

    domain = api_client.post("/api/approved-domains", json={"domain": "example.org", "isActive": True})
    assert domain.status_code == 201
    assert api_client.get("/api/approved-domains").status_code == 200
    assert api_client.get("/api/events").status_code == 200
    assert api_client.get("/api/users").status_code == 200

    user = api_client.post("/api/users", json={
        "email": "new@example.com",
        "displayName": "New User",
        "roles": ["display_viewer"],
        "isActive": True
    })
    assert user.status_code == 201
    assert user.json()["roles"] == ["display_viewer"]
