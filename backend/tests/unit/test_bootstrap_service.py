from app.auth.service import verify_password
from app.config import Settings
from app.repositories.models.user import User
from app.services.bootstrap_service import bootstrap_mvp_data, ensure_mvp_bootstrap_data


def test_bootstrap_service_creates_mvp_fixture_data(db_session):
    result = bootstrap_mvp_data(
        db_session,
        admin_email="admin@example.com",
        admin_password="admin",
        admin_display_name="Administrator"
    )
    db_session.commit()

    assert result.organization.name == "Default Organization"
    assert result.ad.advertiser == "Sample Client"
    assert result.top_content.is_active is True
    assert result.configuration.top_region_ratio == 5
    assert verify_password("admin", result.administrator.password_hash) is True


def test_ensure_mvp_bootstrap_data_is_idempotent(db_session):
    settings = Settings(
        database_url="sqlite+pysqlite:///:memory:",
        session_secret="test",
        frontend_origin="http://localhost:4200",
        bootstrap_admin_email="admin@example.com",
        bootstrap_admin_password="admin",
        bootstrap_admin_display_name="Administrator"
    )

    assert ensure_mvp_bootstrap_data(db_session, settings) is True
    db_session.commit()
    assert ensure_mvp_bootstrap_data(db_session, settings) is False

    users = db_session.query(User).all()
    assert len(users) == 2
    assert any(user.email == "admin@example.com" for user in users)
