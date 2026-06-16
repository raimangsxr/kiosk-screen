from app.repositories.models.approved_domain import ApprovedEmbeddedDomain
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.organization import Organization


def test_configuration_and_approved_domain_models(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.flush()

    configuration = KioskDisplayConfiguration(
        organization_id=organization.id,
        name="Main",
        configured_event_duration_minutes=60
    )
    domain = ApprovedEmbeddedDomain(
        organization_id=organization.id,
        domain="example.com",
        is_active=True
    )
    db_session.add_all([configuration, domain])
    db_session.commit()

    assert configuration.top_region_ratio == 4
    assert configuration.bottom_region_ratio == 1
    assert domain.is_active is True

