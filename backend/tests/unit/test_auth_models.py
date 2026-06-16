from datetime import timedelta

from app.domain.roles import Role
from app.repositories.base import utc_now
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.organization import Organization
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.models.user import User


def test_role_assignment_and_operator_session_models(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.flush()
    user = User(
        organization_id=organization.id,
        email="operator@example.com",
        display_name="Operator",
        password_hash="hash",
        is_active=True
    )
    db_session.add(user)
    db_session.flush()
    config = KioskDisplayConfiguration(
        organization_id=organization.id,
        name="Main",
        configured_event_duration_minutes=120
    )
    db_session.add(config)
    db_session.flush()

    role = RoleAssignment(organization_id=organization.id, user_id=user.id, role=Role.EVENT_OPERATOR.value)
    session = OperatorSession(
        organization_id=organization.id,
        user_id=user.id,
        display_configuration_id=config.id,
        valid_until=utc_now() + timedelta(minutes=120)
    )
    db_session.add_all([role, session])
    db_session.commit()

    assert role.role == "event_operator"
    assert session.valid_until > session.created_at

