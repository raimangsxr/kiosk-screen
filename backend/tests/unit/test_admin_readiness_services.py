from app.api.schemas import ApprovedEmbeddedDomainRequest, KioskConfigurationRequest, UserRequest
from app.services.admin_service import AdminService
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.readiness_service import ReadinessService


def test_readiness_service_reports_ready_seed_data(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    report = ReadinessService(db_session).evaluate(result.organization.id)

    assert report.ready is True


def test_admin_service_updates_configuration_domains_and_users(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdminService(db_session)

    config = service.update_configuration(
        result.organization.id,
        result.administrator.id,
        KioskConfigurationRequest(
            name="Updated",
            defaultTopDurationSeconds=20,
            defaultAdDurationSeconds=10,
            configuredEventDurationMinutes=60,
            isEnabled=True
        )
    )
    domain = service.create_domain(result.organization.id, result.administrator.id, ApprovedEmbeddedDomainRequest(domain="example.org", isActive=True))
    user, roles = service.create_user(
        result.organization.id,
        result.administrator.id,
        UserRequest(email="viewer@example.com", displayName="Viewer", roles=["display_viewer"], isActive=True)
    )

    assert config.name == "Updated"
    assert domain.domain == "example.org"
    assert user.organization_id == result.organization.id
    assert roles == ["display_viewer"]
