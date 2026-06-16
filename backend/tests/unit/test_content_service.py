import pytest

from app.api.schemas import ContentItemRequest
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.content_service import ContentService, validate_content


def test_content_service_rejects_unapproved_embedded_domain(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    payload = ContentItemRequest(
        title="Dashboard",
        contentType="embedded_web",
        sourceReference="https://not-approved.example/app",
        isActive=True,
        displayOrder=1
    )

    with pytest.raises(ValueError):
        validate_content(db_session, result.organization.id, payload)


def test_content_service_creates_and_records_event(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    payload = ContentItemRequest(
        title="Agenda",
        contentType="photo",
        sourceReference="https://example.com/agenda.jpg",
        isActive=True,
        displayOrder=2,
        durationSeconds=12
    )

    item = ContentService(db_session).create(result.organization.id, result.administrator.id, payload)

    assert item.display_order == 2
    assert db_session.query(item.__class__).count() == 2
