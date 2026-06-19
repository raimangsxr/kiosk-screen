from app.api.schemas import AdItemRequest
from app.services.ads_service import AdsService
from app.services.bootstrap_service import bootstrap_mvp_data


def test_ads_service_creates_ad_with_advertiser(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdsService(db_session)
    ad = service.create_ad(
        result.organization.id,
        result.administrator.id,
        AdItemRequest(
            sourceReference="https://example.com/sponsor.jpg",
            isActive=True,
            displayOrder=2,
            advertiser="Sponsor Inc."
        )
    )

    assert ad.advertiser == "Sponsor Inc."


def test_ads_service_updates_advertiser(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdsService(db_session)
    ad = service.create_ad(
        result.organization.id,
        result.administrator.id,
        AdItemRequest(
            sourceReference="https://example.com/sponsor.jpg",
            isActive=True,
            displayOrder=2,
            advertiser="Sponsor Inc."
        )
    )

    updated = service.update_ad(
        result.organization.id,
        result.administrator.id,
        ad.id,
        AdItemRequest(
            sourceReference="https://example.com/sponsor.jpg",
            isActive=True,
            displayOrder=2,
            advertiser="Sponsor Updated"
        )
    )

    assert updated.advertiser == "Sponsor Updated"
