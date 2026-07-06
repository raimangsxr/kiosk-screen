import pytest

from app.auth.password_service import validate_new_password
from app.domain.password_policy import password_policy_violation
from app.shared.errors.application_errors import ValidationApplicationError


def test_password_policy_rejects_empty_and_short_passwords() -> None:
    assert password_policy_violation("") == "empty"
    assert password_policy_violation("short") == "too_short"
    assert password_policy_violation("long-enough") is None


def test_validate_new_password_raises_structured_error() -> None:
    with pytest.raises(ValidationApplicationError) as exc:
        validate_new_password("tiny")
    assert exc.value.code == "password_too_short"
