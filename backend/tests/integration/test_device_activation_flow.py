from __future__ import annotations

from fastapi.testclient import TestClient

from app.auth.session_store import activation_rate_limiter
from app.main import app


def login(client: TestClient, email: str, password: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password, "rememberMe": False},
    )
    assert response.status_code == 200


def test_device_activation_happy_path(api_client: TestClient) -> None:
    with TestClient(app) as kiosk:
        started = kiosk.post("/api/auth/device-activation/start")
        assert started.status_code == 200
        payload = started.json()
        user_code = payload["userCode"]
        device_code = payload["deviceCode"]
        assert len(user_code) == 6

        pending = kiosk.post(
            "/api/auth/device-activation/poll",
            json={"deviceCode": device_code},
        )
        assert pending.status_code == 200
        assert pending.json()["status"] == "pending"

        login(api_client, "operator@example.com", "operator")
        authorized = api_client.post(
            "/api/auth/device-activation/authorize",
            json={"userCode": user_code, "rememberMe": True},
        )
        assert authorized.status_code == 204

        polled = kiosk.post(
            "/api/auth/device-activation/poll",
            json={"deviceCode": device_code},
        )
        assert polled.status_code == 200
        body = polled.json()
        assert body["status"] == "authorized"
        assert body["user"]["email"] == "operator@example.com"

        me = kiosk.get("/api/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == "operator@example.com"


def test_poll_stays_pending_until_authorize(api_client: TestClient) -> None:
    with TestClient(app) as kiosk:
        started = kiosk.post("/api/auth/device-activation/start").json()
        device_code = started["deviceCode"]

        for _ in range(3):
            pending = kiosk.post(
                "/api/auth/device-activation/poll",
                json={"deviceCode": device_code},
            )
            assert pending.status_code == 200
            assert pending.json()["status"] == "pending"

        login(api_client, "admin@example.com", "admin")
        api_client.post(
            "/api/auth/device-activation/authorize",
            json={"userCode": started["userCode"], "rememberMe": False},
        )
        authorized = kiosk.post(
            "/api/auth/device-activation/poll",
            json={"deviceCode": device_code},
        )
        assert authorized.json()["status"] == "authorized"


def test_viewer_cannot_authorize(api_client: TestClient) -> None:
    with TestClient(app) as kiosk:
        started = kiosk.post("/api/auth/device-activation/start").json()
        login(api_client, "admin@example.com", "admin")
        created = api_client.post(
            "/api/users",
            json={
                "email": "viewer-flow@example.com",
                "displayName": "Viewer Flow",
                "isActive": True,
                "roles": ["display_viewer"],
                "password": "viewer-pass",
            },
        )
        assert created.status_code == 201
        api_client.post("/api/auth/logout")
        login(api_client, "viewer-flow@example.com", "viewer-pass")

        denied = api_client.post(
            "/api/auth/device-activation/authorize",
            json={"userCode": started["userCode"], "rememberMe": False},
        )
        assert denied.status_code == 403

        pending = kiosk.post(
            "/api/auth/device-activation/poll",
            json={"deviceCode": started["deviceCode"]},
        )
        assert pending.json()["status"] == "pending"


def test_authorize_rate_limit_returns_429(api_client: TestClient) -> None:
    activation_rate_limiter.reset("testclient")
    login(api_client, "operator@example.com", "operator")
    for _ in range(10):
        response = api_client.post(
            "/api/auth/device-activation/authorize",
            json={"userCode": "ZZZZZZ", "rememberMe": False},
        )
        assert response.status_code in {404, 422}
    blocked = api_client.post(
        "/api/auth/device-activation/authorize",
        json={"userCode": "ZZZZZZ", "rememberMe": False},
    )
    assert blocked.status_code == 429
    activation_rate_limiter.reset("testclient")
