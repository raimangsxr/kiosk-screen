from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    database_url: str
    session_secret: str
    frontend_origin: str
    bootstrap_admin_email: str
    bootstrap_admin_password: str
    bootstrap_admin_display_name: str


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://kiosk:kiosk@localhost:5432/kiosk_screen"
        ),
        session_secret=os.getenv("SESSION_SECRET", "development-only-session-secret"),
        frontend_origin=os.getenv("FRONTEND_ORIGIN", "http://localhost:4200"),
        bootstrap_admin_email=os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com"),
        bootstrap_admin_password=os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin"),
        bootstrap_admin_display_name=os.getenv("BOOTSTRAP_ADMIN_DISPLAY_NAME", "Administrator")
    )

