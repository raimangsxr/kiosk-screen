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


class TestCleanLayout:
    """CHG-023 / T017 — layout payload parsing & validation."""

    def _service(self, db_session):
        result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
        db_session.commit()
        return EventConfigurationService(db_session), result

    def test_accepts_json_string(self, db_session):
        service, bootstrap = self._service(db_session)
        layout = service._clean_layout(
            '{"size": 4, "x": 2, "y": 0, "transparency": 80, "borderRadius": 2}',
            "logoLayout",
        )
        assert layout == {
            "size": 4.0,
            "x": 2.0,
            "y": 0.0,
            "transparency": 80,
            "borderRadius": 2.0,
        }

    def test_accepts_dict(self, db_session):
        service, bootstrap = self._service(db_session)
        layout = service._clean_layout(
            {"size": 4, "x": 2, "y": 0, "transparency": 80, "borderRadius": 2},
            "logoLayout",
        )
        assert layout["size"] == 4.0

    def test_returns_none_for_empty_string(self, db_session):
        service, _ = self._service(db_session)
        assert service._clean_layout("", "logoLayout") is None
        assert service._clean_layout("   ", "logoLayout") is None
        assert service._clean_layout("null", "logoLayout") is None
        assert service._clean_layout(None, "logoLayout") is None
        assert service._clean_layout({}, "logoLayout") is None

    def test_rejects_out_of_range_size(self, db_session):
        service, _ = self._service(db_session)
        with pytest.raises(ValueError, match="logoLayout"):
            service._clean_layout({"size": 999}, "logoLayout")

    def test_rejects_out_of_range_transparency(self, db_session):
        service, _ = self._service(db_session)
        with pytest.raises(ValueError, match="eventNameLayout"):
            service._clean_layout({"transparency": 150}, "eventNameLayout")

    def test_rejects_malformed_json(self, db_session):
        service, _ = self._service(db_session)
        with pytest.raises(ValueError, match="logoLayout"):
            service._clean_layout("{not json}", "logoLayout")

    def test_rejects_non_object_payload(self, db_session):
        service, _ = self._service(db_session)
        with pytest.raises(ValueError, match="logoLayout"):
            service._clean_layout([1, 2, 3], "logoLayout")


class TestUpdateLayoutPersistence:
    """CHG-023 / T017-T022 — PUT persists the layout fields and records them in `changed_fields`."""

    def test_logo_layout_round_trip(self, db_session):
        result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
        db_session.commit()
        service = EventConfigurationService(db_session)

        row = service.update(
            result.organization.id,
            result.administrator.id,
            {
                "eventDurationMinutes": 240,
                "logoLayout": '{"size": 4, "x": 2, "y": 0, "transparency": 80, "borderRadius": 2}',
            },
        )

        assert row.logo_layout == {
            "size": 4.0,
            "x": 2.0,
            "y": 0.0,
            "transparency": 80,
            "borderRadius": 2.0,
        }

    def test_changing_logo_layout_appends_to_changed_fields(self, db_session):
        result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
        db_session.commit()
        service = EventConfigurationService(db_session)

        service.update(
            result.organization.id,
            result.administrator.id,
            {"eventDurationMinutes": 240},
        )

        service.update(
            result.organization.id,
            result.administrator.id,
            {
                "eventDurationMinutes": 240,
                "logoLayout": '{"size": 8, "x": 1, "y": 0, "transparency": 100, "borderRadius": 0}',
            },
        )

        from app.repositories.events import DisplayEventRepository
        repo = DisplayEventRepository(service.session)
        events = repo.list_recent(result.organization.id)
        config_events = [e for e in events if e.event_type == "event_configuration_changed"]
        assert config_events, "expected event_configuration_changed to be recorded"
        latest = max(config_events, key=lambda e: e.created_at)
        assert "logoLayout" in latest.event_metadata["changedFields"]

    def test_layout_persists_null_when_payload_empty(self, db_session):
        result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
        db_session.commit()
        service = EventConfigurationService(db_session)

        service.update(
            result.organization.id,
            result.administrator.id,
            {"eventDurationMinutes": 240, "logoLayout": '{"size": 8}'},
        )
        row = service.update(
            result.organization.id,
            result.administrator.id,
            {"eventDurationMinutes": 240, "logoLayout": "null"},
        )
        assert row.logo_layout is None
