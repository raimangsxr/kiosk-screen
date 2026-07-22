from __future__ import annotations

from collections.abc import Iterator

import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def api_client() -> Iterator[TestClient]:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    with factory() as seed_session:
        bootstrap_mvp_data(seed_session, "admin@example.com", "admin")
        seed_session.commit()

    def override_session() -> Iterator[Session]:
        with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.state.skip_bootstrap = True
    app.state.orchestrator_session_factory = factory
    OrchestratorRegistry.configure(factory)
    client = TestClient(app)
    get_display_sse_hub().start()
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()
        app.state.skip_bootstrap = False
        OrchestratorRegistry.reset()
        reset_display_sse_hub()
        redis_state.reset_redis_client(None)


def _login_admin(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert response.status_code == 200


def _login_operator(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    assert response.status_code == 200


def _open_display(client: TestClient) -> None:
    response = client.post("/api/display/open")
    assert response.status_code == 200


def test_register_without_label_returns_422(api_client: TestClient) -> None:
    _login_operator(api_client)
    _open_display(api_client)
    response = api_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "client-no-label"},
    )
    assert response.status_code == 422


def test_display_device_crud_and_iframe_display_scales(api_client: TestClient) -> None:
    _login_admin(api_client)
    create_device = api_client.post("/api/admin/display-devices", json={"label": "Pantalla A"})
    assert create_device.status_code == 201
    device_id = create_device.json()["id"]

    iframe = api_client.post(
        "/api/iframes",
        json={"url": "https://example.org/scale-test", "scaleX": 1, "scaleY": 1},
    )
    assert iframe.status_code == 201
    iframe_id = iframe.json()["id"]

    save = api_client.put(
        f"/api/iframes/{iframe_id}/display-scales",
        json={"items": [{"displayDeviceId": device_id, "scaleX": 1.25, "scaleY": 0.8}]},
    )
    assert save.status_code == 200
    body = save.json()
    assert body["displayScales"][0]["source"] == "override"
    assert body["displayScales"][0]["scaleX"] == 1.25

    clear = api_client.put(
        f"/api/iframes/{iframe_id}/display-scales",
        json={"items": [{"displayDeviceId": device_id, "clear": True}]},
    )
    assert clear.status_code == 200
    assert clear.json()["displayScales"][0]["source"] == "default"

    rename = api_client.patch(f"/api/admin/display-devices/{device_id}", json={"label": "Pantalla Renamed"})
    assert rename.status_code == 200
    assert rename.json()["label"] == "Pantalla Renamed"

    delete_iframe = api_client.delete(f"/api/iframes/{iframe_id}")
    assert delete_iframe.status_code == 204
