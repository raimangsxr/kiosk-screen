from fastapi.testclient import TestClient


PNG_BYTES = b"\x89PNG\r\n\x1a\n"
MP4_BYTES = b"\x00\x00\x00\x20ftypmp41\x00\x00\x00\x00"


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


def test_content_upload_autodetects_video_from_mp4_extension(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    response = api_client.post(
        "/api/content/upload",
        data={
            "title": "Clip",
            "contentType": "photo",
            "isActive": "true",
        },
        files={"file": ("clip.mp4", MP4_BYTES, "video/mp4")},
    )

    assert response.status_code == 201
    assert response.json()["contentType"] == "video"

    events = api_client.get("/api/events").json()
    assert any(event["eventType"] == "content_type_autodetected" for event in events)


def test_content_upload_unsupported_extension_returns_415(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    response = api_client.post(
        "/api/content/upload",
        data={"title": "Bad file", "contentType": "photo", "isActive": "true"},
        files={"file": ("clip.xyz", b"data", "application/octet-stream")},
    )

    assert response.status_code == 415
    assert response.json()["code"] == "unsupported_media_type"


def test_content_replace_upload_updates_media_file(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    created = api_client.post(
        "/api/content/upload",
        data={"title": "Original", "contentType": "photo", "isActive": "true"},
        files={"file": ("original.png", PNG_BYTES, "image/png")},
    )
    assert created.status_code == 201
    content_id = created.json()["id"]
    previous_media_id = created.json()["mediaFile"]["id"]

    replaced = api_client.put(
        f"/api/content/{content_id}/upload",
        data={"title": "Replacement", "contentType": "photo", "isActive": "true"},
        files={"file": ("replacement.png", PNG_BYTES, "image/png")},
    )
    assert replaced.status_code == 200
    body = replaced.json()
    assert body["title"] == "Replacement"
    assert body["mediaFile"]["originalFilename"] == "replacement.png"
    assert body["mediaFile"]["id"] != previous_media_id


def test_ad_upload_creates_media_reference(api_client: TestClient):
    api_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})

    response = api_client.post(
        "/api/ads/upload",
        data={
            "advertiser": "Upload Sponsor",
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
    assert body["advertiser"] == "Upload Sponsor"
    assert "clientId" not in body
