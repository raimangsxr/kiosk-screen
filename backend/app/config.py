from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_url: str
    session_secret: str
    frontend_origin: str
    bootstrap_admin_email: str
    bootstrap_admin_password: str
    bootstrap_admin_display_name: str
    media_storage_path: str = ""
    image_upload_max_bytes: int = 25 * 1024 * 1024
    video_upload_max_bytes: int = 500 * 1024 * 1024
    rotation_animations: tuple[str, ...] = ("none", "fade", "slide")
    public_api_cors_origins: tuple[str, ...] = ()


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://kiosk:kiosk@localhost:15432/kiosk_screen"
        ),
        session_secret=os.getenv("SESSION_SECRET", "development-only-session-secret"),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:4200"),
        bootstrap_admin_email=os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com"),
        bootstrap_admin_password=os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin"),
        bootstrap_admin_display_name=os.getenv("BOOTSTRAP_ADMIN_DISPLAY_NAME", "Administrator"),
        media_storage_path=os.getenv("MEDIA_STORAGE_PATH", str(Path.cwd() / "var" / "media")),
        image_upload_max_bytes=int(os.getenv("IMAGE_UPLOAD_MAX_BYTES", str(25 * 1024 * 1024))),
        video_upload_max_bytes=int(os.getenv("VIDEO_UPLOAD_MAX_BYTES", str(500 * 1024 * 1024))),
        rotation_animations=tuple(
            value.strip() for value in os.getenv("ROTATION_ANIMATIONS", "none,fade,slide").split(",") if value.strip()
        ),
        public_api_cors_origins=tuple(
            value.strip() for value in os.getenv("PUBLIC_API_CORS_ORIGINS", "").split(",") if value.strip()
        )
    )
