from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.session_service import issue_user_session, resolve_authenticated_user_id, revoke_user_session
from app.auth.session_store import (
    login_rate_limiter,
    parse_signed_session_cookie_value,
    sign_session_cookie_value,
)
from app.config import Settings, get_settings, validate_production_settings
from app.repositories.models.organization import Organization
from app.repositories.models.user import User
from app.repositories.models.user_auth_session import UserAuthSession


def test_sign_and_parse_session_cookie_value():
    secret = "test-secret"
    signed = sign_session_cookie_value("session-abc", secret)
    assert parse_signed_session_cookie_value(signed, secret) == "session-abc"
    assert parse_signed_session_cookie_value("session-abc", secret) is None
    assert parse_signed_session_cookie_value("session-abc.bad-sig", secret) is None


def test_validate_production_settings_rejects_defaults(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SESSION_SECRET", "development-only-session-secret")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "admin")
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        validate_production_settings(get_settings())


def test_validate_production_settings_allows_custom_secrets(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SESSION_SECRET", "prod-session-secret-value")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "strong-bootstrap-password")
    validate_production_settings(get_settings())


def test_login_rate_limiter_blocks_after_threshold():
    login_rate_limiter.reset("test-client")
    base = 1_000.0
    for _ in range(10):
        login_rate_limiter.record_failure("test-client", now=base)
    assert login_rate_limiter.is_limited("test-client", now=base + 1) is True
    login_rate_limiter.reset("test-client")


def test_db_session_survives_without_in_memory_store(db_session: Session):
    settings = Settings(
        database_url="sqlite://",
        session_secret="unit-test-secret",
        app_env="development",
        frontend_origin="http://localhost",
        bootstrap_admin_email="admin@example.com",
        bootstrap_admin_password="admin",
        bootstrap_admin_display_name="Admin",
    )
    organization = Organization(name="Test Org")
    db_session.add(organization)
    db_session.flush()
    user = User(
        organization_id=organization.id,
        email="owner@example.com",
        display_name="Owner",
        password_hash="pbkdf2_sha256$salt$deadbeef",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    cookie_value = issue_user_session(db_session, user, duration_minutes=60, settings=settings)
    db_session.commit()

    resolved = resolve_authenticated_user_id(db_session, cookie_value, settings)
    assert resolved == user.id

    session_id = parse_signed_session_cookie_value(cookie_value, settings.session_secret)
    assert session_id is not None
    revoke_user_session(db_session, session_id)
    db_session.commit()

    assert resolve_authenticated_user_id(db_session, cookie_value, settings) is None


def test_expired_db_session_is_rejected(db_session: Session):
    settings = Settings(
        database_url="sqlite://",
        session_secret="unit-test-secret",
        app_env="development",
        frontend_origin="http://localhost",
        bootstrap_admin_email="admin@example.com",
        bootstrap_admin_password="admin",
        bootstrap_admin_display_name="Admin",
    )
    organization = Organization(name="Test Org")
    db_session.add(organization)
    db_session.flush()
    user = User(
        organization_id=organization.id,
        email="expired@example.com",
        display_name="Expired",
        password_hash="pbkdf2_sha256$salt$deadbeef",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    row = UserAuthSession(
        id="expired-session",
        user_id=user.id,
        valid_until=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db_session.add(row)
    db_session.commit()

    cookie = sign_session_cookie_value("expired-session", settings.session_secret)
    assert resolve_authenticated_user_id(db_session, cookie, settings) is None


def test_auth_login_sets_secure_cookie_in_production(api_client: TestClient, monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SESSION_SECRET", "prod-session-secret-value")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "strong-bootstrap-password")

    response = api_client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin"},
    )
    assert response.status_code == 200
    cookie_header = response.headers.get("set-cookie", "")
    assert "HttpOnly" in cookie_header
    assert "secure" in cookie_header.lower()


def test_login_rate_limit_returns_429(api_client: TestClient, monkeypatch):
    login_rate_limiter.reset("testclient")
    monkeypatch.setattr("app.api.auth._client_key", lambda _request: "testclient")

    for _ in range(10):
        failed = api_client.post(
            "/api/auth/login",
            json={"email": "admin@example.com", "password": "wrong-password"},
        )
        assert failed.status_code == 401

    limited = api_client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "wrong-password"},
    )
    assert limited.status_code == 429
    login_rate_limiter.reset("testclient")


def test_session_persists_across_app_restarts(api_client: TestClient):
    login = api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert login.status_code == 200
    cookie = login.cookies.get("kiosk_session")
    assert cookie

    # Simulate process restart: no in-memory auth map exists anymore.
    api_client.app.state.__dict__.pop("auth_sessions", None)

    me = api_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "admin@example.com"

    logout = api_client.post("/api/auth/logout")
    assert logout.status_code == 204

    api_client.cookies.set("kiosk_session", cookie)
    assert api_client.get("/api/auth/me").status_code == 401
