from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from app.domain.roles import Role


def get_current_user(request: Request) -> object:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_roles(allowed_roles: set[Role]) -> Callable[[object], object]:
    def dependency(user: object = Depends(get_current_user)) -> object:
        user_roles = {Role(role) for role in getattr(user, "roles", [])}
        if not user_roles.intersection(allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency

