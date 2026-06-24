"""widen remote control navigation CHECK to include pause and resume

Revision ID: 0013_remote_nav_pause_resume
Revises: 0012_content_rotation_modes
Create Date: 2026-06-23

The original 0009_remote_control_navigation migration declared
``navigation_command IN ('next', 'previous')``. Specs 005
(`Display Control State`) and 007 (`Content Rotation Modes`) add
``pause`` and ``resume`` to the enum, and the runtime now stamps
those values on the row whenever the operator hits the pause or
resume button on the remote control. The narrow CHECK therefore
turns every successful pause/resume into a CheckViolation at
commit time, which surfaces as an unhandled 500 on
``POST /api/display/remote-control/navigation``.

This migration drops the previous constraint and recreates it with
the full FR-002 enum (``next | previous | pause | resume``).
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0013_remote_nav_pause_resume"
down_revision: str | tuple[str, ...] | None = "0012_content_rotation_modes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_CONSTRAINT_NAME = "ck_display_control_navigation_command"
_ALLOWED_COMMANDS = ("next", "previous", "pause", "resume")


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _constraint_exists(bind, table_name: str, constraint_name: str) -> bool:
    if not _table_exists(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(
        ck.get("name") == constraint_name for ck in inspector.get_check_constraints(table_name)
    )


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "display_control_states"):
        return

    allowed_clause = ", ".join(f"'{value}'" for value in _ALLOWED_COMMANDS)
    new_predicate = (
        f"navigation_command IS NULL OR navigation_command IN ({allowed_clause})"
    )

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("display_control_states") as batch_op:
            if _constraint_exists(bind, "display_control_states", _CONSTRAINT_NAME):
                batch_op.drop_constraint(_CONSTRAINT_NAME, type_="check")
            batch_op.create_constraint(
                _CONSTRAINT_NAME,
                new_predicate,
            )
        return

    if _constraint_exists(bind, "display_control_states", _CONSTRAINT_NAME):
        op.drop_constraint(
            _CONSTRAINT_NAME,
            "display_control_states",
            type_="check",
        )
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        "display_control_states",
        new_predicate,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "display_control_states"):
        return

    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("display_control_states") as batch_op:
            if _constraint_exists(bind, "display_control_states", _CONSTRAINT_NAME):
                batch_op.drop_constraint(_CONSTRAINT_NAME, type_="check")
            batch_op.create_constraint(
                _CONSTRAINT_NAME,
                "navigation_command IS NULL OR navigation_command IN ('next', 'previous')",
            )
        return

    if _constraint_exists(bind, "display_control_states", _CONSTRAINT_NAME):
        op.drop_constraint(
            _CONSTRAINT_NAME,
            "display_control_states",
            type_="check",
        )
    op.create_check_constraint(
        _CONSTRAINT_NAME,
        "display_control_states",
        "navigation_command IS NULL OR navigation_command IN ('next', 'previous')",
    )
