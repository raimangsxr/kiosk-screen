from fastapi.testclient import TestClient

from app.main import app


def test_health_and_readiness_endpoints():
    client = TestClient(app)

    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/ready").json() == {"status": "ready"}

