from io import BytesIO

import pytest
from fastapi import UploadFile

from app.domain.media import validate_logo_upload
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.event_configuration_service import EventConfigurationService


def test_get_or_create_returns_bootstrap_event_configuration(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    row = EventConfigurationService(db_session).get_or_create(result.organization.id)

    assert row.event_duration_minutes == 240
    assert row.event_name == ""


def test_update_rejects_invalid_duration(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    with pytest.raises(ValueError, match="greater than 0"):
        EventConfigurationService(db_session).update(
            result.organization.id,
            result.administrator.id,
            {"eventDurationMinutes": 0},
        )


def test_update_rejects_ambiguous_logo_intent(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    upload = UploadFile(filename="logo.png", file=BytesIO(b"png"), headers=None)
    upload.headers = {"content-type": "image/png"}

    with pytest.raises(ValueError, match="must not both be set"):
        EventConfigurationService(db_session).update(
            result.organization.id,
            result.administrator.id,
            {"eventDurationMinutes": 240},
            file=upload,
            remove_logo=True,
        )


def test_validate_logo_upload_rejects_type_size_and_empty_file():
    with pytest.raises(ValueError, match="empty"):
        validate_logo_upload("image/png", 0)
    with pytest.raises(ValueError, match="Unsupported"):
        validate_logo_upload("image/bmp", 10)
    with pytest.raises(ValueError, match="too large"):
        validate_logo_upload("image/png", 1024 * 1024 + 1)
