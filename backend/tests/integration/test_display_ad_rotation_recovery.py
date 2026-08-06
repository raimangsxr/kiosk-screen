from __future__ import annotations

import queue
import time
from collections.abc import Iterator

import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.hooks import ensure_display_orchestrator
from app.application.display_orchestrator.reaper import reap_idle_orchestrators
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session, set_stream_session_factory_override
from app.services.bootstrap_service import bootstrap_mvp_data
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def recovery_clients() -> Iterator[tuple[TestClient, TestClient]]:
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
    set_stream_session_factory_override(factory)
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
        set_stream_session_factory_override(None)
        OrchestratorRegistry.reset()
        reset_display_sse_hub()
        redis_state.reset_redis_client(None)


def _login_operator(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    assert response.status_code == 200


def _login_admin(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert response.status_code == 200


def _open_display(client: TestClient) -> None:
    response = client.post("/api/display/open")
    assert response.status_code == 200


def _register_kiosk(client: TestClient, client_instance_id: str, label: str = "Pantalla test") -> str:
    response = client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": client_instance_id, "label": label},
    )
    assert response.status_code == 201
    return response.json()["kioskId"]


def _orchestrator_key(client: TestClient, kiosk_id: str) -> tuple[str, str]:
    hub = get_display_sse_hub()
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    return registration.organization_id, registration.operator_session_id


def _reap_orchestrator(key: tuple[str, str]) -> None:
    idle_since: dict = {}
    reap_idle_orchestrators(idle_since, now=1_000.0, grace_seconds=120.0)
    reap_idle_orchestrators(idle_since, now=1_000.0 + 200.0, grace_seconds=120.0)
    assert OrchestratorRegistry.get(*key) is None


def test_stream_reconnect_ensures_orchestrator_after_reaper(
    recovery_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, _admin_client = recovery_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    kiosk_id = _register_kiosk(operator_client, "recovery-stream")
    key = _orchestrator_key(operator_client, kiosk_id)
    assert OrchestratorRegistry.get(*key) is not None

    _reap_orchestrator(key)

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        ensure_display_orchestrator(session, key[0])

    orchestrator = OrchestratorRegistry.get(*key)
    assert orchestrator is not None

    hub = get_display_sse_hub()
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    with factory() as session:
        orchestrator.advance_ad(session, reason="test")

    ad_event = None
    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "show_ads":
            ad_event = event
            break
    assert ad_event is not None


def test_display_state_ensures_orchestrator_after_reaper(
    recovery_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, _admin_client = recovery_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    kiosk_id = _register_kiosk(operator_client, "recovery-state")
    key = _orchestrator_key(operator_client, kiosk_id)
    _reap_orchestrator(key)

    state = operator_client.get("/api/display/state")
    assert state.status_code == 200
    assert OrchestratorRegistry.get(*key) is not None


def test_pause_reconnect_resumes_ads_without_new_top_content(
    recovery_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, admin_client = recovery_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    kiosk_id = _register_kiosk(operator_client, "recovery-pause")
    key = _orchestrator_key(operator_client, kiosk_id)

    _login_admin(admin_client)
    pause = admin_client.post(
        "/api/display/remote-control/navigation",
        json={"command": "pause"},
    )
    assert pause.status_code == 200

    _reap_orchestrator(key)

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        ensure_display_orchestrator(session, key[0])

    orchestrator = OrchestratorRegistry.get(*key)
    assert orchestrator is not None

    hub = get_display_sse_hub()
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        orchestrator.advance_ad(session, reason="test")
        orchestrator.advance_top(session, reason="test")

    ad_seen = False
    content_seen = False
    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "show_ads":
            ad_seen = True
        if event["type"] == "show_content":
            content_seen = True

    assert ad_seen is True
    assert content_seen is False


def test_remote_hide_then_show_ads_emits_show_ads(
    recovery_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, admin_client = recovery_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    kiosk_id = _register_kiosk(operator_client, "recovery-hide-show")
    hub = get_display_sse_hub()
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    _login_admin(admin_client)
    hidden = admin_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": False},
    )
    assert hidden.status_code == 200
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    restored = admin_client.put(
        "/api/display/remote-control/state",
        json={"contentMode": "loop", "selectedIframeId": None, "adsVisible": True},
    )
    assert restored.status_code == 200

    ad_event = None
    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "show_ads":
            ad_event = event
            break
    assert ad_event is not None


def test_polled_state_includes_runtime_rotation_fields(
    recovery_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, _admin_client = recovery_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    kiosk_id = _register_kiosk(operator_client, "recovery-poll")
    key = _orchestrator_key(operator_client, kiosk_id)
    orchestrator = OrchestratorRegistry.get(*key)
    assert orchestrator is not None

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        orchestrator.advance_ad(session, reason="test")

    first = operator_client.get("/api/display/state").json()

    with factory() as session:
        orchestrator.advance_ad(session, reason="test")

    second = operator_client.get("/api/display/state").json()

    assert first.get("currentAds") is not None
    assert first.get("currentTop") is not None

    first_index = first["currentAds"]["startIndex"]
    second_index = second["currentAds"]["startIndex"]
    assert first_index != second_index or first["currentAds"]["commandId"] != second["currentAds"]["commandId"]
