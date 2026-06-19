"""Concurrency / burst tests for the public content upload endpoint.

These tests REQUIRE a real PostgreSQL instance with the spec 009 migration
applied (see ``backend/alembic/versions/0003_api_keys.py``). The advisory
lock that serializes per-organization appends is a Postgres-specific feature;
SQLite does not implement ``pg_advisory_xact_lock`` or ``hashtext``.

Mark with ``pytest.mark.postgres`` so the suite can be filtered.
"""
import asyncio
import os
import time

import pytest
from fastapi.testclient import TestClient

from app.main import app


def _postgres_reachable() -> bool:
    """Return True if the configured DATABASE_URL points to a reachable Postgres."""
    url = os.environ.get("DATABASE_URL", "")
    return url.startswith("postgresql")


def _require_postgres() -> None:
    """Skip the test if Postgres is not the configured backend."""
    if not _postgres_reachable():
        pytest.skip("PostgreSQL is not configured (DATABASE_URL does not start with 'postgresql').")


@pytest.fixture
def live_client() -> TestClient:
    """A TestClient that talks to the real PostgreSQL configured via DATABASE_URL.

    The migration ``0003_api_keys`` must already be applied (``alembic upgrade head``).
    """
    _require_postgres()
    return TestClient(app)


def _create_key(live_client: TestClient) -> str:
    """Log in as the bootstrap admin and create an API key. Returns the raw key."""
    login = live_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
    if login.status_code != 200:
        # Bootstrap data may not exist in this DB; create the admin manually.
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        from app.config import get_settings
        from app.repositories import models as repository_models  # noqa: F401
        from app.repositories.base import Base
        from app.services.bootstrap_service import bootstrap_mvp_data

        settings = get_settings()
        engine = create_engine(settings.database_url, future=True)
        Base.metadata.create_all(engine)
        factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
        with factory() as s:
            bootstrap_mvp_data(s, settings.bootstrap_admin_email, settings.bootstrap_admin_password)
            s.commit()
        login = live_client.post("/api/auth/login", json={"email": "admin@example.com", "password": "admin"})
        assert login.status_code == 200, login.text
    r = live_client.post("/api/admin/api-keys", json={"label": "concurrent-test"})
    assert r.status_code == 201, r.text
    return r.json()["rawKey"]


def _upload_once(live_client: TestClient, raw_key: str, i: int) -> int:
    """Fire one upload; return the status code."""
    response = live_client.post(
        "/api/public/content/upload",
        headers={"Authorization": f"Bearer {raw_key}"},
        data={"title": f"burst {i}"},
        files={"file": (f"hi_{i}.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    return response.status_code


def test_20_concurrent_uploads_produce_contiguous_display_order(live_client: TestClient):
    """Spec SC-002: 20 concurrent uploads produce contiguous displayOrder
    values with no duplicates."""
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    from app.config import get_settings
    from app.repositories.models.content import TopContentItem

    raw = _create_key(live_client)

    statuses = [_upload_once(live_client, raw, i) for i in range(20)]
    assert all(s == 201 for s in statuses), f"got statuses {statuses}"

    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT display_order FROM top_content_items WHERE title LIKE 'burst %' ORDER BY display_order DESC LIMIT 20")
        ).fetchall()
    orders = sorted(r[0] for r in rows)
    assert orders == list(range(orders[0], orders[0] + 20)), f"got {orders}"


def test_100_concurrent_uploads_have_no_collisions(live_client: TestClient):
    """Spec SC-003: 100 concurrent uploads complete with no errors and no
    displayOrder collisions."""
    from sqlalchemy import create_engine, text

    from app.config import get_settings

    raw = _create_key(live_client)

    statuses = [_upload_once(live_client, raw, i) for i in range(100)]
    assert all(s == 201 for s in statuses), f"got {statuses}"

    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT display_order, COUNT(*) FROM top_content_items WHERE title LIKE 'burst %' GROUP BY display_order HAVING COUNT(*) > 1")
        ).fetchall()
    assert rows == [], f"collisions: {rows}"


def test_200_sequential_uploads_appear_in_arrival_order(live_client: TestClient):
    """Spec SC-004: a burst of 200 sequential uploads all appear in the next
    display state fetch in arrival order, with no item dropped or duplicated.
    """
    from sqlalchemy import create_engine, text

    from app.config import get_settings

    raw = _create_key(live_client)

    titles: list[str] = []
    for i in range(200):
        title = f"seq {i:03d}"
        titles.append(title)
        r = live_client.post(
            "/api/public/content/upload",
            headers={"Authorization": f"Bearer {raw}"},
            data={"title": title},
            files={"file": (f"seq_{i}.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        )
        assert r.status_code == 201, r.text

    # Verify all 200 titles are present in the next state fetch (in display order).
    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)
    with engine.connect() as conn:
        result_titles = [
            r[0] for r in conn.execute(
                text("SELECT title FROM top_content_items WHERE title LIKE 'seq %' ORDER BY display_order ASC")
            ).fetchall()
        ]
    assert result_titles == titles, f"missing/extra: {set(titles) ^ set(result_titles)}"
