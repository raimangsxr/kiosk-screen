from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.mappers import to_iframe_schema, to_iframe_with_display_scales_schema
from app.api.schemas import (
    IframeDisplayScalesRequest,
    IframeListWithDisplayScalesResponse,
    IframeRequest,
    IframeSchema,
    IframeWithDisplayScalesSchema,
)
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import CONTENT_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.iframe_service import IframeService

router = APIRouter(prefix="/iframes", tags=["Iframes"])


def _map_value_error(exc: ValueError) -> HTTPException:
    message = str(exc)
    if "already exists" in message:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"code": "iframe_url_already_exists", "message": message})
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_url", "message": message})


@router.get("", response_model=IframeListWithDisplayScalesResponse)
def list_iframes(
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> IframeListWithDisplayScalesResponse:
    service = IframeService(session)
    return IframeListWithDisplayScalesResponse(
        items=[
            to_iframe_with_display_scales_schema(item, service.list_display_scales(user.organization_id, item.id))
            for item in service.list(user.organization_id)
        ]
    )


@router.post("", response_model=IframeSchema, status_code=status.HTTP_201_CREATED)
def create_iframe(
    payload: IframeRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> IframeSchema:
    try:
        return to_iframe_schema(IframeService(session).create(user.organization_id, payload, user.id))
    except ValueError as exc:
        raise _map_value_error(exc) from exc


@router.get("/{iframe_id}", response_model=IframeWithDisplayScalesSchema)
def get_iframe(
    iframe_id: str,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> IframeWithDisplayScalesSchema:
    try:
        service = IframeService(session)
        iframe = service.get(user.organization_id, iframe_id)
        return to_iframe_with_display_scales_schema(
            iframe,
            service.list_display_scales(user.organization_id, iframe_id),
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "iframe_not_found", "message": str(exc)}) from exc


@router.put("/{iframe_id}", response_model=IframeSchema)
def update_iframe(
    iframe_id: str,
    payload: IframeRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> IframeSchema:
    try:
        return to_iframe_schema(IframeService(session).update(user.organization_id, iframe_id, payload, user.id))
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "iframe_not_found", "message": str(exc)}) from exc
    except ValueError as exc:
        raise _map_value_error(exc) from exc


@router.delete("/{iframe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_iframe(
    iframe_id: str,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> Response:
    try:
        IframeService(session).delete(user.organization_id, iframe_id, user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "iframe_not_found", "message": str(exc)}) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{iframe_id}/display-scales", response_model=IframeWithDisplayScalesSchema)
def put_iframe_display_scales(
    iframe_id: str,
    payload: IframeDisplayScalesRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> IframeWithDisplayScalesSchema:
    try:
        service = IframeService(session)
        scales = service.batch_save_display_scales(user.organization_id, iframe_id, payload.items, user.id)
        iframe = service.get(user.organization_id, iframe_id)
        return to_iframe_with_display_scales_schema(iframe, scales)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "not_found", "message": str(exc)}) from exc
    except ValueError as exc:
        raise _map_value_error(exc) from exc
