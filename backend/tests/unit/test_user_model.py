from app.repositories.models.organization import Organization
from app.repositories.models.user import User


def test_user_belongs_to_single_organization(db_session):
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
    db_session.add(user)
    db_session.commit()

    assert user.organization_id == organization.id
    assert user.is_active is True

