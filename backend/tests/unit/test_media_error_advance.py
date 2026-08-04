from __future__ import annotations

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.application.display_orchestrator import redis_state
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.application.display_orchestrator.service import DisplayOrchestrator
from app.application.display_orchestrator.sse_hub import get_display_sse_hub, reset_display_sse_hub
from app.repositories.events import DisplayEventRepository
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


def test_first_media_error_advances_once(
    orchestrator_env: tuple[DisplayOrchestrator, Session, str],
) -> None:
    orchestrator, session, org_id = orchestrator_env
    orchestrator.bootstrap(session)
    state = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    command_id = state["currentTopCommandId"]
    content_id = state["currentTopContentId"]

    orchestrator.handle_media_error(session, command_id=command_id, content_id=content_id, metadata=None)
    after_first = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert after_first["currentTopCommandId"] != command_id

    previous_command = after_first["currentTopCommandId"]
    orchestrator.handle_media_error(session, command_id=command_id, content_id=content_id, metadata=None)
    after_second = redis_state.redis_get_json(redis_state.orchestrator_key(org_id, "session-1"))
    assert after_second["currentTopCommandId"] == previous_command

    events = DisplayEventRepository(session).list_recent(org_id)
    assert any(event.event_type == "media_error" for event in events)
