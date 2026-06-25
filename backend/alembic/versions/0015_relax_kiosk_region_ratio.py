"""relax kiosk region ratio CHECK constraints and backfill default

Revision ID: 0015_relax_kiosk_region_ratio
Revises: 0014_remote_control_jump_to
Create Date: 2026-06-25

Spec 020 (CHG-020) makes the kiosk region split configurable. The
historical contract (CHG-002, consolidated) enforced exact-value
CHECK constraints ``top_region_ratio = 4`` and
``bottom_region_ratio = 1``. This migration:

* drops the two exact-value CHECK constraints;
* backfills ``top_region_ratio = 5`` for every existing row (the
  new default documented in the spec) — the UPDATE is idempotent
  because re-running it finds no rows matching ``<> 5``;
* re-adds the CHECK constraints as ``top_region_ratio > 0`` and
  ``bottom_region_ratio > 0``, which is the smallest safety bound
  that lets the operator pick any positive ratio.

The ``downgrade()`` reverses the change: drop the positive CHECK,
restore the exact-value CHECK, no UPDATE (the historical
``top_region_ratio=4`` value is no longer guaranteed by the data).
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0015_relax_kiosk_region_ratio"
down_revision: str | tuple[str, ...] | None = "0014_remote_control_jump_to"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLE = "kiosk_display_configurations"
_TOP_CHECK_OLD = "ck_kiosk_top_region_ratio"
_TOP_CHECK_NEW = "ck_kiosk_top_region_ratio_positive"
_BOTTOM_CHECK_OLD = "ck_kiosk_bottom_region_ratio"
_BOTTOM_CHECK_NEW = "ck_kiosk_bottom_region_ratio_positive"


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _constraint_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    for ck in inspector.get_check_constraints(table_name):
        if ck.get("name") == constraint_name:
            return True
    return False


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, _TABLE):
        return

    if _constraint_exists(bind, _TABLE, _TOP_CHECK_OLD):
        op.drop_constraint(_TOP_CHECK_OLD, _TABLE, type_="check")
    if _constraint_exists(bind, _TABLE, _BOTTOM_CHECK_OLD):
        op.drop_constraint(_BOTTOM_CHECK_OLD, _TABLE, type_="check")

    op.execute(
        f"UPDATE {_TABLE} SET top_region_ratio = 5 WHERE top_region_ratio <> 5"
    )

    if not _constraint_exists(bind, _TABLE, _TOP_CHECK_NEW):
        op.create_check_constraint(
            _TOP_CHECK_NEW, _TABLE, "top_region_ratio > 0"
        )
    if not _constraint_exists(bind, _TABLE, _BOTTOM_CHECK_NEW):
        op.create_check_constraint(
            _BOTTOM_CHECK_NEW, _TABLE, "bottom_region_ratio > 0"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, _TABLE):
        return

    if _constraint_exists(bind, _TABLE, _TOP_CHECK_NEW):
        op.drop_constraint(_TOP_CHECK_NEW, _TABLE, type_="check")
    if _constraint_exists(bind, _TABLE, _BOTTOM_CHECK_NEW):
        op.drop_constraint(_BOTTOM_CHECK_NEW, _TABLE, type_="check")

    op.create_check_constraint(_TOP_CHECK_OLD, _TABLE, "top_region_ratio = 4")
    op.create_check_constraint(_BOTTOM_CHECK_OLD, _TABLE, "bottom_region_ratio = 1")
