from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.service import hash_password
from app.config import Settings
from app.domain.roles import Role
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.organization import Organization
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User


@dataclass(frozen=True)
class BootstrapResult:
    organization: Organization
    administrator: User
    operator: User
    configuration: KioskDisplayConfiguration
    top_content: TopContentItem
    ad: ClientAdItem


def bootstrap_mvp_data(
    session: Session,
    admin_email: str,
    admin_password: str,
    admin_display_name: str = "Administrator"
) -> BootstrapResult:
    organization = Organization(name="Default Organization")
    session.add(organization)
    session.flush()

    administrator = User(
        organization_id=organization.id,
        email=admin_email,
        display_name=admin_display_name,
        password_hash=hash_password(admin_password),
        is_active=True
    )
    operator = User(
        organization_id=organization.id,
        email="operator@example.com",
        display_name="Event Operator",
        password_hash=hash_password("operator"),
        is_active=True
    )
    session.add_all([administrator, operator])
    session.flush()

    session.add_all([
        RoleAssignment(organization_id=organization.id, user_id=administrator.id, role=Role.ADMINISTRATOR.value),
        RoleAssignment(organization_id=organization.id, user_id=operator.id, role=Role.EVENT_OPERATOR.value),
    ])

    configuration = KioskDisplayConfiguration(
        organization_id=organization.id,
        name="Main Kiosk",
        is_enabled=True,
        top_region_ratio=4,
        bottom_region_ratio=1,
        default_top_duration_seconds=15,
        default_ad_duration_seconds=10,
        configured_event_duration_minutes=240
    )
    top_content = TopContentItem(
        organization_id=organization.id,
        title="Welcome",
        content_type="photo",
        source_reference="https://example.com/welcome.jpg",
        is_active=True,
        display_order=1,
        duration_seconds=15,
        created_by_user_id=administrator.id,
        updated_by_user_id=administrator.id
    )
    session.add_all([configuration, top_content])
    session.flush()

    ad = ClientAdItem(
        organization_id=organization.id,
        source_reference="https://example.com/ad.jpg",
        is_active=True,
        display_order=1,
        duration_seconds=10,
        advertiser="Sample Client",
        created_by_user_id=administrator.id,
        updated_by_user_id=administrator.id
    )
    session.add(ad)
    session.flush()

    return BootstrapResult(organization, administrator, operator, configuration, top_content, ad)


def ensure_mvp_bootstrap_data(session: Session, settings: Settings) -> bool:
    existing_admin = session.scalar(select(User).where(User.email == settings.bootstrap_admin_email))
    if existing_admin is not None:
        return False

    bootstrap_mvp_data(
        session,
        admin_email=settings.bootstrap_admin_email,
        admin_password=settings.bootstrap_admin_password,
        admin_display_name=settings.bootstrap_admin_display_name
    )
    return True
