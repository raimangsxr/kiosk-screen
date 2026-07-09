from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.mappers import to_content_schema
from app.api.schemas import ContentItemRequest, ContentItemSchema, ReorderRequest
from app.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.domain.roles import CONTENT_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.application.display_orchestrator.hooks import notify_content_mutated
from app.services.content_service import ContentService
from app.shared.errors.application_errors import ApplicationError

router = APIRouter(prefix="/content", tags=["Top Content"])


def _content_upload_payload(
    *,
    title: str,
    content_type: str | None,
    is_active: bool,
    display_order: int | None,
    duration_seconds: int | None,
    rotation_animation: str | None,
    animation_duration_milliseconds: int | None,
    available_from: datetime | None,
    available_until: datetime | None,
    is_fixed: bool,
    recurring_every_x_iterations: int | None,
) -> ContentItemRequest:
    return ContentItemRequest(
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
        availableUntil=available_until,
        isFixed=is_fixed,
        recurringEveryXIterations=recurring_every_x_iterations,
    )


@router.get("", response_model=list[ContentItemSchema])
def list_content(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)) -> list[ContentItemSchema]:
    return [to_content_schema(item) for item in ContentService(session).list_items(user.organization_id)]


@router.post("", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
def create_content(
    payload: ContentItemRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    try:
        item = to_content_schema(ContentService(session).create(user.organization_id, user.id, payload))
        notify_content_mutated(user.organization_id)
        return item
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/upload", response_model=ContentItemSchema, status_code=status.HTTP_201_CREATED)
def upload_content(
    file: UploadFile = File(...),
    title: str = Form(...),
    content_type: str | None = Form(default=None, alias="contentType"),
    is_active: bool = Form(default=True, alias="isActive"),
    display_order: int | None = Form(default=None, alias="displayOrder"),
    duration_seconds: int | None = Form(default=None, alias="durationSeconds"),
    rotation_animation: str | None = Form(default=None, alias="rotationAnimation"),
    animation_duration_milliseconds: int | None = Form(default=None, alias="animationDurationMilliseconds"),
    available_from: datetime | None = Form(default=None, alias="availableFrom"),
    available_until: datetime | None = Form(default=None, alias="availableUntil"),
    is_fixed: bool = Form(default=False, alias="isFixed"),
    recurring_every_x_iterations: int | None = Form(default=None, alias="recurringEveryXIterations"),
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> ContentItemSchema:
    payload = _content_upload_payload(
        title=title,
        content_type=content_type,
        is_active=is_active,
        display_order=display_order,
        duration_seconds=duration_seconds,
        rotation_animation=rotation_animation,
        animation_duration_milliseconds=animation_duration_milliseconds,
        available_from=available_from,
        available_until=available_until,
        is_fixed=is_fixed,
        recurring_every_x_iterations=recurring_every_x_iterations,
    )
    try:
        item = ContentService(session).create_uploaded(user.organization_id, user.id, file, payload)
        session.refresh(item, attribute_names=["media_file"])
        notify_content_mutated(user.organization_id)
        return to_content_schema(item)
    except ApplicationError:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/{content_id}/upload", response_model=ContentItemSchema)
def replace_content_upload(
    content_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    content_type: str | None = Form(default=None, alias="contentType"),
    is_active: bool = Form(default=True, alias="isActive"),
    display_order: int | None = Form(default=None, alias="displayOrder"),
    duration_seconds: int | None = Form(default=None, alias="durationSeconds"),
    rotation_animation: str | None = Form(default=None, alias="rotationAnimation"),
    animation_duration_milliseconds: int | None = Form(default=None, alias="animationDurationMilliseconds"),
    available_from: datetime | None = Form(default=None, alias="availableFrom"),
    available_until: datetime | None = Form(default=None, alias="availableUntil"),
    is_fixed: bool = Form(default=False, alias="isFixed"),
    recurring_every_x_iterations: int | None = Form(default=None, alias="recurringEveryXIterations"),
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> ContentItemSchema:
    payload = _content_upload_payload(
        title=title,
        content_type=content_type,
        is_active=is_active,
        display_order=display_order,
        duration_seconds=duration_seconds,
        rotation_animation=rotation_animation,
        animation_duration_milliseconds=animation_duration_milliseconds,
        available_from=available_from,
        available_until=available_until,
        is_fixed=is_fixed,
        recurring_every_x_iterations=recurring_every_x_iterations,
    )
    try:
        item = ContentService(session).replace_uploaded(
            user.organization_id, user.id, content_id, file, payload
        )
        session.refresh(item, attribute_names=["media_file"])
        notify_content_mutated(user.organization_id)
        return to_content_schema(item)
    except ApplicationError:
        raise
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
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
        item = to_content_schema(ContentService(session).update(user.organization_id, user.id, content_id, payload))
        notify_content_mutated(user.organization_id)
        return item
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
        notify_content_mutated(user.organization_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_content(
    payload: ReorderRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session)
) -> None:
    """Reorder the organization's top-content items."""
    try:
        ContentService(session).reorder(user.organization_id, user.id, payload.ordered_ids)
        notify_content_mutated(user.organization_id)
    except ApplicationError:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
