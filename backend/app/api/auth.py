from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import (
    ChangePasswordRequest,
    DeviceActivationAuthorizeRequest,
    DeviceActivationPollRequest,
    DeviceActivationPollResponse,
    DeviceActivationStartResponse,
    LoginRequest,
    UserSchema,
)
from app.auth.dependencies import SESSION_COOKIE_NAME, CurrentUser, get_current_user
from app.auth.device_activation_service import authorize_activation, poll_activation, start_activation
from app.auth.password_service import change_own_password
from app.auth.session_service import (
    issue_user_session,
    revoke_user_session,
    session_cookie_max_age,
    session_cookie_secure,
    standard_session_duration_minutes,
)
from app.auth.session_store import activation_rate_limiter, login_rate_limiter, parse_signed_session_cookie_value
from app.auth.service import verify_password
from app.config import Settings, get_settings
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.repositories.session import get_session
from app.shared.errors.application_errors import ApplicationError

router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_schema(user: CurrentUser) -> UserSchema:
    return UserSchema(
        id=user.id,
        email=user.email,
        displayName=user.display_name,
        isActive=True,
        roles=user.roles
    )


def _client_key(request: Request) -> str:
    if request.client is None or not request.client.host:
        return "unknown"
    return request.client.host


@router.post("/login", response_model=UserSchema)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> UserSchema:
    client_key = _client_key(request)
    if login_rate_limiter.is_limited(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
        )

    user = session.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None or not verify_password(payload.password, user.password_hash):
        login_rate_limiter.record_failure(client_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    login_rate_limiter.reset(client_key)
    roles = list(session.scalars(select(RoleAssignment.role).where(RoleAssignment.user_id == user.id)))
    duration_minutes = standard_session_duration_minutes(remember_me=payload.remember_me)
    cookie_value = issue_user_session(
        session,
        user,
        duration_minutes=duration_minutes,
        settings=settings,
    )
    session.commit()
    response.set_cookie(
        SESSION_COOKIE_NAME,
        cookie_value,
        httponly=True,
        samesite="lax",
        secure=session_cookie_secure(settings),
        max_age=session_cookie_max_age(remember_me=payload.remember_me),
    )
    return user_schema(CurrentUser(user, roles))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> None:
    cookie_value = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_value is not None:
        session_id = parse_signed_session_cookie_value(cookie_value, settings.session_secret)
        if session_id is not None:
            revoke_user_session(session, session_id)
            session.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/me", response_model=UserSchema)
def me(user: CurrentUser = Depends(get_current_user)) -> UserSchema:
    return user_schema(user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    change_own_password(session, user.id, payload.current_password, payload.new_password)


@router.post("/device-activation/start", response_model=DeviceActivationStartResponse)
def device_activation_start() -> DeviceActivationStartResponse:
    result = start_activation()
    return DeviceActivationStartResponse(
        user_code=result.user_code,
        device_code=result.device_code,
        expires_at=result.expires_at,
        poll_interval_seconds=result.poll_interval_seconds,
        activate_url=result.activate_url,
    )


@router.post("/device-activation/authorize", status_code=status.HTTP_204_NO_CONTENT)
def device_activation_authorize(
    payload: DeviceActivationAuthorizeRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    client_key = _client_key(request)
    if activation_rate_limiter.is_limited(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many activation attempts. Try again later.",
        )
    try:
        authorize_activation(
            session,
            user,
            user_code=payload.user_code,
            remember_me=payload.remember_me,
        )
        session.commit()
        activation_rate_limiter.reset(client_key)
    except ApplicationError:
        activation_rate_limiter.record_failure(client_key)
        raise


@router.post("/device-activation/poll", response_model=DeviceActivationPollResponse)
def device_activation_poll(
    payload: DeviceActivationPollRequest,
    response: Response,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> DeviceActivationPollResponse:
    result = poll_activation(session, device_code=payload.device_code)
    if result.status == "pending":
        return DeviceActivationPollResponse(status="pending", user=None)
    assert result.user is not None
    duration_minutes = standard_session_duration_minutes(remember_me=result.remember_me)
    cookie_value = issue_user_session(
        session,
        session.get(User, result.user.id),
        duration_minutes=duration_minutes,
        settings=settings,
    )
    session.commit()
    response.set_cookie(
        SESSION_COOKIE_NAME,
        cookie_value,
        httponly=True,
        samesite="lax",
        secure=session_cookie_secure(settings),
        max_age=session_cookie_max_age(remember_me=result.remember_me),
    )
    return DeviceActivationPollResponse(status="authorized", user=user_schema(result.user))
