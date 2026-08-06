from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.preload import (
    build_preload_item,
    build_preload_items_from_snapshot,
    pending_novelty_items,
)
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from sqlalchemy import select

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


def _content(
    organization_id: str,
    content_id: str,
    *,
    display_order: int,
    is_novelty: bool = False,
    content_type: str = "photo",
) -> TopContentItem:
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
        is_novelty=is_novelty,
        recurring_every_x_iterations=None,
    )


def test_build_preload_item_marks_novelty_flag() -> None:
    item = _content("org", str(uuid4()), display_order=1, is_novelty=True)
    built = build_preload_item(item, is_novelty=True)
    assert built is not None
    assert built["isNovelty"] is True
    assert built["contentId"] == str(item.id)


def test_pending_novelty_items_returns_only_novelties(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    novelty_id = str(uuid4())
    regular_id = str(uuid4())
    session.add(_content(org_id, novelty_id, display_order=1, is_novelty=True))
    session.add(_content(org_id, regular_id, display_order=2, is_novelty=False))
    session.commit()
    orchestrator.bootstrap(session)

    items = pending_novelty_items(orchestrator, session)
    assert len(items) == 1
    assert items[0]["contentId"] == novelty_id
    assert items[0]["isNovelty"] is True


def test_build_preload_items_from_snapshot_includes_next_regular(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    for item in session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id)):
        session.delete(item)
    session.commit()

    first_id = str(uuid4())
    second_id = str(uuid4())
    session.add(_content(org_id, first_id, display_order=1))
    session.add(_content(org_id, second_id, display_order=2))
    session.commit()
    orchestrator.bootstrap(session)

    items = build_preload_items_from_snapshot(orchestrator, session)
    assert any(item["contentId"] == second_id and item["isNovelty"] is False for item in items)


def test_build_preload_items_from_snapshot_empty_when_no_eligible_media(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    for item in session.scalars(select(TopContentItem).where(TopContentItem.organization_id == org_id)):
        session.delete(item)
    session.commit()
    orchestrator.bootstrap(session)
    assert build_preload_items_from_snapshot(orchestrator, session) == []
