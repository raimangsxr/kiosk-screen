from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.domain.roles import Role
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.repositories.session import get_session


SESSION_COOKIE_NAME = "kiosk_session"


class CurrentUser:
    def __init__(self, user: User, roles: list[str]):
        self.id = user.id
        self.organization_id = user.organization_id
        self.email = user.email
        self.display_name = user.display_name
        self.roles = roles


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
