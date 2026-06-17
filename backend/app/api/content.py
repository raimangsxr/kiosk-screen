from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.mappers import to_content_schema
from app.api.schemas import ContentItemRequest, ContentItemSchema
from app.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.domain.roles import CONTENT_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.content_service import ContentService

router = APIRouter(prefix="/content", tags=["Top Content"])


@router.get("", response_model=list[ContentItemSchema])
def list_content(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> list[ContentItemSchema]:
    return [to_content_schema(item) for item in ContentService(session).list(user.organization_id)]


@router.post("", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
def create_content(
    payload: ContentItemRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    try:
        return to_content_schema(ContentService(session).create(user.organization_id, user.id, payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/iframe", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
def create_iframe_content(
    payload: ContentItemRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    if payload.content_type != "embedded_web":
        payload.content_type = "embedded_web"
    return create_content(payload, user, session)


@router.post("/upload", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
def upload_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    content_type: str = Form(..., alias="contentType"),
    is_active: bool = Form(..., alias="isActive"),
    display_order: int = Form(..., alias="displayOrder"),
    duration_seconds: int | None = Form(default=None, alias="durationSeconds"),
    rotation_animation: str | None = Form(default=None, alias="rotationAnimation"),
    animation_duration_milliseconds: int | None = Form(default=None, alias="animationDurationMilliseconds"),
    available_from: datetime | None = Form(default=None, alias="availableFrom"),
    available_until: datetime | None = Form(default=None, alias="availableUntil"),
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    payload = ContentItemRequest(
        title=title,
        contentType=content_type,
        sourceReference="",
        approvedDomainId=None,
        isActive=is_active,
        displayOrder=display_order,
        durationSeconds=duration_seconds,
        rotationAnimation=rotation_animation,
        animationDurationMilliseconds=animation_duration_milliseconds,
        availableFrom=available_from,
        availableUntil=available_until
    )
    try:
        return to_content_schema(ContentService(session).create_uploaded(user.organization_id, user.id, file, payload))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{content_id}", response_model=ContentItemSchema)
def get_content(content_id: str, user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> ContentItemSchema:
    item = ContentService(session).repository.get(user.organization_id, content_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found.")
    return to_content_schema(item)


@router.put("/{content_id}", response_model=ContentItemSchema)
def update_content(
    content_id: str,
    payload: ContentItemRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    try:
        return to_content_schema(ContentService(session).update(user.organization_id, user.id, content_id, payload))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_content(
    content_id: str,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> None:
    try:
        ContentService(session).delete(user.organization_id, user.id, content_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
