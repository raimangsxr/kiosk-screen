"""Multi-kiosk media_error advance integration tests (CHG-050)."""
from __future__ import annotations

import queue
import time
from collections.abc import Iterator

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def stream_clients() -> Iterator[tuple[TestClient, TestClient]]:
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
    operator_client = TestClient(app)
    admin_client = TestClient(app)
    get_display_sse_hub().start()
    try:
        yield operator_client, admin_client
    finally:
        operator_client.close()
        admin_client.close()
        app.dependency_overrides.clear()
        app.state.skip_bootstrap = False
        OrchestratorRegistry.reset()
        reset_display_sse_hub()
        redis_state.reset_redis_client(None)


def _wait_for_show_content(subscriber, *, timeout: float = 2.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "show_content":
            return event
    return None


def test_first_media_error_advances_for_all_kiosks(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, _admin_client = stream_clients
    operator_client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    operator_client.post("/api/display/open")

    hub = get_display_sse_hub()
    first_kiosk_id = operator_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "media-error-a", "label": "Pantalla A"},
    ).json()["kioskId"]
    second_kiosk_id = operator_client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": "media-error-b", "label": "Pantalla B"},
    ).json()["kioskId"]

    first_registration = hub.get_kiosk(first_kiosk_id)
    second_registration = hub.get_kiosk(second_kiosk_id)
    assert first_registration is not None
    assert second_registration is not None

    first_subscriber = hub.subscribe(first_registration)
    second_subscriber = hub.subscribe(second_registration)
    for subscriber in (first_subscriber, second_subscriber):
        while not subscriber.events.empty():
            subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(
        first_registration.organization_id,
        first_registration.operator_session_id,
    )
    assert orchestrator is not None
    state = orchestrator._load_state()
    command_id = state.get("currentTopCommandId")
    content_id = state.get("currentTopContentId")
    assert command_id and content_id

    response = operator_client.post(
        "/api/display/kiosk/events",
        json={
            "kioskId": first_kiosk_id,
            "type": "media_error",
            "commandId": command_id,
            "contentId": content_id,
        },
    )
    assert response.status_code == 204

    first_event = _wait_for_show_content(first_subscriber)
    second_event = _wait_for_show_content(second_subscriber)
    assert first_event is not None
    assert second_event is not None
    assert first_event["payload"]["commandId"] == second_event["payload"]["commandId"]
    assert first_event["payload"]["commandId"] != command_id
