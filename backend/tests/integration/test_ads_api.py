from fastapi.testclient import TestClient


def test_ads_api_client_and_ad_flow(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    client = api_client.post("/api/clients", json={"name": "Sponsor", "isActive": True})
    assert client.status_code == 201
    client_id = client.json()["id"]

    ad_payload = {
        "clientId": client_id,
        "label": "Sponsor Board",
        "sourceReference": "https://example.com/sponsor.jpg",
        "isActive": True,
        "displayOrder": 2,
        "durationSeconds": 10
    }
    ad = api_client.post("/api/ads", json=ad_payload)
    assert ad.status_code == 201
    ad_id = ad.json()["id"]

    assert api_client.get("/api/clients").status_code == 200
    assert api_client.get("/api/ads").status_code == 200
    assert api_client.get(f"/api/ads/{ad_id}").status_code == 200
    assert api_client.put(f"/api/ads/{ad_id}", json={**ad_payload, "label": "Updated"}).json()["label"] == "Updated"
    assert api_client.delete(f"/api/ads/{ad_id}").status_code == 204
