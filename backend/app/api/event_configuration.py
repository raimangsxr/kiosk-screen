from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.mappers import to_event_configuration_schema
from app.api.schemas import EventConfigurationSchema
from app.auth.dependencies import CurrentUser, require_roles
from app.domain.roles import CONFIGURATION_MANAGEMENT_ROLES
from app.repositories.session import get_session
from app.services.event_configuration_service import EventConfigurationService

router = APIRouter(prefix="/event-configuration", tags=["Event Configuration"])


@router.get("", response_model=EventConfigurationSchema)
def get_event_configuration(
    user: CurrentUser = Depends(require_roles(CONFIGURATION_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> EventConfigurationSchema:
    service = EventConfigurationService(session)
    row = service.get_or_create(user.organization_id)
    return to_event_configuration_schema(row, service.logo_media(row))


@router.put("", response_model=EventConfigurationSchema)
async def update_event_configuration(
    request: Request,
    event_name: str = Form("", alias="eventName"),
    organizer_name: str = Form("", alias="organizerName"),
    event_duration_minutes: int = Form(240, alias="eventDurationMinutes"),
    file: UploadFile | None = File(default=None),
    remove_logo: bool = Form(False, alias="removeLogo"),
    user: CurrentUser = Depends(require_roles(CONFIGURATION_MANAGEMENT_ROLES)),
    session: Session = Depends(get_session),
) -> EventConfigurationSchema:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type.lower():
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="multipart/form-data required.")
    service = EventConfigurationService(session)
    try:
        row = service.update(
            user.organization_id,
            user.id,
            {
                "eventName": event_name,
                "organizerName": organizer_name,
                "eventDurationMinutes": event_duration_minutes,
            },
            file=file,
            remove_logo=remove_logo,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return to_event_configuration_schema(row, service.logo_media(row))
