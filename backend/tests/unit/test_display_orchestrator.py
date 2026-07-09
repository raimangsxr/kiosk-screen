from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.scheduler import OrchestratorScheduler
from app.application.display_orchestrator.service import DisplayOrchestrator, _pick_next_regular
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.events import DisplayEventRepository
from app.repositories.models.content import TopContentItem
from app.services.bootstrap_service import bootstrap_mvp_data


class _RecordingScheduler(OrchestratorScheduler):
    def __init__(self) -> None:
        super().__init__(
            on_top_timer=lambda: None,
            on_ad_timer=lambda: None,
            on_availability_timer=lambda: None,
        )
        self.ad_cancel_count = 0

    def cancel_ad(self) -> None:
        self.ad_cancel_count += 1
        super().cancel_ad()


@pytest.fixture
def orchestrator_env(db_session: Session) -> tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]]:
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
    yield orchestrator, db_session, org_id, factory
    orchestrator.shutdown()
    OrchestratorRegistry.reset()
    reset_display_sse_hub()
    redis_state.reset_redis_client(None)


def _content(organization_id: str, content_id: str, *, display_order: int, content_type: str = "photo") -> TopContentItem:
    return TopContentItem(
        id=content_id,
        organization_id=organization_id,
        title=f"Item {content_id}",
        content_type=content_type,
        source_reference=f"https://example.com/{content_id}.jpg",
        is_active=True,
        display_order=display_order,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=False,
        recurring_every_x_iterations=None,
    )


def test_pick_next_regular_rotates_in_display_order() -> None:
    queue = [_content("org", "a", display_order=2), _content("org", "b", display_order=1)]
    first = _pick_next_regular(queue, None)
    assert first is not None
    assert first.id == "b"
    second = _pick_next_regular(queue, "b")
    assert second is not None
    assert second.id == "a"


def test_ad_timer_survives_top_advance(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, _org_id, _factory = orchestrator_env
    recording = _RecordingScheduler()
    orchestrator._scheduler = recording  # noqa: SLF001
    orchestrator.bootstrap(session)
    ad_cancels_before = recording.ad_cancel_count
    orchestrator.advance_top(session, reason="test")
    assert recording.ad_cancel_count == ad_cancels_before


def test_photo_timer_advance_emits_orchestrator_advanced(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)
    orchestrator.advance_top(session, reason="timer")
    events = DisplayEventRepository(session).list_recent(org_id)
    assert any(event.event_type == "orchestrator_advanced" for event in events)


def test_first_video_ended_advances_once(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    for item in list(session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id))):
        session.delete(item)
    video_id = str(uuid4())
    video = _content(org_id, video_id, display_order=1, content_type="video")
    video.duration_seconds = 5
    session.add(video)
    session.commit()
    orchestrator.bootstrap(session)
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    command_id = state["currentTopCommandId"]
    assert orchestrator.handle_video_ended(session, command_id=command_id) is True
    assert orchestrator.handle_video_ended(session, command_id=command_id) is False


def test_empty_queue_debounce_emits_orchestrator_empty_queue(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, factory = orchestrator_env
    for item in list(session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id))):
        session.delete(item)
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator._emit_empty_queue_audit()  # noqa: SLF001
    with factory() as fresh_session:
        events = DisplayEventRepository(fresh_session).list_recent(org_id)
    assert any(event.event_type == "orchestrator_empty_queue" for event in events)


def _remote_state(**overrides: object) -> object:
    from types import SimpleNamespace

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


def test_pause_freezes_top_not_ads(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)
    before = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    orchestrator.handle_remote_navigation(
        session,
        _remote_state(navigation_command="pause"),
        command="pause",
    )
    orchestrator.advance_top(session, reason="timer")
    after = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert after["isPaused"] is True
    assert after["currentTopContentId"] == before["currentTopContentId"]
    orchestrator.advance_ad(session)


def test_arm_top_timer_skips_when_paused(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, _org_id, _factory = orchestrator_env
    orchestrator.bootstrap(session)
    orchestrator.handle_remote_navigation(
        session,
        _remote_state(navigation_command="pause"),
        command="pause",
    )
    orchestrator._arm_top_timer(  # noqa: SLF001
        {
            "playback": {
                "mode": "timer",
                "durationSeconds": 5,
            }
        }
    )
    assert orchestrator._scheduler._top_timer is None  # noqa: SLF001


def test_jump_to_shows_target_content(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    second = _content(org_id, str(uuid4()), display_order=2)
    session.add(second)
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator.handle_remote_navigation(
        session,
        _remote_state(jump_to_content_id=str(second.id)),
        command="jump_to",
    )
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(second.id)


def test_fixed_auto_fallback_to_loop(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    top = session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id)).first()
    assert top is not None
    orchestrator.bootstrap(session)
    orchestrator.apply_remote_state(
        session,
        _remote_state(content_mode="fixed", selected_fixed_content_id=str(uuid4())),
        reason="remote_mode_change",
    )
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["contentMode"] == "loop"


def test_novelty_shown_before_regular_and_consumed(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    novelty = _content(org_id, str(uuid4()), display_order=99)
    novelty.is_novelty = True
    session.add(novelty)
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(novelty.id)
    session.refresh(novelty)
    assert novelty.is_novelty is False


def test_recurring_item_becomes_due_after_n_transitions(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    for item in list(session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id))):
        session.delete(item)
    regular = _content(org_id, str(uuid4()), display_order=1)
    recurring = _content(org_id, str(uuid4()), display_order=2)
    recurring.recurring_every_x_iterations = 2
    session.add_all([regular, recurring])
    session.commit()
    orchestrator.bootstrap(session)
    orchestrator.advance_top(session, reason="timer")
    orchestrator.advance_top(session, reason="timer")
    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(recurring.id)
    assert state["recurringCounters"][str(recurring.id)] == 0


def test_recurring_counters_increment_only_on_regular_transitions(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str, sessionmaker[Session]],
) -> None:
    orchestrator, session, org_id, _factory = orchestrator_env
    for item in list(session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id))):
        session.delete(item)
    regular = _content(org_id, str(uuid4()), display_order=1)
    recurring_a = _content(org_id, str(uuid4()), display_order=10)
    recurring_a.recurring_every_x_iterations = 2
    recurring_b = _content(org_id, str(uuid4()), display_order=20)
    recurring_b.recurring_every_x_iterations = 4
    session.add_all([regular, recurring_a, recurring_b])
    session.commit()
    orchestrator.bootstrap(session)

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(regular.id)
    assert state["recurringCounters"][str(recurring_a.id)] == 1
    assert state["recurringCounters"][str(recurring_b.id)] == 1

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(regular.id)
    assert state["recurringCounters"][str(recurring_a.id)] == 2
    assert state["recurringCounters"][str(recurring_b.id)] == 2

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(recurring_a.id)
    assert state["recurringCounters"][str(recurring_a.id)] == 0
    assert state["recurringCounters"][str(recurring_b.id)] == 2

    orchestrator.advance_top(session, reason="timer")
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert state["currentTopContentId"] == str(regular.id)
    assert state["recurringCounters"][str(recurring_a.id)] == 1
    assert state["recurringCounters"][str(recurring_b.id)] == 3

