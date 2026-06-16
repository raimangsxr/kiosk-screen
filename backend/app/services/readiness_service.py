from sqlalchemy.orm import Session

from app.domain.readiness import ReadinessInput, ReadinessResult, evaluate_readiness
from app.services.display_service import eligible_ads, eligible_top_content
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration


class ReadinessService:
    def __init__(self, session: Session):
        self.session = session

    def evaluate(self, organization_id: str) -> ReadinessResult:
        configuration = self.session.query(KioskDisplayConfiguration).filter(
            KioskDisplayConfiguration.organization_id == organization_id
        ).first()
        return evaluate_readiness(
            ReadinessInput(
                configuration_enabled=bool(configuration and configuration.is_enabled),
                event_duration_minutes=configuration.configured_event_duration_minutes if configuration else None,
                active_top_content_count=len(eligible_top_content(self.session, organization_id)) if configuration else 0,
                active_ad_count=len(eligible_ads(self.session, organization_id)) if configuration else 0,
                invalid_sources=[],
                unapproved_embedded_domains=[]
            )
        )
