from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def test_admin_reads_and_updates_remote_control_state(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    state = api_client.get("/api/display/remote-control/state")
    assert state.status_code == 200
    assert state.json()["contentMode"] == "loop"
    assert state.json()["adsVisible"] is True

    options = api_client.get("/api/display/remote-control/iframe-options")
    assert options.status_code == 200
    assert "items" in options.json()

    updated = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedContentId": None, "adsVisible": True},
    )
    assert updated.status_code == 200
    assert updated.json()["contentMode"] == "loop"


def test_non_admin_cannot_read_or_update_remote_control_state(api_client: TestClient) -> None:
    login(api_client, "operator@example.com", "operator")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    read = api_client.get("/api/display/remote-control/state")
    update = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedContentId": None, "adsVisible": True},
    )

    assert read.status_code == 403
    assert update.status_code == 403


def test_display_state_includes_remote_control_snapshot(api_client: TestClient) -> None:
    login(api_client, "operator@example.com", "operator")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    state = api_client.get("/api/display/state")

    assert state.status_code == 200
    assert state.json()["remoteControl"]["contentMode"] == "loop"
    assert state.json()["remoteControl"]["adsVisible"] is True


def test_admin_can_hide_and_restore_ads_without_changing_content_mode(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    hidden = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedContentId": None, "adsVisible": False},
    )
    display_hidden = api_client.get("/api/display/state")

    restored = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedContentId": None, "adsVisible": True},
    )

    assert hidden.status_code == 200
    assert hidden.json()["contentMode"] == "loop"
    assert hidden.json()["adsVisible"] is False
    assert display_hidden.status_code == 200
    assert display_hidden.json()["remoteControl"]["adsVisible"] is False
    assert restored.status_code == 200
    assert restored.json()["contentMode"] == "loop"
    assert restored.json()["adsVisible"] is True


def test_display_state_reflects_configuration_update_without_reopening_display(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    updated = api_client.put(
        "/api/display/configuration",
        json={
            "name": "Main Kiosk",
            "defaultTopDurationSeconds": 7,
            "defaultAdDurationSeconds": 6,
            "defaultTopRotationAnimation": "slide",
            "defaultAdRotationAnimation": "fade",
            "defaultTopAnimationDurationMilliseconds": 250,
            "defaultAdAnimationDurationMilliseconds": 200,
            "inlineAdCount": 1,
            "remoteControlPollingSeconds": 1,
            "configuredEventDurationMinutes": 180,
            "isEnabled": True,
        },
    )
    state = api_client.get("/api/display/state")

    assert updated.status_code == 200
    assert state.status_code == 200
    assert state.json()["configuration"]["defaultTopDurationSeconds"] == 7
    assert state.json()["configuration"]["defaultTopRotationAnimation"] == "slide"
    assert state.json()["configuration"]["remoteControlPollingSeconds"] == 1
