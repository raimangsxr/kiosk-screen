from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.snapshot_builder import build_snapshot_payload
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


def test_snapshot_includes_pending_novelties_ordered(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    first = TopContentItem(
        id=str(uuid4()),
        organization_id=org_id,
        title="Novelty A",
        content_type="photo",
        source_reference="https://example.com/a.jpg",
        is_active=True,
        display_order=2,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=True,
        recurring_every_x_iterations=None,
    )
    second = TopContentItem(
        id=str(uuid4()),
        organization_id=org_id,
        title="Novelty B",
        content_type="video",
        source_reference="https://example.com/b.mp4",
        is_active=True,
        display_order=1,
        duration_seconds=15,
        rotation_animation="fade",
        animation_duration_milliseconds=300,
        is_novelty=True,
        recurring_every_x_iterations=None,
    )
    session.add_all([first, second])
    session.commit()
    orchestrator.bootstrap(session)

    snapshot = build_snapshot_payload(session, org_id, orchestrator=orchestrator)
    pending = snapshot["pendingNovelties"]
    assert len(pending) == 2
    assert pending[0]["contentId"] == str(second.id)
    assert pending[1]["contentId"] == str(first.id)
    assert all(item["isNovelty"] is True for item in pending)
