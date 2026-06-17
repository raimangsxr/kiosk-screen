from fastapi.testclient import TestClient


PNG_BYTES = b"\x89PNG\r\n\x1a\n"


def test_content_upload_creates_protected_media(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    response = api_client.post(
        "/api/content/upload",
        data={
            "title": "Uploaded Image",
            "contentType": "photo",
            "isActive": "true",
            "displayOrder": "3",
            "durationSeconds": "7",
            "rotationAnimation": "fade",
            "animationDurationMilliseconds": "250"
        },
        files={"file": ("screen.png", PNG_BYTES, "image/png")}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["mediaFile"]["originalFilename"] == "screen.png"
    assert body["sourceReference"] == body["mediaFile"]["mediaUrl"]
    assert body["rotationAnimation"] == "fade"

    media = api_client.get(body["mediaFile"]["mediaUrl"])
    assert media.status_code == 200

    api_client.cookies.clear()
    denied = api_client.get(body["mediaFile"]["mediaUrl"])
    assert denied.status_code == 401


def test_ad_upload_creates_media_reference(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    client = api_client.post("/api/clients", json={"name": "Upload Sponsor", "isActive": True})
    assert client.status_code == 201

    response = api_client.post(
        "/api/ads/upload",
        data={
            "clientId": client.json()["id"],
            "label": "Uploaded Ad",
            "isActive": "true",
            "displayOrder": "4",
            "rotationAnimation": "slide"
        },
        files={"file": ("ad.png", PNG_BYTES, "image/png")}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["mediaFile"]["mediaType"] == "image"
    assert body["rotationAnimation"] == "slide"
