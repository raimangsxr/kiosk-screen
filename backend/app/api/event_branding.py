from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.mappers import to_event_branding_schema
from app.api.schemas import EventBrandingSchema
from app.repositories.models.organization import Organization
from app.repositories.session import get_session
from app.services.event_configuration_service import EventConfigurationService

router = APIRouter(prefix="/event-branding", tags=["Event Branding"])


@router.get("", response_model=EventBrandingSchema)
def get_event_branding(session: Session = Depends(get_session)) -> EventBrandingSchema:
    organization = session.scalar(select(Organization).order_by(Organization.created_at, Organization.id).limit(1))
    if organization is None:
        return EventBrandingSchema(eventName="", organizerName="", organizerLogoUrl=None)
    service = EventConfigurationService(session)
    row = service.get_or_create(organization.id)
    media = service.logo_media(row)
    return to_event_branding_schema(row, media.public_reference if media else None)
