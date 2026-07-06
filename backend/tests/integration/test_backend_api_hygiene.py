from collections.abc import Iterator
from unittest.mock import patch

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.application.display_control.service import DisplayControlService
from app.main import app
from app.repositories.base import Base
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.models.content import TopContentItem
from app.repositories.models.display_control_state import DisplayControlState
from app.repositories.models.display_event import DisplayEvent
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.role_assignment import RoleAssignment
from app.repositories.session import get_session
from app.repositories.base import utc_now
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def hygiene_client() -> Iterator[tuple[TestClient, sessionmaker[Session]]]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
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
    with TestClient(app) as client:
        yield client, factory
    app.dependency_overrides.clear()
    app.state.skip_bootstrap = False


def _login(client: TestClient, email: str, password: str) -> None:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


def test_open_display_supersedes_prior_active_sessions(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, factory = hygiene_client
    _login(client, "admin@example.com", "admin")

    first = client.post("/api/display/open")
    second = client.post("/api/display/open")
    assert first.status_code == 200
    assert second.status_code == 200

    with factory() as session:
        active_sessions = list(
            session.scalars(select(OperatorSession).where(OperatorSession.ended_at.is_(None)))
        )
        assert len(active_sessions) == 1
        ended_count = session.scalar(
            select(func.count()).select_from(OperatorSession).where(OperatorSession.ended_at.is_not(None))
        )
        assert ended_count == 1


def test_display_state_get_is_read_only(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, factory = hygiene_client
    _login(client, "admin@example.com", "admin")
    opened = client.post("/api/display/open")
    assert opened.status_code == 200

    with factory() as session:
        control_before = session.scalar(select(func.count()).select_from(DisplayControlState))
        events_before = session.scalar(select(func.count()).select_from(DisplayEvent))

    for _ in range(3):
        response = client.get("/api/display/state")
        assert response.status_code == 200

    with factory() as session:
        control_after = session.scalar(select(func.count()).select_from(DisplayControlState))
        events_after = session.scalar(select(func.count()).select_from(DisplayEvent))
        assert control_before == control_after
        assert events_before == events_after


def test_duplicate_user_email_returns_conflict_envelope(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, _factory = hygiene_client
    _login(client, "admin@example.com", "admin")

    payload = {
        "email": "operator@example.com",
        "displayName": "Duplicate",
        "isActive": True,
        "roles": ["display_viewer"],
        "password": "duplicate-pass",
    }
    response = client.post("/api/users", json=payload)

    assert response.status_code == 409
    body = response.json()
    assert body["code"] == "duplicate_email"
    assert body["category"] == "conflict"
    assert "message" in body


def test_invalid_role_in_database_returns_forbidden(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, factory = hygiene_client
    with factory() as session:
        assignment = session.scalar(select(RoleAssignment).limit(1))
        assert assignment is not None
        assignment.role = "not_a_real_role"
        session.commit()

    _login(client, "admin@example.com", "admin")
    response = client.get("/api/users")
    assert response.status_code == 403
    body = response.json()
    assert body["code"] == "invalid_role"
    assert body["category"] == "permission"


def test_ready_endpoint_reports_dependency_failures(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, _factory = hygiene_client
    with patch("app.services.health_probe_service.probe_database", side_effect=RuntimeError("db down")):
        response = client.get("/api/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert "database" in body["checks"]


def test_health_stays_lightweight_when_database_is_down(hygiene_client: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, _factory = hygiene_client
    with patch("app.services.health_probe_service.probe_database", side_effect=RuntimeError("db down")):
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_fixed_fallback_on_read_does_not_persist(db_session) -> None:
    result = bootstrap_mvp_data(db_session, "admin@example.com", "admin")
    session = OperatorSession(
        organization_id=result.organization.id,
        user_id=result.operator.id,
        display_configuration_id=result.configuration.id,
        valid_until=utc_now() + timedelta(minutes=30),
    )
    db_session.add(session)
    db_session.commit()

    service = DisplayControlService(db_session)
    fixed_content = db_session.scalar(select(TopContentItem).limit(1))
    assert fixed_content is not None
    fixed_content.is_fixed = True
    db_session.commit()

    service.update_state(
        result.organization.id,
        session.id,
        result.administrator.id,
        content_mode="fixed",
        selected_iframe_id=None,
        ads_visible=True,
        selected_fixed_content_id=fixed_content.id,
    )
    fixed_content.is_fixed = False
    db_session.commit()

    read_state = service.read_state_for_active_session(result.organization.id)
    assert read_state is not None
    assert read_state.content_mode == "loop"

    persisted = service._existing_state(result.organization.id, session.id)
    assert persisted is not None
    assert persisted.content_mode == "fixed"
