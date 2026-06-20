from app.domain.display_events import create_display_event
from app.repositories.configuration import ConfigurationRepository
from app.repositories.events import DisplayEventRepository
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.organization import Organization
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User
from app.repositories.users import UserRepository


def test_shared_repositories_store_and_load_foundation_entities(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.flush()
    user = User(
        organization_id=organization.id,
        email="admin@example.com",
        display_name="Admin",
        password_hash="hash",
        is_active=True
    )
    UserRepository(db_session).add(user)
    db_session.flush()
    db_session.add(RoleAssignment(organization_id=organization.id, user_id=user.id, role="administrator"))
    configuration = ConfigurationRepository(db_session).add(
        KioskDisplayConfiguration(
            organization_id=organization.id,
            name="Main"
        )
    )
    DisplayEventRepository(db_session).record(
        create_display_event(organization.id, "display_opened", "info", "Display opened")
    )
    db_session.commit()

    users = UserRepository(db_session)
    assert users.get_by_email(organization.id, "admin@example.com").id == user.id
    assert users.list_roles(user.id) == ["administrator"]
    assert ConfigurationRepository(db_session).get_for_organization(organization.id).id == configuration.id
    assert len(DisplayEventRepository(db_session).list_recent(organization.id)) == 1
