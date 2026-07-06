from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


def test_health_and_readiness_endpoints():
    client = TestClient(app)

    assert client.get("/api/health").json() == {"status": "ok"}
    with patch("app.api.health.evaluate_readiness") as evaluate:
        evaluate.return_value.ready = True
        evaluate.return_value.checks = {"database": "ok", "media_storage": "ok"}
        ready = client.get("/api/ready")
    assert ready.status_code == 200
    assert ready.json() == {"status": "ready"}
