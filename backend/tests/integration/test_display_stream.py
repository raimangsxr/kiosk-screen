from __future__ import annotations

from collections.abc import Iterator

import queue

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


@pytest.fixture
def stream_client(stream_clients: tuple[TestClient, TestClient]) -> TestClient:
    return stream_clients[0]


def _login_operator(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "operator@example.com", "password": "operator"})
    assert response.status_code == 200


def _open_display(client: TestClient) -> None:
    response = client.post("/api/display/open")
    assert response.status_code == 200


def _register_kiosk(client: TestClient, client_instance_id: str) -> str:
    response = client.post(
        "/api/display/kiosk/register",
        json={"clientInstanceId": client_instance_id},
    )
    assert response.status_code == 201
    return response.json()["kioskId"]


def test_register_returns_kiosk_id(stream_client: TestClient) -> None:
    _login_operator(stream_client)
    _open_display(stream_client)
    kiosk_id = _register_kiosk(stream_client, "client-a")
    assert kiosk_id


def test_register_ensures_orchestrator_when_not_running(stream_client: TestClient) -> None:
    _login_operator(stream_client)
    _open_display(stream_client)
    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(stream_client, "client-bootstrap")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    orchestrator = OrchestratorRegistry.get(
        registration.organization_id,
        registration.operator_session_id,
    )
    assert orchestrator is not None
    OrchestratorRegistry.remove(registration.organization_id, registration.operator_session_id)

    replacement_kiosk_id = _register_kiosk(stream_client, "client-bootstrap-2")
    replacement = hub.get_kiosk(replacement_kiosk_id)
    assert replacement is not None
    assert OrchestratorRegistry.get(
        replacement.organization_id,
        replacement.operator_session_id,
    ) is not None


def test_ad_rotation_continues_after_second_kiosk_registers(
    stream_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    first_kiosk_id = _register_kiosk(operator_client, "ads-client-a")
    first_registration = hub.get_kiosk(first_kiosk_id)
    assert first_registration is not None
    subscriber = hub.subscribe(first_registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(
        first_registration.organization_id,
        first_registration.operator_session_id,
    )
    assert orchestrator is not None

    ad_events_before = 0
    factory = app.state.orchestrator_session_factory
    with factory() as session:
        for _ in range(3):
            orchestrator.advance_ad(session, reason="test")
            while True:
                try:
                    event = subscriber.events.get(timeout=0.2)
                except queue.Empty:
                    break
                if event["type"] == "show_ads":
                    ad_events_before += 1

    second_kiosk_id = _register_kiosk(operator_client, "ads-client-b")
    second_registration = hub.get_kiosk(second_kiosk_id)
    assert second_registration is not None
    second_subscriber = hub.subscribe(second_registration)
    while not second_subscriber.events.empty():
        second_subscriber.events.get_nowait()

    ad_events_after = 0
    with factory() as session:
        for _ in range(3):
            orchestrator.advance_ad(session, reason="test")
            for sub in (subscriber, second_subscriber):
                while True:
                    try:
                        event = sub.events.get(timeout=0.2)
                    except queue.Empty:
                        break
                    if event["type"] == "show_ads":
                        ad_events_after += 1

    assert ad_events_before >= 3
    assert ad_events_after >= 6


def test_top_rotation_continues_after_second_kiosk_registers(
    stream_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, admin_client = stream_clients
    _login(admin_client, "admin@example.com", "admin")
    created = admin_client.post(
        "/api/content",
        json={
            "title": "Second slide",
            "contentType": "photo",
            "sourceReference": "https://example.com/second-top.jpg",
            "isActive": True,
            "displayOrder": 2,
            "durationSeconds": 15,
        },
    )
    assert created.status_code == 201

    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    first_kiosk_id = _register_kiosk(operator_client, "top-client-a")
    first_registration = hub.get_kiosk(first_kiosk_id)
    assert first_registration is not None
    subscriber = hub.subscribe(first_registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(
        first_registration.organization_id,
        first_registration.operator_session_id,
    )
    assert orchestrator is not None

    content_events_before = 0
    factory = app.state.orchestrator_session_factory
    with factory() as session:
        for _ in range(3):
            orchestrator.advance_top(session, reason="test")
            while True:
                try:
                    event = subscriber.events.get(timeout=0.2)
                except queue.Empty:
                    break
                if event["type"] == "show_content":
                    content_events_before += 1

    second_kiosk_id = _register_kiosk(operator_client, "top-client-b")
    second_registration = hub.get_kiosk(second_kiosk_id)
    assert second_registration is not None
    second_subscriber = hub.subscribe(second_registration)
    while not second_subscriber.events.empty():
        second_subscriber.events.get_nowait()

    content_events_after = 0
    with factory() as session:
        for _ in range(3):
            orchestrator.advance_top(session, reason="test")
            for sub in (subscriber, second_subscriber):
                while True:
                    try:
                        event = sub.events.get(timeout=0.2)
                    except queue.Empty:
                        break
                    if event["type"] == "show_content":
                        content_events_after += 1

    assert content_events_before >= 3
    assert content_events_after >= 6


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


@pytest.mark.redis
def test_configuration_put_after_register_updates_display_state(
    stream_clients: tuple[TestClient, TestClient],
) -> None:
    """Gate G1 backend half: config mutation succeeds while a display session is active."""
    operator_client, admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)
    _register_kiosk(operator_client, "client-a")

    _login(admin_client, "admin@example.com", "admin")
    config = admin_client.get("/api/display/configuration").json()
    config["topRegionRatio"] = 7
    updated = admin_client.put("/api/display/configuration", json=config)
    assert updated.status_code == 200
    assert updated.json()["topRegionRatio"] == 7


def test_multi_kiosk_same_command_id(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, admin_client = stream_clients
    _login(admin_client, "admin@example.com", "admin")
    created = admin_client.post(
        "/api/content",
        json={
            "title": "Second slide",
            "contentType": "photo",
            "sourceReference": "https://example.com/second.jpg",
            "isActive": True,
            "displayOrder": 2,
            "durationSeconds": 15,
        },
    )
    assert created.status_code == 201

    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_ids = [_register_kiosk(operator_client, f"client-{index}") for index in range(3)]
    first_registration = hub.get_kiosk(kiosk_ids[0])
    assert first_registration is not None
    subscribers = [hub.subscribe(hub.get_kiosk(kiosk_id)) for kiosk_id in kiosk_ids]
    for subscriber in subscribers:
        while not subscriber.events.empty():
            subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(
        first_registration.organization_id,
        first_registration.operator_session_id,
    )
    assert orchestrator is not None

    content_ids: list[str] = []
    factory = app.state.orchestrator_session_factory
    for _cycle in range(5):
        with factory() as session:
            orchestrator.advance_top(session, reason="test")
        events = []
        for subscriber in subscribers:
            while True:
                try:
                    event = subscriber.events.get(timeout=0.2)
                except queue.Empty:
                    break
                if event["type"] == "show_content":
                    events.append(event)
                    break
        assert len(events) == 3
        content_id = events[0]["payload"]["content"]["id"]
        assert all(event["payload"]["content"]["id"] == content_id for event in events)
        content_ids.append(content_id)

    assert len(set(content_ids)) >= 2


@pytest.mark.redis
def test_inline_ad_count_defers_until_next_ad_tick(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "client-inline-ad")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None

    _login(admin_client, "admin@example.com", "admin")
    config = admin_client.get("/api/display/configuration").json()
    previous_count = config["inlineAdCount"]
    config["inlineAdCount"] = previous_count + 1
    updated = admin_client.put("/api/display/configuration", json=config)
    assert updated.status_code == 200

    state = redis_state.redis_get_json(
        redis_state.orchestrator_key(registration.organization_id, registration.operator_session_id)
    )
    assert state is not None
    assert state.get("pendingInlineAdCount") == previous_count + 1

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        orchestrator.advance_top(session, reason="test")
        orchestrator.advance_ad(session)

    ad_event = subscriber.events.get(timeout=1)
    while ad_event["type"] != "show_ads":
        ad_event = subscriber.events.get(timeout=1)
    assert ad_event["payload"]["inlineAdCount"] == previous_count + 1


def test_remote_pause_resume_fan_out(stream_clients: tuple[TestClient, TestClient]) -> None:
    import time

    operator_client, admin_client = stream_clients
    _login(admin_client, "admin@example.com", "admin")
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_ids = [_register_kiosk(operator_client, f"pause-client-{index}") for index in range(3)]
    subscribers = [hub.subscribe(hub.get_kiosk(kiosk_id)) for kiosk_id in kiosk_ids]
    for subscriber in subscribers:
        while not subscriber.events.empty():
            subscriber.events.get_nowait()

    started = time.monotonic()
    paused = admin_client.post("/api/display/remote-control/navigation", json={"command": "pause"})
    assert paused.status_code == 200

    for subscriber in subscribers:
        event = subscriber.events.get(timeout=1)
        while event["type"] != "mode_changed":
            event = subscriber.events.get(timeout=1)
        assert event["payload"]["isPaused"] is True
    assert time.monotonic() - started < 1.0

    resumed = admin_client.post("/api/display/remote-control/navigation", json={"command": "resume"})
    assert resumed.status_code == 200
    for subscriber in subscribers:
        event = subscriber.events.get(timeout=1)
        while event["type"] != "mode_changed" or event["payload"]["isPaused"]:
            event = subscriber.events.get(timeout=1)
        assert event["payload"]["isPaused"] is False


def test_pause_stops_top_rotation(stream_clients: tuple[TestClient, TestClient]) -> None:
    import time

    operator_client, admin_client = stream_clients
    _login(admin_client, "admin@example.com", "admin")
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "pause-rotation-client")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    orchestrator = OrchestratorRegistry.get(
        registration.organization_id,
        registration.operator_session_id,
    )
    assert orchestrator is not None

    factory = app.state.orchestrator_session_factory
    with factory() as session:
        assert orchestrator.advance_top(session, reason="test") is True

    saw_content = False
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "show_content":
            saw_content = True
            break
    assert saw_content

    paused = admin_client.post("/api/display/remote-control/navigation", json={"command": "pause"})
    assert paused.status_code == 200

    saw_pause = False
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.2)
        except queue.Empty:
            continue
        if event["type"] == "mode_changed" and event["payload"]["isPaused"] is True:
            saw_pause = True
            break
    assert saw_pause

    with factory() as session:
        for _ in range(3):
            assert orchestrator.advance_top(session, reason="timer") is False

    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    content_after_pause: list[dict] = []
    orchestrator._on_top_timer()  # noqa: SLF001
    deadline = time.monotonic() + 0.5
    while time.monotonic() < deadline:
        try:
            event = subscriber.events.get(timeout=0.1)
        except queue.Empty:
            continue
        if event["type"] == "show_content":
            content_after_pause.append(event)
    assert content_after_pause == []


def test_reconnect_replays_buffered_events(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "reconnect-client")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None

    hub.publish(
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
        event_type="config_updated",
        payload={"configuration": {"id": "cfg"}, "applyImmediately": True, "changedFields": []},
    )
    hub.publish(
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
        event_type="show_content",
        payload={"commandId": "cmd-test", "content": {"id": "content-1"}},
    )

    replay = hub.replay_or_snapshot(
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
        last_event_id=1,
        snapshot_payload={"fallbackActive": False},
    )
    assert len(replay) >= 1
    assert all(event["sequence"] > 1 for event in replay)


def test_reconnect_falls_back_to_snapshot_when_buffer_misses(
    stream_clients: tuple[TestClient, TestClient],
) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "snapshot-client")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None

    replay = hub.replay_or_snapshot(
        organization_id=registration.organization_id,
        operator_session_id=registration.operator_session_id,
        last_event_id=999_999,
        snapshot_payload={"fallbackActive": False, "contentMode": "loop"},
    )
    assert len(replay) == 1
    assert replay[0]["type"] == "snapshot"
    assert replay[0]["payload"]["contentMode"] == "loop"


def test_duplicate_video_ended_is_idempotent(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "video-client")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None

    orchestrator = OrchestratorRegistry.get(registration.organization_id, registration.operator_session_id)
    assert orchestrator is not None
    orchestrator._scheduler.cancel_all()
    factory = app.state.orchestrator_session_factory
    with factory() as session:
        state = orchestrator._load_state()
        command_id = state.get("currentTopCommandId")
        assert command_id
        assert orchestrator.handle_video_ended(session, command_id=command_id) is True
        assert orchestrator.handle_video_ended(session, command_id=command_id) is False

    first = operator_client.post(
        "/api/display/kiosk/events",
        json={"kioskId": kiosk_id, "type": "video_ended", "commandId": command_id},
    )
    second = operator_client.post(
        "/api/display/kiosk/events",
        json={"kioskId": kiosk_id, "type": "video_ended", "commandId": command_id},
    )
    assert first.status_code == 204
    assert second.status_code == 204


def test_open_display_supersede_emits_session_ended(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    kiosk_id = _register_kiosk(operator_client, "supersede-client")
    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    old_session_id = registration.operator_session_id
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    _open_display(operator_client)

    event = subscriber.events.get(timeout=1)
    while event["type"] != "session_ended":
        event = subscriber.events.get(timeout=1)
    assert event["payload"]["reason"] == "superseded"
    assert hub.get_kiosk(kiosk_id) is None

    new_registration = hub.get_kiosk(_register_kiosk(operator_client, "supersede-client-2"))
    assert new_registration is not None
    assert new_registration.operator_session_id != old_session_id


def test_duplicate_client_instance_supersedes_prior_kiosk(stream_clients: tuple[TestClient, TestClient]) -> None:
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    hub = get_display_sse_hub()
    first_kiosk_id = _register_kiosk(operator_client, "same-client")
    first_registration = hub.get_kiosk(first_kiosk_id)
    assert first_registration is not None
    subscriber = hub.subscribe(first_registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    second_kiosk_id = _register_kiosk(operator_client, "same-client")
    assert second_kiosk_id != first_kiosk_id

    event = subscriber.events.get(timeout=1)
    while event["type"] != "session_ended":
        event = subscriber.events.get(timeout=1)
    assert event["payload"]["reason"] == "superseded"
    assert hub.get_kiosk(first_kiosk_id) is None


@pytest.mark.redis
def test_concurrent_kiosk_registrations(stream_clients: tuple[TestClient, TestClient]) -> None:
    """Performance goal: 50 SSE registrations complete without server errors."""
    operator_client, _admin_client = stream_clients
    _login_operator(operator_client)
    _open_display(operator_client)

    for index in range(50):
        response = operator_client.post(
            "/api/display/kiosk/register",
            json={"clientInstanceId": f"load-client-{index}"},
        )
        assert response.status_code == 201, response.text
