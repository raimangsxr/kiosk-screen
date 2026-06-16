from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.mappers import to_user_schema
from app.api.schemas import UserRequest, UserSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import ADMIN_ROLES
from app.repositories.session import get_session
from app.services.admin_service import AdminService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserSchema])
def list_users(user: CurrentUser = Depends(require_roles(ADMIN_ROLES)), session: Session = Depends(get_session)) -> list[UserSchema]:
    return [to_user_schema(row, roles) for row, roles in AdminService(session).list_users(user.organization_id)]


@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserRequest,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> UserSchema:
    row, roles = AdminService(session).create_user(user.organization_id, user.id, payload)
    return to_user_schema(row, roles)


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: str,
    payload: UserRequest,
    user: CurrentUser = Depends(require_roles(ADMIN_ROLES)),
    session: Session = Depends(get_session)
) -> UserSchema:
    try:
        row, roles = AdminService(session).update_user(user.organization_id, user.id, user_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return to_user_schema(row, roles)
