from app.api.schemas import ContentItemRequest, KioskConfigurationRequest, UserRequest
from app.repositories.models.content import TopContentItem
from app.repositories.models.media import MediaFileReference
from app.repositories.base import new_id
from app.services.admin_service import AdminService
from app.services.content_service import ContentService
from app.services.bootstrap_service import bootstrap_mvp_data
from app.services.readiness_service import ReadinessService, _missing_media_sources


def _insert_content_with_missing_media(db_session, organization_id: str, title: str, display_order: int) -> None:
    media_id = new_id()
    db_session.add(MediaFileReference(
        id=media_id,
        organization_id=organization_id,
        storage_path=f"{organization_id}/does-not-exist-{media_id}.jpg",
        public_reference=f"/api/media/{media_id}",
        original_filename="missing.jpg",
        media_type="image",
        content_type="image/jpeg",
        file_size_bytes=1024,
    ))
    db_session.add(TopContentItem(
        id=new_id(),
        organization_id=organization_id,
        title=title,
        content_type="photo",
        source_reference="https://example.com/missing.jpg",
        media_file_id=media_id,
        is_active=True,
        display_order=display_order,
    ))


def test_readiness_service_reports_ready_seed_data(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    report = ReadinessService(db_session).evaluate(result.organization.id)

    assert report.ready is True


def test_readiness_service_reports_missing_media(db_session, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_PATH", str(tmp_path))
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    _insert_content_with_missing_media(db_session, result.organization.id, "Lost image", display_order=10)
    db_session.commit()

    report = ReadinessService(db_session).evaluate(result.organization.id)

    assert "Source may be unavailable: Lost image" in report.warnings


def test_readiness_service_ignores_inactive_content_with_missing_media(db_session, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_PATH", str(tmp_path))
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    media_id = new_id()
    db_session.add(MediaFileReference(
        id=media_id,
        organization_id=result.organization.id,
        storage_path=f"{result.organization.id}/missing.jpg",
        public_reference=f"/api/media/{media_id}",
        original_filename="missing.jpg",
        media_type="image",
        content_type="image/jpeg",
        file_size_bytes=1024,
    ))
    db_session.add(TopContentItem(
        id=new_id(),
        organization_id=result.organization.id,
        title="Inactive missing",
        content_type="photo",
        source_reference="https://example.com/missing.jpg",
        media_file_id=media_id,
        is_active=False,
        display_order=10,
    ))
    db_session.commit()

    report = ReadinessService(db_session).evaluate(result.organization.id)

    assert "Inactive missing" not in report.warnings


def test_readiness_service_swallows_filesystem_errors(db_session, tmp_path, monkeypatch):
    from pathlib import Path
    from app.services import media_storage_service as media_module

    def _explode(self, _media):
        raise PermissionError("nope")

    monkeypatch.setenv("MEDIA_STORAGE_PATH", str(tmp_path))
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    _insert_content_with_missing_media(db_session, result.organization.id, "Locked image", display_order=10)
    db_session.commit()

    monkeypatch.setattr(media_module.MediaStorageService, "absolute_path", _explode)

    report = ReadinessService(db_session).evaluate(result.organization.id)

    assert any('"Locked image"' in w and "could not be verified" in w for w in report.warnings)
    assert not any(w == "Locked image" or w == "Source may be unavailable: Locked image" for w in report.warnings)


def test_readiness_helper_directly_returns_empty_when_no_media(db_session, tmp_path, monkeypatch):
    monkeypatch.setenv("MEDIA_STORAGE_PATH", str(tmp_path))
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()

    warnings = _missing_media_sources(db_session, result.organization.id)

    assert warnings == []


def test_admin_service_updates_configuration_and_users(db_session):
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    service = AdminService(db_session)

    config = service.update_configuration(
        result.organization.id,
        result.administrator.id,
        KioskConfigurationRequest(
            name="Updated",
            defaultTopDurationSeconds=20,
            defaultAdDurationSeconds=10,
            configuredEventDurationMinutes=60,
            isEnabled=True
        )
    )
    user, roles = service.create_user(
        result.organization.id,
        result.administrator.id,
        UserRequest(email="viewer@example.com", displayName="Viewer", roles=["display_viewer"], isActive=True)
    )

    assert config.name == "Updated"
    assert user.organization_id == result.organization.id
    assert roles == ["display_viewer"]
