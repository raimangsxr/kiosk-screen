from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.embedded_domains import source_domain
from app.domain.readiness import ReadinessInput, ReadinessResult, evaluate_readiness
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_ads, eligible_top_content
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.services.media_storage_service import MediaStorageService


def _approved_domain_hosts(session: Session, organization_id: str) -> set[str]:
    return {
        domain.domain for domain in session.scalars(
            select(ApprovedEmbeddedDomain).where(
                ApprovedEmbeddedDomain.organization_id == organization_id,
                ApprovedEmbeddedDomain.is_active.is_(True)
            )
        )
    }


def _unapproved_embedded_domains(session: Session, organization_id: str) -> list[str]:
    approved = {host.lower() for host in _approved_domain_hosts(session, organization_id)}
    non_approved: set[str] = set()
    items = session.scalars(
        select(TopContentItem).where(
            TopContentItem.organization_id == organization_id,
            TopContentItem.is_active.is_(True),
            TopContentItem.content_type == "embedded_web"
        )
    )
    for item in items:
        parsed = urlparse(item.source_reference)
        if not parsed.scheme or not parsed.netloc:
            non_approved.add("<unparseable-url>")
            continue
        host = source_domain(item.source_reference)
        if host not in approved:
            non_approved.add(host)
    return sorted(non_approved)


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
                unapproved_embedded_domains=_unapproved_embedded_domains(self.session, organization_id) if configuration else [],
                invalid_sources=_missing_media_sources(self.session, organization_id) if configuration else []
            )
        )
