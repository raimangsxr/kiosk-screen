from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings


def create_database_engine(database_url: str | None = None) -> Engine:
    url = database_url or get_settings().database_url
    return create_engine(url, future=True)


@lru_cache
def get_engine() -> Engine:
    return create_database_engine()


def create_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    return sessionmaker(bind=engine or get_engine(), autoflush=False, autocommit=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with create_session_factory()() as session:
        yield session
