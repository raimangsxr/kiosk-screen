from __future__ import annotations

from collections.abc import Iterator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.repositories.base import Base, utc_now
from app.repositories import models as repository_models  # noqa: F401
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration
from app.repositories.models.kiosk_connection import KioskConnection
from app.repositories.models.operator_session import OperatorSession
from app.repositories.models.user import User
from app.repositories.session import get_session
from app.services.bootstrap_service import bootstrap_mvp_data


@pytest.fixture
def api_client() -> Iterator[TestClient]:
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
    app.state.test_session_factory = factory
    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()


def _login_admin(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    assert response.status_code == 200


def test_create_rename_delete_display_device(api_client: TestClient) -> None:
    _login_admin(api_client)
    created = api_client.post("/api/admin/display-devices", json={"label": "Sala 1"})
    assert created.status_code == 201
    device_id = created.json()["id"]

    renamed = api_client.patch(f"/api/admin/display-devices/{device_id}", json={"label": "Sala principal"})
    assert renamed.status_code == 200
    assert renamed.json()["label"] == "Sala principal"

    listed = api_client.get("/api/admin/display-devices")
    assert listed.status_code == 200
    assert any(row["id"] == device_id for row in listed.json())

    deleted = api_client.delete(f"/api/admin/display-devices/{device_id}")
    assert deleted.status_code == 204


def test_delete_display_device_with_kiosk_connection_history(api_client: TestClient) -> None:
    _login_admin(api_client)
    created = api_client.post("/api/admin/display-devices", json={"label": "Sala histórica"})
    assert created.status_code == 201
    device_id = created.json()["id"]
    org_id = created.json()["organizationId"]

    factory = api_client.app.state.test_session_factory
    with factory() as session:
        operator = session.scalar(select(User).where(User.email == "operator@example.com"))
        configuration = session.scalar(
            select(KioskDisplayConfiguration).where(KioskDisplayConfiguration.organization_id == org_id)
        )
        assert operator is not None
        assert configuration is not None
        operator_session = OperatorSession(
            organization_id=org_id,
            user_id=operator.id,
            display_configuration_id=configuration.id,
            valid_until=utc_now() + timedelta(hours=1),
        )
        session.add(operator_session)
        session.flush()
        session.add(
            KioskConnection(
                id="kiosk-history-1",
                organization_id=org_id,
                operator_session_id=operator_session.id,
                client_instance_id="client-history",
                label="Sala histórica",
                display_device_id=device_id,
                connected_at=utc_now(),
            )
        )
        session.commit()

    deleted = api_client.delete(f"/api/admin/display-devices/{device_id}")
    assert deleted.status_code == 204

    listed = api_client.get("/api/admin/display-devices")
    assert listed.status_code == 200
    assert not any(row["id"] == device_id for row in listed.json())
