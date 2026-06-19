from fastapi.testclient import TestClient


def test_ads_api_advertiser_and_ad_flow(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    ad_payload = {
        "sourceReference": "https://example.com/sponsor.jpg",
        "isActive": True,
        "displayOrder": 2,
        "durationSeconds": 10,
        "advertiser": "Sponsor Inc."
    }
    ad = api_client.post("/api/ads", json=ad_payload)
    assert ad.status_code == 201
    ad_id = ad.json()["id"]
    assert ad.json()["displayOrder"] == 2
    assert ad.json()["advertiser"] == "Sponsor Inc."
    assert "clientId" not in ad.json()
    assert "label" not in ad.json()

    assert api_client.get("/api/ads").status_code == 200
    assert api_client.get(f"/api/ads/{ad_id}").status_code == 200

    auto_payload = api_client.post("/api/ads", json={
        "sourceReference": "https://example.com/auto.jpg",
        "isActive": True,
        "durationSeconds": 10,
        "advertiser": "Auto"
    })
    assert auto_payload.status_code == 201
    assert auto_payload.json()["displayOrder"] == 3
    auto_id = auto_payload.json()["id"]

    listing = api_client.get("/api/ads").json()
    bootstrap_ad_id = next(item["id"] for item in listing if item["id"] not in {ad_id, auto_id})

    mismatched = api_client.post("/api/ads/reorder", json={"orderedIds": [ad_id, auto_id]})
    assert mismatched.status_code == 409
    ok = api_client.post("/api/ads/reorder", json={"orderedIds": [auto_id, ad_id, bootstrap_ad_id]})
    assert ok.status_code == 204
    after = api_client.get("/api/ads").json()
    assert [item["id"] for item in after[:3]] == [auto_id, ad_id, bootstrap_ad_id]

    assert api_client.put(f"/api/ads/{ad_id}", json={**ad_payload, "durationSeconds": 12, "advertiser": "Updated"}).json()["advertiser"] == "Updated"
    assert api_client.put(f"/api/ads/{ad_id}", json={**ad_payload, "durationSeconds": 12}).json()["durationSeconds"] == 12
    assert api_client.delete(f"/api/ads/{ad_id}").status_code == 204
    assert api_client.delete(f"/api/ads/{auto_id}").status_code == 204


def test_ads_api_clients_endpoints_return_404(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    assert api_client.get("/api/clients").status_code == 404
    assert api_client.post("/api/clients", json={"name": "Sponsor", "isActive": True}).status_code == 404
