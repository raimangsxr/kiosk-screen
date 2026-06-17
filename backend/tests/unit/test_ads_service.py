import pytest

from app.api.schemas import AdItemRequest, ClientRequest
from app.repositories.models.client import Client
from app.services.ads_service import AdsService
from app.services.bootstrap_service import bootstrap_mvp_data


def test_ads_service_requires_active_client_for_active_ads(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    inactive = Client(organization_id=result.organization.id, name="Inactive", is_active=False)
    db_session.add(inactive)
    db_session.commit()
    payload = AdItemRequest(
        clientId=inactive.id,
        label="Blocked",
        sourceReference="https://example.com/blocked.jpg",
        isActive=True,
        displayOrder=1
    )

    with pytest.raises(ValueError):
        AdsService(db_session).create_ad(result.organization.id, result.administrator.id, payload)


def test_ads_service_creates_client_and_ad(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdsService(db_session)
    client = service.create_client(result.organization.id, result.administrator.id, ClientRequest(name="Sponsor", isActive=True))
    ad = service.create_ad(
        result.organization.id,
        result.administrator.id,
        AdItemRequest(
            clientId=client.id,
            label="Sponsor Ad",
            sourceReference="https://example.com/sponsor.jpg",
            isActive=True,
            displayOrder=2
        )
    )

    assert ad.client_id == client.id


def test_ads_service_updates_client_and_blocks_delete_with_active_ads(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdsService(db_session)
    client = service.create_client(result.organization.id, result.administrator.id, ClientRequest(name="Sponsor", isActive=True))
    service.create_ad(
        result.organization.id,
        result.administrator.id,
        AdItemRequest(
            clientId=client.id,
            label="Sponsor Ad",
            sourceReference="https://example.com/sponsor.jpg",
            isActive=True,
            displayOrder=2
        )
    )

    updated = service.update_client(result.organization.id, result.administrator.id, client.id, ClientRequest(name="Sponsor Updated", isActive=False))

    assert updated.name == "Sponsor Updated"
    with pytest.raises(ValueError):
        service.delete_client(result.organization.id, result.administrator.id, client.id)
