"""Unit tests for novelty defer advance logic (CHG-056)."""
from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.novelty_defer import get_defer_count
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def orchestrator_env(db_session: Session) -> tuple[DisplayOrchestrator, Session, str]:
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    hub = get_display_sse_hub()
    hub.start()
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


def _content(
    organization_id: str,
    content_id: str,
    *,
    display_order: int,
    is_novelty: bool = False,
    title: str | None = None,
) -> TopContentItem:
    return TopContentItem(
        id=content_id,
        organization_id=organization_id,
        title=title or f"Item {content_id[:8]}",
        content_type="photo",
        source_reference=f"https://example.com/{content_id}.jpg",
        is_active=True,
        display_order=display_order,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=is_novelty,
        recurring_every_x_iterations=None,
    )


def _clear_content(session: Session, org_id: str) -> None:
    for item in session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id)):
        session.delete(item)
    session.commit()


def _connect_kiosk(
    hub,
    *,
    org_id: str,
    session_id: str,
    client_instance_id: str,
) -> str:
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=session_id,
        client_instance_id=client_instance_id,
        label="Test kiosk",
    )
    hub.subscribe(registration)
    return registration.kiosk_id


def _mark_novelty_ready(
    orchestrator: DisplayOrchestrator,
    session: Session,
    *,
    org_id: str,
    content_id: str,
) -> None:
    _mark_novelties_ready(
        orchestrator,
        session,
        org_id=org_id,
        content_ids=[content_id],
    )


def _mark_novelties_ready(
    orchestrator: DisplayOrchestrator,
    session: Session,
    *,
    org_id: str,
    content_ids: list[str],
) -> None:
    hub = get_display_sse_hub()
    kiosk_id = _connect_kiosk(
        hub,
        org_id=org_id,
        session_id=orchestrator.operator_session_id,
        client_instance_id=f"ready-{'-'.join(item[:4] for item in content_ids)}",
    )
    for content_id in content_ids:
        orchestrator.handle_novelty_preload_ready(session, kiosk_id=kiosk_id, content_id=content_id)


def _set_max_defer(session: Session, org_id: str, value: int) -> None:
    configuration = session.scalar(
        select(KioskDisplayConfiguration).where(KioskDisplayConfiguration.organization_id == org_id)
    )
    assert configuration is not None
    configuration.novelty_max_defer_transitions = value
    session.commit()


def test_defer_emits_regular_when_novelty_not_ready(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _clear_content(session, org_id)
    regular_a = str(uuid4())
    regular_b = str(uuid4())
    novelty_id = str(uuid4())
    session.add_all(
        [
            _content(org_id, regular_a, display_order=1, title="Regular A"),
            _content(org_id, regular_b, display_order=2, title="Regular B"),
            _content(org_id, novelty_id, display_order=99, is_novelty=True, title="Novelty"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == regular_b
    assert get_defer_count(state, novelty_id) == 1
    item = session.get(TopContentItem, novelty_id)
    assert item is not None
    assert item.is_novelty is True


def test_emit_novelty_when_ready_and_reschedule_regular(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _clear_content(session, org_id)
    ids = [str(uuid4()) for _ in range(5)]
    session.add_all(
        [
            _content(org_id, ids[0], display_order=1, title="Item 1"),
            _content(org_id, ids[1], display_order=2, title="Item 2"),
            _content(org_id, ids[2], display_order=3, title="Item 3"),
            _content(org_id, ids[3], display_order=4, title="Item 4"),
            _content(org_id, ids[4], display_order=99, is_novelty=True, title="Novelty 6"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator._update_state(  # noqa: SLF001
        {
            "currentTopContentId": ids[2],
            "regularCursorId": ids[2],
        }
    )
    _mark_novelty_ready(orchestrator, session, org_id=org_id, content_id=ids[4])

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == ids[4]
    assert state["rescheduledRegularContentId"] == ids[3]

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == ids[3]
    assert state.get("rescheduledRegularContentId") is None


def test_ready_novelties_emit_as_burst_before_regular_rotation(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _clear_content(session, org_id)
    regular_ids = [str(uuid4()) for _ in range(5)]
    novelty_ids = [str(uuid4()) for _ in range(3)]
    session.add_all(
        [
            *[
                _content(org_id, content_id, display_order=index, title=f"Item {index}")
                for index, content_id in enumerate(regular_ids, start=1)
            ],
            *[
                _content(
                    org_id,
                    content_id,
                    display_order=index,
                    is_novelty=True,
                    title=f"Novelty {index}",
                )
                for index, content_id in enumerate(novelty_ids, start=6)
            ],
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    _mark_novelties_ready(
        orchestrator,
        session,
        org_id=org_id,
        content_ids=novelty_ids,
    )

    emitted: list[str] = []
    for _ in range(5):
        orchestrator.advance_top(session, reason="timer")
        state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
        emitted.append(state["currentTopContentId"])

    assert emitted == [*novelty_ids, regular_ids[1], regular_ids[2]]
    assert state["regularCursorId"] == regular_ids[2]
    assert state.get("rescheduledRegularContentId") is None


def test_ready_follower_does_not_overtake_not_ready_fifo_head(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _clear_content(session, org_id)
    regular_ids = [str(uuid4()) for _ in range(3)]
    novelty_head = str(uuid4())
    novelty_follower = str(uuid4())
    session.add_all(
        [
            *[
                _content(org_id, content_id, display_order=index, title=f"Item {index}")
                for index, content_id in enumerate(regular_ids, start=1)
            ],
            _content(org_id, novelty_head, display_order=6, is_novelty=True, title="Novelty 6"),
            _content(org_id, novelty_follower, display_order=7, is_novelty=True, title="Novelty 7"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    _mark_novelties_ready(
        orchestrator,
        session,
        org_id=org_id,
        content_ids=[novelty_follower],
    )

    orchestrator.advance_top(session, reason="timer")

    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == regular_ids[1]
    assert get_defer_count(state, novelty_head) == 1
    assert session.get(TopContentItem, novelty_head).is_novelty is True  # type: ignore[union-attr]
    assert session.get(TopContentItem, novelty_follower).is_novelty is True  # type: ignore[union-attr]


def test_priority_emit_over_discard_at_max_minus_one(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _set_max_defer(session, org_id, 3)
    _clear_content(session, org_id)
    regular_a = str(uuid4())
    regular_b = str(uuid4())
    novelty_id = str(uuid4())
    session.add_all(
        [
            _content(org_id, regular_a, display_order=1, title="Regular A"),
            _content(org_id, regular_b, display_order=2, title="Regular B"),
            _content(org_id, novelty_id, display_order=99, is_novelty=True, title="Novelty"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator._update_state({"noveltyDeferCounts": {novelty_id: 2}})  # noqa: SLF001

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert get_defer_count(state, novelty_id) == 3

    _mark_novelty_ready(orchestrator, session, org_id=org_id, content_id=novelty_id)
    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == novelty_id
    item = session.get(TopContentItem, novelty_id)
    assert item is not None
    assert item.is_novelty is False


def test_max_defer_discards_without_emit(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _set_max_defer(session, org_id, 2)
    _clear_content(session, org_id)
    regular_a = str(uuid4())
    regular_b = str(uuid4())
    novelty_id = str(uuid4())
    session.add_all(
        [
            _content(org_id, regular_a, display_order=1, title="Regular A"),
            _content(org_id, regular_b, display_order=2, title="Regular B"),
            _content(org_id, novelty_id, display_order=99, is_novelty=True, title="Novelty"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator._update_state({"noveltyDeferCounts": {novelty_id: 2}})  # noqa: SLF001

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == regular_b
    item = session.get(TopContentItem, novelty_id)
    assert item is not None
    assert item.is_novelty is False
    assert novelty_id not in (state.get("noveltyDeferCounts") or {})


def test_multi_novelty_fifo_only_head_emits(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _clear_content(session, org_id)
    regular = str(uuid4())
    novelty_a = str(uuid4())
    novelty_b = str(uuid4())
    session.add_all(
        [
            _content(org_id, regular, display_order=1, title="Regular"),
            _content(org_id, novelty_a, display_order=1, is_novelty=True, title="Nov A"),
            _content(org_id, novelty_b, display_order=2, is_novelty=True, title="Nov B"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)
    _mark_novelty_ready(orchestrator, session, org_id=org_id, content_id=novelty_a)

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == novelty_a
    assert session.get(TopContentItem, novelty_b).is_novelty is True  # type: ignore[union-attr]


def test_sc005_defer_count_bounded_by_max_plus_one(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    _set_max_defer(session, org_id, 3)
    _clear_content(session, org_id)
    regular_a = str(uuid4())
    regular_b = str(uuid4())
    novelty_id = str(uuid4())
    session.add_all(
        [
            _content(org_id, regular_a, display_order=1, title="Regular A"),
            _content(org_id, regular_b, display_order=2, title="Regular B"),
            _content(org_id, novelty_id, display_order=99, is_novelty=True, title="Novelty"),
        ]
    )
    session.commit()
    orchestrator.bootstrap(session)

    for _ in range(10):
        orchestrator.advance_top(session, reason="timer")
        state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
        defer = get_defer_count(state, novelty_id)
        item = session.get(TopContentItem, novelty_id)
        still_novelty = item is not None and item.is_novelty
        if still_novelty:
            assert defer <= 3
        else:
            break
    else:
        pytest.fail("novelty was never consumed or discarded")

    item = session.get(TopContentItem, novelty_id)
    assert item is not None
    assert item.is_novelty is False
