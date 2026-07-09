from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.repositories.base import Base
from app.repositories.kiosk_connections import KioskConnectionRepository
from app.repositories.models.kiosk_connection import KioskConnection
from app.repositories import models as repository_models  # noqa: F401


def _session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def test_record_connected_creates_and_reconnects_row() -> None:
    session = _session()
    repo = KioskConnectionRepository(session)

    repo.record_connected(
        kiosk_id="kiosk-1",
        organization_id="org-1",
        operator_session_id="session-1",
        client_instance_id="browser-1",
        label="Hall A",
    )
    session.commit()

    row = session.scalar(select(KioskConnection).where(KioskConnection.id == "kiosk-1"))
    assert row is not None
    assert row.disconnected_at is None
    assert row.label == "Hall A"

    repo.record_disconnected("kiosk-1")
    session.commit()
    assert row.disconnected_at is not None

    repo.record_connected(
        kiosk_id="kiosk-1",
        organization_id="org-1",
        operator_session_id="session-2",
        client_instance_id="browser-1",
        label="Hall B",
    )
    session.commit()
    assert row.disconnected_at is None
    assert row.operator_session_id == "session-2"
    assert row.label == "Hall B"
