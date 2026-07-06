MIN_PASSWORD_LENGTH = 8


def password_policy_violation(password: str) -> str | None:
    """Return a violation code or None when the password is acceptable."""
    if not password:
        return "empty"
    if len(password) < MIN_PASSWORD_LENGTH:
        return "too_short"
    return None
