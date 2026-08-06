from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.device_activation_store import (
    POLL_INTERVAL_SECONDS,
    consume,
    create_pair,
    get_by_device_code,
    get_by_user_code,
    is_valid_user_code,
    normalize_user_code,
    try_authorize,
)
from app.auth.dependencies import CurrentUser
from app.domain.roles import Role, can_open_display
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.shared.errors.application_errors import (
    AuthenticationApplicationError,
    NotFoundApplicationError,
    PermissionApplicationError,
    ValidationApplicationError,
)


@dataclass(frozen=True, slots=True)
class DeviceActivationStartResult:
    user_code: str
    device_code: str
    expires_at: datetime
    poll_interval_seconds: int
    activate_url: str


@dataclass(frozen=True, slots=True)
class DeviceActivationPollResult:
    status: str
    user: CurrentUser | None = None
    remember_me: bool = False
    display_label: str | None = None


class DeviceActivationExpiredError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "activation_expired",
            "Este código ya no es válido. Solicita uno nuevo en la pantalla.",
        )


class DeviceActivationNotFoundError(NotFoundApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "activation_not_found",
            "No encontramos una pantalla con ese código. Comprueba el código e inténtalo de nuevo.",
        )


class DeviceActivationForbiddenError(PermissionApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "activation_forbidden",
            "No tienes permiso para activar esta pantalla.",
        )


class DeviceActivationUnavailableError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "activation_unavailable",
            "Este código ya no está disponible. Solicita uno nuevo en la pantalla.",
        )


def start_activation() -> DeviceActivationStartResult:
    user_code, device_code, expires_at = create_pair()
    return DeviceActivationStartResult(
        user_code=user_code,
        device_code=device_code,
        expires_at=expires_at,
        poll_interval_seconds=POLL_INTERVAL_SECONDS,
        activate_url=f"/activate?code={user_code}",
    )


def authorize_activation(
    session: Session,
    user: CurrentUser,
    *,
    user_code: str,
    remember_me: bool,
    display_label: str,
) -> None:
    if not is_valid_user_code(user_code):
        raise ValidationApplicationError(
            "activation_invalid_code",
            "Introduce un código de 6 letras mayúsculas.",
        )
    clean_label = display_label.strip()
    if not clean_label:
        raise ValidationApplicationError(
            "activation_display_label_required",
            "Introduce un nombre para la pantalla.",
        )
    if not can_open_display({Role(role) for role in user.roles}):
        raise DeviceActivationForbiddenError()

    db_user = session.get(User, user.id)
    if db_user is None or not db_user.is_active:
        raise AuthenticationApplicationError(
            "not_authenticated",
            "Tu cuenta no está activa. Contacta con un administrador.",
        )

    record = try_authorize(
        user_code,
        user_id=str(user.id),
        organization_id=str(user.organization_id),
        remember_me=remember_me,
        display_label=clean_label,
    )
    if record is None:
        existing = get_by_user_code(user_code)
        if existing is None:
            raise DeviceActivationNotFoundError()
        if existing.get("status") in {"authorized", "consumed"}:
            raise DeviceActivationUnavailableError()
        raise DeviceActivationExpiredError()


def poll_activation(
    session: Session,
    *,
    device_code: str,
) -> DeviceActivationPollResult:
    record = get_by_device_code(device_code)
    if record is None:
        raise DeviceActivationNotFoundError()

    status = record.get("status", "pending")
    if status == "expired":
        raise DeviceActivationExpiredError()
    if status == "pending":
        return DeviceActivationPollResult(status="pending")
    if status != "authorized":
        raise DeviceActivationUnavailableError()

    user_id = record.get("authorizedByUserId")
    if not isinstance(user_id, str):
        raise DeviceActivationUnavailableError()

    db_user = session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if db_user is None:
        raise AuthenticationApplicationError(
            "not_authenticated",
            "Tu cuenta no está activa. Contacta con un administrador.",
        )

    roles = [role for (role,) in session.query(RoleAssignment.role).filter(RoleAssignment.user_id == db_user.id).all()]
    remember_me = bool(record.get("rememberMe"))
    display_label = record.get("displayLabel")
    clean_label = display_label.strip() if isinstance(display_label, str) else ""
    consume(device_code)
    return DeviceActivationPollResult(
        status="authorized",
        user=CurrentUser(db_user, roles),
        remember_me=remember_me,
        display_label=clean_label or None,
    )


def normalize_activation_code(user_code: str) -> str:
    return normalize_user_code(user_code)
