from sqlalchemy.orm import Session

from app.auth.service import hash_password, verify_password
from app.domain.password_policy import MIN_PASSWORD_LENGTH, password_policy_violation
from app.repositories.models.user import User
from app.shared.errors.application_errors import (
    AuthenticationApplicationError,
    ValidationApplicationError,
)


def _password_validation_error(password: str) -> ValidationApplicationError | None:
    violation = password_policy_violation(password)
    if violation == "empty":
        return ValidationApplicationError("password_required", "A password is required.")
    if violation == "too_short":
        return ValidationApplicationError(
            "password_too_short",
            f"The password must be at least {MIN_PASSWORD_LENGTH} characters.",
            details={"minLength": MIN_PASSWORD_LENGTH},
        )
    return None


def validate_new_password(password: str) -> None:
    error = _password_validation_error(password)
    if error is not None:
        raise error


def change_own_password(
    session: Session,
    user_id: str,
    current_password: str,
    new_password: str,
) -> None:
    user = session.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationApplicationError("not_authenticated", "Authentication is required.")

    if not verify_password(current_password, user.password_hash):
        raise ValidationApplicationError(
            "password_change_failed",
            "The password could not be changed. Verify your current password and try again.",
        )

    validate_new_password(new_password)
    user.password_hash = hash_password(new_password)
    session.commit()
