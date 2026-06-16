from sqlalchemy import select
from sqlalchemy.orm import Session

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

