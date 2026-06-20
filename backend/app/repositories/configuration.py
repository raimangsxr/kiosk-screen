from sqlalchemy import select
from sqlalchemy.orm import Session

from app.repositories.base import new_id
from app.repositories.models.event_configuration import EventConfiguration
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration


class ConfigurationRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, configuration: KioskDisplayConfiguration) -> KioskDisplayConfiguration:
        self.session.add(configuration)
        return configuration

    def get_for_organization(self, organization_id: str) -> KioskDisplayConfiguration | None:
        statement = select(KioskDisplayConfiguration).where(
            KioskDisplayConfiguration.organization_id == organization_id
        )
        return self.session.scalar(statement)

    def get_event_for_organization(self, organization_id: str) -> EventConfiguration | None:
        statement = select(EventConfiguration).where(EventConfiguration.organization_id == organization_id)
        return self.session.scalar(statement)

    def get_or_create_event_for_organization(
        self,
        organization_id: str,
        event_duration_minutes: int = 240,
    ) -> EventConfiguration:
        row = self.get_event_for_organization(organization_id)
        if row is not None:
            return row
        row = EventConfiguration(
            id=new_id(),
            organization_id=organization_id,
            event_name="",
            organizer_name="",
            organizer_logo_media_id=None,
            event_duration_minutes=event_duration_minutes,
        )
        self.session.add(row)
        self.session.flush()
        return row
