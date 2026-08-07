"""Unit tests: novelty defer inactive in pause/fixed/iframe modes (CHG-056)."""
from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.preload import emit_novelty_preload, pending_novelty_items
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


def _novelty(organization_id: str) -> TopContentItem:
    return TopContentItem(
        id=str(uuid4()),
        organization_id=organization_id,
        title="Novelty",
        content_type="photo",
        source_reference="https://example.com/n.jpg",
        is_active=True,
        display_order=99,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=True,
        recurring_every_x_iterations=None,
    )


def _remote_state(**overrides: object) -> object:
    values = {
        "content_mode": "loop",
        "navigation_command": None,
        "ads_visible": True,
        "selected_fixed_content_id": None,
        "selected_iframe_id": None,
        "jump_to_content_id": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_pause_skips_novelty_defer_advance(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    novelty = _novelty(org_id)
    session.add(novelty)
    session.commit()
    orchestrator.bootstrap(session)
    before = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))

    orchestrator.handle_remote_navigation(
        session,
        _remote_state(navigation_command="pause"),
        command="pause",
    )
    orchestrator.advance_top(session, reason="timer")
    after = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert after["currentTopContentId"] == before["currentTopContentId"]
    session.refresh(novelty)
    assert novelty.is_novelty is True


def test_fixed_mode_does_not_defer_novelty(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    novelty = _novelty(org_id)
    session.add(novelty)
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator.apply_remote_state(
        session,
        _remote_state(content_mode="fixed", selected_fixed_content_id=str(uuid4())),
        reason="remote_mode_change",
    )
    orchestrator.advance_top(session, reason="timer")
    session.refresh(novelty)
    assert novelty.is_novelty is True


def test_iframe_mode_does_not_defer_novelty(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    novelty = _novelty(org_id)
    session.add(novelty)
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator.apply_remote_state(
        session,
        _remote_state(content_mode="iframe", selected_iframe_id=str(uuid4())),
        reason="remote_mode_change",
    )
    orchestrator.advance_top(session, reason="timer")
    session.refresh(novelty)
    assert novelty.is_novelty is True


def test_emit_novelty_preload_skipped_when_paused(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    session.add(_novelty(org_id))
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator._update_state({"isPaused": True})  # noqa: SLF001

    hub = get_display_sse_hub()
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id="session-1",
        client_instance_id="preload-pause",
        label="Pause kiosk",
    )
    subscriber = hub.subscribe(registration)
    while not subscriber.events.empty():
        subscriber.events.get_nowait()

    emit_novelty_preload(orchestrator, session)
    assert subscriber.events.empty()

    items = pending_novelty_items(orchestrator, session)
    assert len(items) == 1
    assert "deferCount" in items[0]
