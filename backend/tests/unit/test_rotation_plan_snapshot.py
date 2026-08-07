from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.rotation_plan import compute_rotation_plan_snapshot
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.models.content import TopContentItem
from app.services.bootstrap_service import bootstrap_mvp_data


def _content(
    organization_id: str,
    *,
    display_order: int,
    title: str,
    is_novelty: bool = False,
    recurring_every_x_iterations: int | None = None,
) -> TopContentItem:
    content_id = str(uuid4())
    return TopContentItem(
        id=content_id,
        organization_id=organization_id,
        title=title,
        content_type="photo",
        source_reference=f"https://example.com/{content_id}.jpg",
        is_active=True,
        display_order=display_order,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=is_novelty,
        recurring_every_x_iterations=recurring_every_x_iterations,
    )


@pytest.fixture
def orchestrator_env(db_session: Session):
    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    bootstrap = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    db_session.commit()
    org_id = bootstrap.organization.id
    factory = sessionmaker(bind=db_session.get_bind(), autoflush=False, autocommit=False, expire_on_commit=False)
    OrchestratorRegistry.configure(lambda: factory())
    orchestrator = OrchestratorRegistry.get_or_create(org_id, "session-1")
    yield orchestrator, db_session, org_id
    orchestrator.shutdown()
    OrchestratorRegistry.reset()
    redis_state.reset_redis_client(None)


def test_snapshot_regular_queue_next_item(orchestrator_env) -> None:
    orchestrator, session, org_id = orchestrator_env
    items = [
        _content(org_id, display_order=1, title="Item 1"),
        _content(org_id, display_order=2, title="Item 2"),
    ]
    session.add_all(items)
    session.commit()

    orchestrator._update_state(  # noqa: SLF001
        {
            "contentMode": "loop",
            "isPaused": False,
            "currentTopContentId": str(items[0].id),
            "regularCursorId": str(items[0].id),
        }
    )

    snapshot = compute_rotation_plan_snapshot(orchestrator, session, reason="test")
    assert snapshot.showing is not None
    assert snapshot.showing.id == str(items[0].id)
    assert snapshot.next is not None
    assert snapshot.next.id == str(items[1].id)
    assert snapshot.novelties == ()


def test_snapshot_novelty_insert_while_showing_unchanged(orchestrator_env) -> None:
    orchestrator, session, org_id = orchestrator_env
    regular = [
        _content(org_id, display_order=1, title="Item 1"),
        _content(org_id, display_order=2, title="Item 2"),
        _content(org_id, display_order=3, title="Item 3"),
        _content(org_id, display_order=4, title="Item 4"),
    ]
    novelty = _content(org_id, display_order=99, title="Novelty 250", is_novelty=True)
    session.add_all([*regular, novelty])
    session.commit()

    orchestrator._update_state(  # noqa: SLF001
        {
            "contentMode": "loop",
            "isPaused": False,
            "currentTopContentId": str(regular[2].id),
            "regularCursorId": str(regular[2].id),
        }
    )

    snapshot = compute_rotation_plan_snapshot(orchestrator, session, reason="public_upload_replan")
    assert snapshot.showing is not None
    assert snapshot.showing.id == str(regular[2].id)
    assert snapshot.next is not None
    assert snapshot.next.id == str(regular[3].id)
    assert snapshot.novelties == (str(novelty.id),)


def test_snapshot_multiple_novelties_in_display_order(orchestrator_env) -> None:
    orchestrator, session, org_id = orchestrator_env
    novelty_a = _content(org_id, display_order=2, title="Nov A", is_novelty=True)
    novelty_b = _content(org_id, display_order=1, title="Nov B", is_novelty=True)
    session.add_all([novelty_a, novelty_b])
    session.commit()

    orchestrator._update_state({"contentMode": "loop", "isPaused": False})  # noqa: SLF001

    snapshot = compute_rotation_plan_snapshot(orchestrator, session)
    assert snapshot.novelties == (str(novelty_b.id), str(novelty_a.id))


def test_snapshot_ready_novelty_precedes_rescheduled_regular(orchestrator_env) -> None:
    orchestrator, session, org_id = orchestrator_env
    regular_a = _content(org_id, display_order=1, title="Item 1")
    regular_b = _content(org_id, display_order=2, title="Item 2")
    novelty = _content(org_id, display_order=6, title="Novelty 6", is_novelty=True)
    session.add_all([regular_a, regular_b, novelty])
    session.commit()
    hub = get_display_sse_hub()
    registration = hub.register_kiosk(
        organization_id=org_id,
        operator_session_id=orchestrator.operator_session_id,
        client_instance_id="ready-planner",
        label="Planner kiosk",
    )
    hub.subscribe(registration)
    orchestrator._update_state(  # noqa: SLF001
        {
            "contentMode": "loop",
            "isPaused": False,
            "currentTopContentId": str(regular_a.id),
            "regularCursorId": str(regular_a.id),
            "rescheduledRegularContentId": str(regular_b.id),
            "noveltyReadyKiosks": {str(novelty.id): [registration.kiosk_id]},
        }
    )

    snapshot = compute_rotation_plan_snapshot(orchestrator, session)

    assert snapshot.next is not None
    assert snapshot.next.id == str(novelty.id)
    assert snapshot.rescheduled_regular is not None
    assert snapshot.rescheduled_regular.id == str(regular_b.id)


def test_snapshot_paused_returns_null_showing(orchestrator_env) -> None:
    orchestrator, session, org_id = orchestrator_env
    item = _content(org_id, display_order=1, title="Paused")
    session.add(item)
    session.commit()
    orchestrator._update_state(  # noqa: SLF001
        {
            "contentMode": "loop",
            "isPaused": True,
            "currentTopContentId": str(item.id),
        }
    )

    snapshot = compute_rotation_plan_snapshot(orchestrator, session)
    assert snapshot.showing is None
    assert snapshot.next is None
