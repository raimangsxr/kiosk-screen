from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.domain.roles import Role
from app.auth.session_service import resolve_authenticated_user_id
from app.config import Settings, get_settings
from app.repositories.api_keys import ApiKeyRepository
from app.repositories.models.api_key import ApiKey
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.repositories.session import get_session
from app.services.api_key_service import ApiKeyService
from app.shared.errors.application_errors import (
    InvalidApiKeyError,
    InvalidAuthorizationSchemeError,
    MissingApiKeyError,
)


SESSION_COOKIE_NAME = "kiosk_session"

_bearer_scheme = HTTPBearer(auto_error=False, bearerFormat="opaque")


class CurrentUser:
    def __init__(self, user: User, roles: list[str]):
        self.id = user.id
        self.organization_id = user.organization_id
        self.email = user.email
        self.display_name = user.display_name
        self.roles = roles


class ApiKeyPrincipal:
    """Authenticated API key. `organization_id` is derived from the key alone (FR-016)."""

    def __init__(self, key: ApiKey) -> None:
        self.id = key.id
        self.organization_id = key.organization_id
        self.label = key.label


def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    user = getattr(request.state, "user", None)
    if user is not None:
        return user

    session_user_id = resolve_authenticated_user_id(
        session,
        request.cookies.get(SESSION_COOKIE_NAME),
        settings,
    )
    if session_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    db_user = session.get(User, session_user_id)
    if db_user is None or not db_user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    roles = list(session.query(RoleAssignment.role).filter(RoleAssignment.user_id == db_user.id).all())
    flattened_roles = [role for (role,) in roles]
    return CurrentUser(db_user, flattened_roles)


def require_roles(allowed_roles: set[Role]) -> Callable[[object], object]:
    def dependency(user: object = Depends(get_current_user)) -> object:
        user_roles = {Role(role) for role in getattr(user, "roles", [])}
        if not user_roles.intersection(allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency


def get_api_key_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_session),
) -> ApiKeyPrincipal:
    # Distinguish three failure modes (FR-003, FR-004):
    # - header absent → missing_api_key (401)
    # - header present but not "Bearer ..." → invalid_authorization_scheme (401)
    # - well-formed Bearer token but key unknown/inactive → invalid_api_key (401) or
    #   inactive_api_key (403)
    auth_header = request.headers.get("Authorization")
    if auth_header is None or not auth_header.strip():
        raise MissingApiKeyError()
    parts = auth_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise InvalidAuthorizationSchemeError()
    raw_key = parts[1]
    if credentials is None:
        # HTTPBearer refused it but our regex above accepts it; this is the rare
        # mismatch path.
        raise InvalidAuthorizationSchemeError()
    service = ApiKeyService(ApiKeyRepository(session))
    key = service.verify(raw_key)
    if key is None:
        raise InvalidApiKeyError()
    return ApiKeyPrincipal(key)
