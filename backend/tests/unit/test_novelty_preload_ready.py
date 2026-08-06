"""Unit tests for novelty_preload_ready handling (CHG-056)."""
from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.novelty_defer import get_connected_kiosk_ids, is_novelty_ready
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.models.content import TopContentItem
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def orchestrator_env(db_session: Session) -> tuple[DisplayOrchestrator, Session, str]:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    get_display_sse_hub().start()
    bootstrap = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    org_id = bootstrap.organization.id
    factory = sessionmaker(bind=db_session.get_bind(), autoflush=False, autocommit=False, expire_on_commit=False)
    OrchestratorRegistry.configure(lambda: factory())
    orchestrator = OrchestratorRegistry.get_or_create(org_id, "session-1")
    yield orchestrator, db_session, org_id
    orchestrator.shutdown()
    OrchestratorRegistry.reset()
    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def _connect_kiosk(hub, *, org_id: str, session_id: str, suffix: str) -> str:
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id=f"client-{suffix}",
        label=f"Kiosk {suffix}",
    )
    hub.subscribe(registration)
    return registration.kiosk_id


def test_record_novelty_ready_idempotent(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    content_id = str(uuid4())
    hub = get_display_sse_hub()
    kiosk_id = _connect_kiosk(hub, org_id=org_id, session_id="session-1", suffix="a")

    orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_id, content_id=content_id)
    orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_id, content_id=content_id)

    state = orchestrator._load_state()  # noqa: SLF001
    ready = state["noveltyReadyKiosks"][content_id]
    assert ready.count(kiosk_id) == 1


def test_all_connected_kiosks_must_be_ready(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    content_id = str(uuid4())
    hub = get_display_sse_hub()
    kiosk_a = _connect_kiosk(hub, org_id=org_id, session_id="session-1", suffix="a")
    _connect_kiosk(hub, org_id=org_id, session_id="session-1", suffix="b")

    orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_a, content_id=content_id)
    state = orchestrator._load_state()  # noqa: SLF001
    connected = get_connected_kiosk_ids(orchestrator)
    assert len(connected) == 2
    assert is_novelty_ready(state, content_id, connected) is False


def test_disconnect_removes_kiosk_from_ready_sets(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    content_id = str(uuid4())
    hub = get_display_sse_hub()
    kiosk_id = _connect_kiosk(hub, org_id=org_id, session_id="session-1", suffix="a")
    orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_id, content_id=content_id)

    registration = hub.get_kiosk(kiosk_id)
    assert registration is not None
    hub.record_kiosk_disconnected(session, registration)

    state = orchestrator._load_state()  # noqa: SLF001
    ready_sets = state.get("noveltyReadyKiosks") or {}
    for kiosks in ready_sets.values():
        assert kiosk_id not in kiosks


def test_pending_novelty_items_include_defer_fields(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    from app.application.display_orchestrator.preload import pending_novelty_items

    orchestrator, session, org_id = orchestrator_env
    content_id = str(uuid4())
    session.add(
        TopContentItem(
            id=content_id,
            organization_id=org_id,
            title="Novelty",
            content_type="photo",
            source_reference="https://example.com/n.jpg",
            is_active=True,
            display_order=1,
            duration_seconds=15,
            rotation_animation="fade",
            animation_duration_milliseconds=300,
            is_novelty=True,
            recurring_every_x_iterations=None,
        )
    )
    session.commit()
    orchestrator.bootstrap(session)

    items = pending_novelty_items(orchestrator, session)
    assert len(items) == 1
    assert items[0]["deferCount"] == 0
    assert items[0]["maxDefer"] == 3
    assert items[0]["downloadReady"] is False
