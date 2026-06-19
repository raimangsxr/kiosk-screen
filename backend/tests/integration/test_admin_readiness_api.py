from fastapi.testclient import TestClient

from app.repositories.base import new_id
from app.repositories.models.content import TopContentItem
from app.repositories.models.media import MediaFileReference
from app.repositories.session import get_session


def _open_test_session(api_client: TestClient):
    gen = api_client.app.dependency_overrides[get_session]()
    return next(gen)


def test_admin_readiness_configuration_domains_events_and_users(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    assert api_client.get("/api/readiness").status_code == 200
    configuration = api_client.get("/api/display/configuration")
    assert configuration.status_code == 200

    updated = api_client.put("/api/display/configuration", json={
        "name": "Main Kiosk",
        "defaultTopDurationSeconds": 20,
        "defaultAdDurationSeconds": 12,
        "configuredEventDurationMinutes": 180,
        "isEnabled": True
    })
    assert updated.status_code == 200
    assert updated.json()["configuredEventDurationMinutes"] == 180

    domain = api_client.post("/api/approved-domains", json={"domain": "example.org", "isActive": True})
    assert domain.status_code == 201
    domain_id = domain.json()["id"]
    domain_updated = api_client.put(f"/api/approved-domains/{domain_id}", json={"domain": "example.org", "isActive": False})
    assert domain_updated.status_code == 200
    assert domain_updated.json()["isActive"] is False
    assert api_client.delete(f"/api/approved-domains/{domain_id}").status_code == 204
    assert api_client.get("/api/approved-domains").status_code == 200
    assert api_client.get("/api/events").status_code == 200
    assert api_client.get("/api/users").status_code == 200

    user = api_client.post("/api/users", json={
        "email": "new@example.com",
        "displayName": "New User",
        "roles": ["display_viewer"],
        "isActive": True
    })
    assert user.status_code == 201
    assert user.json()["roles"] == ["display_viewer"]


def test_get_readiness_includes_unapproved_domain_blocker(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    initial = api_client.get("/api/readiness").json()
    initial_blockers = list(initial["blockers"])
    assert "Embedded domain is not approved: dashboard.example.com" not in initial_blockers

    domain = api_client.post("/api/approved-domains", json={"domain": "dashboard.example.com", "isActive": True}).json()
    iframe = api_client.post("/api/content", json={
        "title": "Dashboard widget",
        "contentType": "embedded_web",
        "sourceReference": "https://dashboard.example.com/widget",
        "approvedDomainId": domain["id"],
        "isActive": True,
        "displayOrder": 5
    })
    assert iframe.status_code == 201

    after_create = api_client.get("/api/readiness").json()
    assert "Embedded domain is not approved: dashboard.example.com" not in after_create["blockers"]

    deactivated = api_client.put(f"/api/approved-domains/{domain['id']}", json={"domain": "dashboard.example.com", "isActive": False})
    assert deactivated.status_code == 200

    final = api_client.get("/api/readiness").json()
    assert "Embedded domain is not approved: dashboard.example.com" in final["blockers"]
    assert final["ready"] is False
    assert len(final["blockers"]) > len(initial_blockers)


def test_get_readiness_includes_missing_media_warning(api_client: TestClient, tmp_path, monkeypatch):
    from app.repositories.models.organization import Organization

    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    monkeypatch.setenv("MEDIA_STORAGE_PATH", str(tmp_path))

    initial = api_client.get("/api/readiness").json()
    initial_warnings = list(initial["warnings"])
    assert "Source may be unavailable: Lost upload" not in initial_warnings

    session = _open_test_session(api_client)
    try:
        org = session.query(Organization).filter(Organization.name == "Default Organization").one()
        media_id = new_id()
        session.add(MediaFileReference(
            id=media_id,
            organization_id=org.id,
            storage_path=f"{org.id}/missing-{media_id}.jpg",
            public_reference=f"/api/media/{media_id}",
            original_filename="missing.jpg",
            media_type="image",
            content_type="image/jpeg",
            file_size_bytes=1024,
        ))
        session.add(TopContentItem(
            id=new_id(),
            organization_id=org.id,
            title="Lost upload",
            content_type="photo",
            source_reference="https://example.com/missing.jpg",
            media_file_id=media_id,
            is_active=True,
            display_order=10,
        ))
        session.commit()
    finally:
        session.close()

    final = api_client.get("/api/readiness").json()
    assert "Source may be unavailable: Lost upload" in final["warnings"]
