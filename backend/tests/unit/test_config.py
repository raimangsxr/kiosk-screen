from app.config import get_settings


def test_settings_read_expected_environment_values(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@db:5432/app")
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret")
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://localhost:4200")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "owner@example.com")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "change-me")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_DISPLAY_NAME", "Owner")

    settings = get_settings()

    assert settings.database_url == "postgresql+psycopg://user:pass@db:5432/app"
    assert settings.session_secret == "test-session-secret"
    assert settings.frontend_origin == "http://localhost:4200"
    assert settings.bootstrap_admin_email == "owner@example.com"
    assert settings.bootstrap_admin_password == "change-me"
    assert settings.bootstrap_admin_display_name == "Owner"
    assert settings.app_env == "development"


def test_redis_password_is_injected_into_redis_url(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://redis.example:6379/0")
    monkeypatch.setenv("REDIS_PASSWORD", "s3cret!")

    settings = get_settings()

    assert settings.redis_url == "redis://:s3cret%21@redis.example:6379/0"


def test_redis_url_password_is_not_overridden_by_redis_password(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://:from-url@redis.example:6379/0")
    monkeypatch.setenv("REDIS_PASSWORD", "ignored")

    settings = get_settings()

    assert settings.redis_url == "redis://:from-url@redis.example:6379/0"
