from app.repositories.models.iframe import Iframe
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.organization import Organization


def test_configuration_and_iframe_models(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.flush()

    configuration = KioskDisplayConfiguration(
        organization_id=organization.id,
        name="Main",
        configured_event_duration_minutes=60
    )
    iframe = Iframe(
        organization_id=organization.id,
        url="https://example.com",
    )
    db_session.add_all([configuration, iframe])
    db_session.commit()

    assert configuration.top_region_ratio == 4
    assert configuration.bottom_region_ratio == 1
    assert configuration.video_end_delay_seconds == 2
    assert iframe.url == "https://example.com"
