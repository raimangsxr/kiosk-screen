from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.auth.service import create_session_token
from app.auth.session_store import parse_signed_session_cookie_value, sign_session_cookie_value
from app.config import Settings
from app.repositories.base import utc_now
from app.repositories.models.user import User
from app.repositories.models.user_auth_session import UserAuthSession


def issue_user_session(
    db: Session,
    user: User,
    *,
    duration_minutes: int,
    settings: Settings,
) -> str:
    token = create_session_token(user.id, duration_minutes=duration_minutes)
    db.add(
        UserAuthSession(
            id=token.id,
            user_id=user.id,
            valid_until=token.valid_until,
        )
    )
    db.flush()
    return sign_session_cookie_value(token.id, settings.session_secret)


def revoke_user_session(db: Session, session_id: str) -> None:
    row = db.get(UserAuthSession, session_id)
    if row is None or row.revoked_at is not None:
        return
    row.revoked_at = utc_now()
    db.flush()


def _aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def resolve_authenticated_user_id(
    db: Session,
    cookie_value: str | None,
    settings: Settings,
) -> str | None:
    if not cookie_value:
        return None
    session_id = parse_signed_session_cookie_value(cookie_value, settings.session_secret)
    if session_id is None:
        return None
    row = db.get(UserAuthSession, session_id)
    if row is None or row.revoked_at is not None:
        return None
    if _aware_utc(row.valid_until) <= utc_now():
        return None
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        return None
    return user.id


def session_cookie_secure(settings: Settings) -> bool:
    return settings.app_env == "production"


def session_cookie_max_age(*, remember_me: bool) -> int:
    duration_minutes = 30 * 24 * 60 if remember_me else 24 * 60
    return duration_minutes * 60


def standard_session_duration_minutes(*, remember_me: bool) -> int:
    return 30 * 24 * 60 if remember_me else 24 * 60
