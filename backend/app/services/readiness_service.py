from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.readiness import ReadinessInput, ReadinessResult, evaluate_readiness
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_ads, eligible_top_content
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.services.media_storage_service import MediaStorageService

def _missing_media_sources(session: Session, organization_id: str) -> list[str]:
    storage = MediaStorageService(session)
    warnings: list[str] = []

    content_items = session.scalars(
        select(TopContentItem).where(
            TopContentItem.organization_id == organization_id,
            TopContentItem.is_active.is_(True),
            TopContentItem.media_file_id.is_not(None)
        )
    )
    for item in content_items:
        if item.media_file is None:
            continue
        label = f'"{item.title}"' if item.title else f'"item #{item.display_order}"'
        try:
            if not storage.absolute_path(item.media_file).exists():
                warnings.append(item.title or f"item #{item.display_order}")
        except (PermissionError, OSError):
            warnings.append(f"Source for {label} could not be verified.")

    ad_items = session.scalars(
        select(ClientAdItem).where(
            ClientAdItem.organization_id == organization_id,
            ClientAdItem.is_active.is_(True),
            ClientAdItem.media_file_id.is_not(None)
        )
    )
    for item in ad_items:
        if item.media_file is None:
            continue
        label = f'"ad #{item.display_order}"'
        try:
            if not storage.absolute_path(item.media_file).exists():
                warnings.append(f"ad #{item.display_order}")
        except (PermissionError, OSError):
            warnings.append(f"Source for {label} could not be verified.")

    return warnings


class ReadinessService:
    def __init__(self, session: Session):
        self.session = session

    def evaluate(self, organization_id: str) -> ReadinessResult:
        configuration = self.session.scalar(
            select(KioskDisplayConfiguration).where(
                KioskDisplayConfiguration.organization_id == organization_id
            )
        )
        return evaluate_readiness(
            ReadinessInput(
                configuration_enabled=bool(configuration and configuration.is_enabled),
                event_duration_minutes=configuration.configured_event_duration_minutes if configuration else None,
                active_top_content_count=len(eligible_top_content(self.session, organization_id)) if configuration else 0,
                active_ad_count=len(eligible_ads(self.session, organization_id)) if configuration else 0,
                invalid_sources=_missing_media_sources(self.session, organization_id) if configuration else []
            )
        )
