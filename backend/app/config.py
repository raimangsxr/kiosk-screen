from dataclasses import dataclass
import os
from pathlib import Path

from app.auth.session_store import DEFAULT_BOOTSTRAP_ADMIN_PASSWORD, DEFAULT_SESSION_SECRET


@dataclass(frozen=True)
class Settings:
    database_url: str
    session_secret: str
    app_env: str
    frontend_origin: str
    bootstrap_admin_email: str
    bootstrap_admin_password: str
    bootstrap_admin_display_name: str
    redis_url: str
    media_storage_path: str = ""
    image_upload_max_bytes: int = 25 * 1024 * 1024
    video_upload_max_bytes: int = 500 * 1024 * 1024
    rotation_animations: tuple[str, ...] = ("none", "fade", "slide")
    public_api_cors_origins: tuple[str, ...] = ()
    # Database connection pool. Long-lived SSE streams must NOT pin a
    # connection (see get_stream_user + ephemeral sessions in the stream
    # endpoints), so a moderate pool comfortably serves short requests.
    db_pool_size: int = 20
    db_max_overflow: int = 20
    db_pool_timeout_seconds: int = 30
    db_pool_recycle_seconds: int = 1800
    db_pool_pre_ping: bool = True


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://kiosk:kiosk@localhost:15432/kiosk_screen"
        ),
        session_secret=os.getenv("SESSION_SECRET", DEFAULT_SESSION_SECRET),
        app_env=os.getenv("APP_ENV", "development").strip().lower(),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:4200"),
        bootstrap_admin_email=os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com"),
        bootstrap_admin_password=os.getenv("BOOTSTRAP_ADMIN_PASSWORD", DEFAULT_BOOTSTRAP_ADMIN_PASSWORD),
        bootstrap_admin_display_name=os.getenv("BOOTSTRAP_ADMIN_DISPLAY_NAME", "Administrator"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        media_storage_path=os.getenv("MEDIA_STORAGE_PATH", str(Path.cwd() / "var" / "media")),
        image_upload_max_bytes=int(os.getenv("IMAGE_UPLOAD_MAX_BYTES", str(25 * 1024 * 1024))),
        video_upload_max_bytes=int(os.getenv("VIDEO_UPLOAD_MAX_BYTES", str(500 * 1024 * 1024))),
        rotation_animations=tuple(
            value.strip() for value in os.getenv("ROTATION_ANIMATIONS", "none,fade,slide").split(",") if value.strip()
        ),
        public_api_cors_origins=tuple(
            value.strip() for value in os.getenv("PUBLIC_API_CORS_ORIGINS", "").split(",") if value.strip()
        ),
        db_pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
        db_max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        db_pool_timeout_seconds=int(os.getenv("DB_POOL_TIMEOUT_SECONDS", "30")),
        db_pool_recycle_seconds=int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800")),
        db_pool_pre_ping=os.getenv("DB_POOL_PRE_PING", "true").strip().lower() != "false",
    )


def validate_production_settings(settings: Settings) -> None:
    if settings.app_env != "production":
        return
    problems: list[str] = []
    if settings.session_secret == DEFAULT_SESSION_SECRET:
        problems.append("SESSION_SECRET must not use the development default in production")
    if settings.bootstrap_admin_password == DEFAULT_BOOTSTRAP_ADMIN_PASSWORD:
        problems.append("BOOTSTRAP_ADMIN_PASSWORD must not use the development default in production")
    if problems:
        raise RuntimeError("; ".join(problems))
