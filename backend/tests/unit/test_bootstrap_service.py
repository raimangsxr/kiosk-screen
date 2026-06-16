from app.auth.service import verify_password
from app.services.bootstrap_service import bootstrap_mvp_data


def test_bootstrap_service_creates_mvp_fixture_data(db_session):
    result = bootstrap_mvp_data(
        db_session,
        admin_email="admin@example.com",
        admin_password="admin",
        admin_display_name="Administrator"
    )
    db_session.commit()

    assert result.organization.name == "Default Organization"
    assert result.ad.client_id == result.client.id
    assert result.top_content.is_active is True
    assert result.configuration.top_region_ratio == 4
    assert verify_password("admin", result.administrator.password_hash) is True

