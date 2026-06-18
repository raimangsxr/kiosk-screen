from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.domain.roles import Role
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


def get_current_user(request: Request, session: Session = Depends(get_session)) -> CurrentUser:
    user = getattr(request.state, "user", None)
    if user is not None:
        return user

    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    session_user_id = getattr(request.app.state, "auth_sessions", {}).get(session_token)
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
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_session),
) -> ApiKeyPrincipal:
    if credentials is None:
        raise MissingApiKeyError()
    if credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise InvalidAuthorizationSchemeError()
    service = ApiKeyService(ApiKeyRepository(session))
    key = service.verify(credentials.credentials)
    if key is None:
        raise InvalidApiKeyError()
    return ApiKeyPrincipal(key)
