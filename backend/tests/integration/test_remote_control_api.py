import pytest
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
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": True},
    )
    assert updated.status_code == 200
    assert updated.json()["contentMode"] == "loop"


def test_event_operator_can_read_and_update_remote_control_state(api_client: TestClient) -> None:
    login(api_client, "operator@example.com", "operator")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    read = api_client.get("/api/display/remote-control/state")
    update = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": True},
    )

    assert read.status_code == 200
    assert update.status_code == 200


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
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": False},
    )
    display_hidden = api_client.get("/api/display/state")

    restored = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": True},
    )

    assert hidden.status_code == 200
    assert hidden.json()["contentMode"] == "loop"
    assert hidden.json()["adsVisible"] is False
    assert display_hidden.status_code == 200
    assert display_hidden.json()["remoteControl"]["adsVisible"] is False
    assert restored.status_code == 200
    assert restored.json()["contentMode"] == "loop"
    assert restored.json()["adsVisible"] is True


def test_admin_can_issue_rotation_navigation_command(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    command = api_client.post("/api/display/remote-control/navigation", json={"command": "next"})
    state = api_client.get("/api/display/state")

    assert command.status_code == 200
    assert command.json()["navigationCommand"] == "next"
    assert command.json()["navigationCommandId"] is not None
    assert state.status_code == 200
    assert state.json()["remoteControl"]["navigationCommand"] == "next"
    assert state.json()["remoteControl"]["navigationCommandId"] == command.json()["navigationCommandId"]


@pytest.mark.parametrize("command", ["pause", "resume"])
def test_admin_can_issue_pause_and_resume_in_loop_mode(api_client: TestClient, command: str) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": command},
    )
    state = api_client.get("/api/display/state")

    assert response.status_code == 200
    assert response.json()["navigationCommand"] == command
    assert response.json()["navigationCommandId"] is not None
    assert state.status_code == 200
    assert state.json()["remoteControl"]["navigationCommand"] == command
    assert state.json()["remoteControl"]["navigationCommandId"] == response.json()["navigationCommandId"]


def test_pause_command_is_rejected_outside_loop_mode(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    iframe = api_client.post("/api/iframes", json={"url": "https://example.org/agenda"})
    assert iframe.status_code == 201
    selected = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "iframe", "selectedIframeId": iframe.json()["id"], "adsVisible": True},
    )
    assert selected.status_code == 200

    pause = api_client.post("/api/display/remote-control/navigation", json={"command": "pause"})
    resume = api_client.post("/api/display/remote-control/navigation", json={"command": "resume"})

    assert pause.status_code == 400
    assert "Pause/Resume solo es válido en modo rotación." in pause.json()["detail"]
    assert resume.status_code == 400
    assert "Pause/Resume solo es válido en modo rotación." in resume.json()["detail"]


def test_navigation_command_requires_rotation_mode(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    iframe = api_client.post("/api/iframes", json={"url": "https://example.org/agenda"})
    assert iframe.status_code == 201
    selected = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "iframe", "selectedIframeId": iframe.json()["id"], "adsVisible": True},
    )
    assert selected.status_code == 200

    command = api_client.post("/api/display/remote-control/navigation", json={"command": "next"})

    assert command.status_code == 400


def test_admin_can_issue_jump_to_command(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    top_content = opened.json()["topContent"]
    assert len(top_content) >= 1
    target_id = top_content[0]["id"]

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to", "targetContentId": target_id},
    )
    state = api_client.get("/api/display/state")

    assert response.status_code == 200
    assert response.json()["navigationCommand"] == "jump_to"
    assert response.json()["jumpToContentId"] == target_id
    assert response.json()["navigationCommandId"] is not None
    assert state.status_code == 200
    assert state.json()["remoteControl"]["navigationCommand"] == "jump_to"
    assert state.json()["remoteControl"]["jumpToContentId"] == target_id


def test_jump_to_command_is_rejected_outside_loop_mode(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200
    target_id = opened.json()["topContent"][0]["id"]

    iframe = api_client.post("/api/iframes", json={"url": "https://example.org/agenda"})
    assert iframe.status_code == 201
    selected = api_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "iframe", "selectedIframeId": iframe.json()["id"], "adsVisible": True},
    )
    assert selected.status_code == 200

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to", "targetContentId": target_id},
    )

    assert response.status_code == 400
    assert "Jump-to requires rotation mode." in response.json()["detail"]


def test_jump_to_command_rejects_unknown_target(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to", "targetContentId": "00000000-0000-0000-0000-000000000000"},
    )

    assert response.status_code == 400
    assert "Selected content is not available." in response.json()["detail"]


def test_jump_to_command_rejects_fixed_target(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    created = api_client.post(
        "/api/content",
        json={
            "title": "Sponsor Pin",
            "contentType": "photo",
            "sourceReference": "https://example.com/sponsor.jpg",
            "isActive": True,
            "displayOrder": 10,
            "durationSeconds": 10,
            "isFixed": True,
        },
    )
    assert created.status_code == 201
    target_id = created.json()["id"]

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to", "targetContentId": target_id},
    )

    assert response.status_code == 400
    assert "Fixed content cannot be a jump target." in response.json()["detail"]


def test_jump_to_command_requires_target(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200

    response = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to"},
    )

    assert response.status_code == 400
    assert "Jump-to requires a target content id." in response.json()["detail"]


def test_next_command_clears_previous_jump_to(api_client: TestClient) -> None:
    login(api_client, "admin@example.com", "admin")
    opened = api_client.post("/api/display/open")
    assert opened.status_code == 200
    target_id = opened.json()["topContent"][0]["id"]

    jump = api_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "jump_to", "targetContentId": target_id},
    )
    assert jump.status_code == 200
    assert jump.json()["jumpToContentId"] == target_id

    next_command = api_client.post("/api/display/remote-control/navigation", json={"command": "next"})

    assert next_command.status_code == 200
    assert next_command.json()["navigationCommand"] == "next"
    assert next_command.json()["jumpToContentId"] is None


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
