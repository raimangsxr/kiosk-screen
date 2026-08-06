from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


def create_database_engine(database_url: str | None = None) -> Engine:
    settings = get_settings()
    url = database_url or settings.database_url
    kwargs: dict[str, object] = {
        "future": True,
        "pool_pre_ping": settings.db_pool_pre_ping,
        "pool_recycle": settings.db_pool_recycle_seconds,
    }
    # QueuePool sizing only applies to server-backed databases. SQLite (used in
    # tests and via StaticPool) rejects pool_size/max_overflow.
    if not url.startswith("sqlite"):
        kwargs["pool_size"] = settings.db_pool_size
        kwargs["max_overflow"] = settings.db_max_overflow
        kwargs["pool_timeout"] = settings.db_pool_timeout_seconds
    return create_engine(url, **kwargs)


@lru_cache
def get_engine() -> Engine:
    return create_database_engine()


def create_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    return sessionmaker(bind=engine or get_engine(), autoflush=False, autocommit=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with create_session_factory()() as session:
        yield session


# Ephemeral sessions used by long-lived SSE endpoints and the orchestrator
# reaper. Exposed through a small indirection so tests can point them at the
# in-memory test engine instead of the real pool (R8).
_stream_session_factory_override: sessionmaker[Session] | None = None


def stream_session_factory() -> sessionmaker[Session]:
    if _stream_session_factory_override is not None:
        return _stream_session_factory_override
    return create_session_factory()


def set_stream_session_factory_override(factory: sessionmaker[Session] | None) -> None:
    """Test hook: force stream/reaper ephemeral sessions onto a given factory."""
    global _stream_session_factory_override
    _stream_session_factory_override = factory
