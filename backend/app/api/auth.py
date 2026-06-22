from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import LoginRequest, UserSchema
from app.auth.dependencies import SESSION_COOKIE_NAME, CurrentUser, get_current_user
from app.auth.service import create_session_token, verify_password
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.repositories.session import get_session

router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_schema(user: CurrentUser) -> UserSchema:
    return UserSchema(
        id=user.id,
        email=user.email,
        displayName=user.display_name,
        isActive=True,
        roles=user.roles
    )


@router.post("/login", response_model=UserSchema)
def login(payload: LoginRequest, request: Request, response: Response, session: Session = Depends(get_session)) -> UserSchema:
    user = session.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    roles = list(session.scalars(select(RoleAssignment.role).where(RoleAssignment.user_id == user.id)))
    # "Recordarme" extiende la duración de la sesión de 24h a 30 días. El
    # backend es la fuente de verdad para la caducidad; el frontend sólo
    # envía la intención del usuario.
    duration_minutes = 30 * 24 * 60 if payload.remember_me else 24 * 60
    token = create_session_token(user.id, duration_minutes=duration_minutes)
    request.app.state.auth_sessions[token.id] = user.id
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token.id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=duration_minutes * 60
    )
    return user_schema(CurrentUser(user, roles))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response) -> None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token is not None:
        request.app.state.auth_sessions.pop(token, None)
    response.delete_cookie(SESSION_COOKIE_NAME)
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/me", response_model=UserSchema)
def me(user: CurrentUser = Depends(get_current_user)) -> UserSchema:
    return user_schema(user)
