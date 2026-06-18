from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
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
    app.state.auth_sessions = {}
    app.state.skip_bootstrap = True
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    app.state.skip_bootstrap = False


def test_auth_and_display_flow(client: TestClient):
    unauthenticated = client.post("/api/display/open")
    assert unauthenticated.status_code == 401

    login = client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    assert login.status_code == 200
    assert login.json()["roles"] == ["event_operator"]
    assert "kiosk_session" in login.cookies

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "operator@example.com"

    opened = client.post("/api/display/open")
    assert opened.status_code == 200
    assert opened.json()["configuration"]["topRegionRatio"] == 4
    assert opened.json()["configuration"]["bottomRegionRatio"] == 1
    assert opened.json()["fallbackActive"] is False

    state = client.get("/api/display/state")
    assert state.status_code == 200
    assert len(state.json()["topContent"]) == 1
    assert len(state.json()["ads"]) == 1

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_new_display_session_starts_with_default_remote_control_state(client: TestClient):
    login = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert login.status_code == 200

    first_open = client.post("/api/display/open")
    assert first_open.status_code == 200

    hidden = client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedContentId": None, "adsVisible": False},
    )
    assert hidden.status_code == 200
    assert hidden.json()["adsVisible"] is False

    second_open = client.post("/api/display/open")
    state = client.get("/api/display/state")

    assert second_open.status_code == 200
    assert second_open.json()["remoteControl"]["contentMode"] == "loop"
    assert second_open.json()["remoteControl"]["selectedContentId"] is None
    assert second_open.json()["remoteControl"]["adsVisible"] is True
    assert state.status_code == 200
    assert state.json()["remoteControl"]["adsVisible"] is True
