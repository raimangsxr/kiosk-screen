from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.mappers import to_display_device_schema
from app.api.schemas import DisplayDeviceRenameRequest, DisplayDeviceRequest, DisplayDeviceSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import CONTENT_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.display_device_service import DisplayDeviceService

router = APIRouter(prefix="/admin/display-devices", tags=["Display Devices"])


def _map_value_error(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_request", "message": str(exc)})


@router.get("", response_model=list[DisplayDeviceSchema])
def list_display_devices(
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> list[DisplayDeviceSchema]:
    return [to_display_device_schema(device) for device in DisplayDeviceService(session).list_devices(user.organization_id)]


@router.post("", response_model=DisplayDeviceSchema, status_code=status.HTTP_201_CREATED)
def create_display_device(
    payload: DisplayDeviceRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> DisplayDeviceSchema:
    try:
        return to_display_device_schema(DisplayDeviceService(session).create_device(user.organization_id, payload.label))
    except ValueError as exc:
        raise _map_value_error(exc) from exc


@router.patch("/{device_id}", response_model=DisplayDeviceSchema)
def rename_display_device(
    device_id: str,
    payload: DisplayDeviceRenameRequest,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> DisplayDeviceSchema:
    try:
        return to_display_device_schema(
            DisplayDeviceService(session).rename_device(user.organization_id, device_id, payload.label)
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "display_device_not_found", "message": str(exc)}) from exc
    except ValueError as exc:
        raise _map_value_error(exc) from exc


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_display_device(
    device_id: str,
    user: CurrentUser = Depends(require_roles(CONTENT_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> Response:
    try:
        DisplayDeviceService(session).delete_device(user.organization_id, device_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "display_device_not_found", "message": str(exc)}) from exc
    except ValueError as exc:
        raise _map_value_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
