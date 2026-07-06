import pytest
from fastapi.testclient import TestClient

from app.auth.service import verify_password
from app.repositories.models.user import User
from app.services.admin_service import AdminService
from app.api.schemas import CreateUserRequest


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def test_create_user_requires_initial_password(api_client: TestClient) -> None:
    _login(api_client, "admin@example.com", "admin")

    missing_password = api_client.post(
        "/api/users",
        json={
            "email": "newop@example.com",
            "displayName": "New Op",
            "isActive": True,
            "roles": ["event_operator"],
        },
    )
    assert missing_password.status_code == 422

    weak_password = api_client.post(
        "/api/users",
        json={
            "email": "newop@example.com",
            "displayName": "New Op",
            "isActive": True,
            "roles": ["event_operator"],
            "password": "short",
        },
    )
    assert weak_password.status_code == 422


def test_create_user_with_password_allows_login(api_client: TestClient) -> None:
    _login(api_client, "admin@example.com", "admin")

    created = api_client.post(
        "/api/users",
        json={
            "email": "newop@example.com",
            "displayName": "New Op",
            "isActive": True,
            "roles": ["event_operator"],
            "password": "secure-pass-1",
        },
    )
    assert created.status_code == 201

    api_client.post("/api/auth/logout")
    legacy = api_client.post(
        "/api/auth/login",
        json={"email": "newop@example.com", "password": "change-me"},
    )
    assert legacy.status_code == 401

    login = api_client.post(
        "/api/auth/login",
        json={"email": "newop@example.com", "password": "secure-pass-1"},
    )
    assert login.status_code == 200


def test_admin_can_reset_user_password(api_client: TestClient) -> None:
    _login(api_client, "admin@example.com", "admin")
    created = api_client.post(
        "/api/users",
        json={
            "email": "resetme@example.com",
            "displayName": "Reset Me",
            "isActive": True,
            "roles": ["display_viewer"],
            "password": "initial-pass-1",
        },
    )
    assert created.status_code == 201
    user_id = created.json()["id"]

    reset = api_client.put(f"/api/users/{user_id}/password", json={"password": "reset-pass-2"})
    assert reset.status_code == 204

    api_client.post("/api/auth/logout")
    old_login = api_client.post(
        "/api/auth/login",
        json={"email": "resetme@example.com", "password": "initial-pass-1"},
    )
    assert old_login.status_code == 401

    new_login = api_client.post(
        "/api/auth/login",
        json={"email": "resetme@example.com", "password": "reset-pass-2"},
    )
    assert new_login.status_code == 200


def test_user_can_change_own_password(api_client: TestClient) -> None:
    _login(api_client, "admin@example.com", "admin")
    created = api_client.post(
        "/api/users",
        json={
            "email": "selfserve@example.com",
            "displayName": "Self Serve",
            "isActive": True,
            "roles": ["display_viewer"],
            "password": "start-pass-1",
        },
    )
    assert created.status_code == 201

    api_client.post("/api/auth/logout")
    _login(api_client, "selfserve@example.com", "start-pass-1")

    wrong_current = api_client.post(
        "/api/auth/change-password",
        json={"currentPassword": "wrong-pass", "newPassword": "updated-pass"},
    )
    assert wrong_current.status_code == 400
    body = wrong_current.json()
    assert body["code"] == "password_change_failed"
    assert "password" not in body["message"].lower() or "current" in body["message"].lower()

    changed = api_client.post(
        "/api/auth/change-password",
        json={"currentPassword": "start-pass-1", "newPassword": "updated-pass"},
    )
    assert changed.status_code == 204

    api_client.post("/api/auth/logout")
    assert api_client.post(
        "/api/auth/login",
        json={"email": "selfserve@example.com", "password": "start-pass-1"},
    ).status_code == 401
    assert api_client.post(
        "/api/auth/login",
        json={"email": "selfserve@example.com", "password": "updated-pass"},
    ).status_code == 200


def test_weak_password_rejected_on_admin_reset(api_client: TestClient) -> None:
    _login(api_client, "admin@example.com", "admin")
    users = api_client.get("/api/users")
    user_id = users.json()[0]["id"]

    response = api_client.put(f"/api/users/{user_id}/password", json={"password": "tiny"})
    assert response.status_code == 422


def test_create_user_does_not_use_legacy_default_password(db_session) -> None:
    from app.services.bootstrap_service import bootstrap_mvp_data

    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdminService(db_session)
    user, _roles = service.create_user(
        result.organization.id,
        result.administrator.id,
        CreateUserRequest(
            email="viewer@example.com",
            displayName="Viewer",
            roles=["display_viewer"],
            isActive=True,
            password="chosen-pass",
        ),
    )
    assert verify_password("chosen-pass", user.password_hash)
    assert verify_password("change-me", user.password_hash) is False
