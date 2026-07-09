from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    with factory() as session:
        yield session


@pytest.fixture
def api_client() -> Iterator[TestClient]:
    import fakeredis

    from app.application.display_orchestrator import redis_state
    from app.application.display_orchestrator.registry import OrchestratorRegistry
    from app.application.display_orchestrator.sse_hub import reset_display_sse_hub

    fake = fakeredis.FakeRedis(decode_responses=True)
    redis_state.reset_redis_client(fake)
    reset_display_sse_hub()
    OrchestratorRegistry.reset()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
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
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    app.state.skip_bootstrap = False
    OrchestratorRegistry.reset()
    reset_display_sse_hub()
    redis_state.reset_redis_client(None)
