from app.repositories.models.ad import ClientAdItem
from app.repositories.models.client import Client
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.organization import Organization


def test_content_ad_client_and_event_models(db_session):
    organization = Organization(name="Owner")
    db_session.add(organization)
    db_session.flush()
    client = Client(organization_id=organization.id, name="Client", is_active=True)
    content = TopContentItem(
        organization_id=organization.id,
        title="Welcome",
        content_type="photo",
        source_reference="https://example.com/welcome.jpg",
        is_active=True,
        display_order=1
    )
    db_session.add_all([client, content])
    db_session.flush()
    ad = ClientAdItem(
        organization_id=organization.id,
        client_id=client.id,
        label="Ad",
        source_reference="https://example.com/ad.jpg",
        is_active=True,
        display_order=1
    )
    event = DisplayEvent(
        organization_id=organization.id,
        event_type="content_changed",
        severity="info",
        message="Content changed"
    )
    db_session.add_all([ad, event])
    db_session.commit()

    assert content.display_order == 1
    assert ad.client_id == client.id
    assert event.event_type == "content_changed"

