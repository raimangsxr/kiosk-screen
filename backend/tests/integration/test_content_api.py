from fastapi.testclient import TestClient

from app.main import app


def test_content_api_crud_flow(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    payload = {
        "title": "Agenda",
        "contentType": "photo",
        "sourceReference": "https://example.com/agenda.jpg",
        "isActive": True,
        "displayOrder": 2,
        "durationSeconds": 10
    }

    created = api_client.post("/api/content", json=payload)
    assert created.status_code == 201
    content_id = created.json()["id"]

    listed = api_client.get("/api/content")
    assert listed.status_code == 200
    assert any(item["title"] == "Agenda" for item in listed.json())

    updated = api_client.put(f"/api/content/{content_id}", json={**payload, "title": "Agenda Updated"})
    assert updated.status_code == 200
    assert updated.json()["title"] == "Agenda Updated"

    assert api_client.delete(f"/api/content/{content_id}").status_code == 204
