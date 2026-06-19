"""Shared display-order helpers for the Ad and Content services.

Centralizes the per-organization ``max+1`` computation and the
Postgres advisory-lock pattern that keeps concurrent appends and
reorders race-free.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def _advisory_lock_key(entity: str, organization_id: str) -> str:
    return f"{entity}_append:{organization_id}"


def acquire_append_lock(session: Session, entity: str, organization_id: str) -> None:
    """Acquire a Postgres transactional advisory lock for the
    (entity, organization) tuple.

    The lock is held for the duration of the current SQLAlchemy
    transaction and is released automatically on commit or
    rollback. No-op on non-Postgres dialects (the integration
    tests use SQLite; the surrounding transaction still
    serializes writes at the connection level for the test).
    """
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    session.execute(
        select(func.pg_advisory_xact_lock(func.hashtext(_advisory_lock_key(entity, organization_id))))
    )


def next_display_order(
    session: Session,
    model_cls,
    organization_id: str,
    entity: str,
) -> int:
    """Return ``max(existing display_order) + 1`` for the
    organization, after acquiring the per-organization advisory
    lock for the ``entity``.

    The caller MUST be inside a transaction. The lock is released
    when the transaction commits or rolls back. On non-Postgres
    dialects the lock is a no-op (the surrounding transaction
    still serializes the read and the write at the connection
    level for the test harness).
    """
    acquire_append_lock(session, entity, organization_id)
    current_max = session.scalar(
        select(func.max(model_cls.display_order)).where(
            model_cls.organization_id == organization_id
        )
    )
    return (current_max or 0) + 1


def assign_ordered_display_orders(
    session: Session,
    model_cls,
    organization_id: str,
    entity: str,
    ordered_ids: list[str],
) -> int:
    """Renumber ``display_order`` for every row whose id is in
    ``ordered_ids`` to its position in the list (1-indexed). The
    function returns the number of rows updated.

    Wrapped in the same per-organization advisory lock as
    ``next_display_order`` so concurrent reorders serialize
    cleanly. Rows whose id is not in ``ordered_ids`` are left
    untouched.
    """
    acquire_append_lock(session, entity, organization_id)
    rows = {
        row.id: row
        for row in session.scalars(
            select(model_cls).where(
                model_cls.organization_id == organization_id,
                model_cls.id.in_(ordered_ids)
            )
        )
    }
    for index, item_id in enumerate(ordered_ids, start=1):
        row = rows.get(item_id)
        if row is None:
            continue
        row.display_order = index
    return len(rows)
