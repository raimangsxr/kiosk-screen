"""add jump_to navigation command and target content id

Revision ID: 0014_remote_control_jump_to
Revises: 0013_remote_nav_pause_resume
Create Date: 2026-06-23

The remote control now exposes a ``jump_to`` navigation command
(spec 005 addendum, spec 014 addendum 2 FR-018..FR-020). When the
operator clicks "Show on screen now" on a content row in the
admin Content list, the kiosk resets its rotation cursor to that
content and continues the regular loop from there.

This migration:

* adds ``jump_to_content_id`` (UUID, nullable FK
  ``top_content_items.id`` ON DELETE SET NULL) to
  ``display_control_states``;
* widens the
  ``ck_display_control_navigation_command`` CHECK to include
  ``jump_to``;
* adds a new CHECK
  ``ck_display_control_jump_to_has_target`` enforcing
  ``jump_to_content_id IS NOT NULL OR navigation_command != 'jump_to'``
  so the cursor is consistent with the command.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0014_remote_control_jump_to"
down_revision: str | tuple[str, ...] | None = "0013_remote_nav_pause_resume"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_TABLE = "display_control_states"
_NAV_CONSTRAINT = "ck_display_control_navigation_command"
_JUMP_CONSTRAINT = "ck_display_control_jump_to_has_target"
_COLUMN = "jump_to_content_id"
_FK_NAME = "fk_display_control_states_jump_to_content_id"
_NAV_ALLOWED_COMMANDS = ("next", "previous", "pause", "resume", "jump_to")


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _constraint_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    for ck in inspector.get_check_constraints(table_name):
        if ck.get("name") == constraint_name:
            return True
    return False


def _fk_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    for fk in inspector.get_foreign_keys(table_name):
        if fk.get("name") == constraint_name:
            return True
    return False


def _nav_predicate() -> str:
    allowed_clause = ", ".join(f"'{value}'" for value in _NAV_ALLOWED_COMMANDS)
    return f"navigation_command IS NULL OR navigation_command IN ({allowed_clause})"


def _jump_predicate() -> str:
    return "jump_to_content_id IS NOT NULL OR navigation_command != 'jump_to'"


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, _TABLE):
        return

    if not _column_exists(bind, _TABLE, _COLUMN):
        op.add_column(
            _TABLE,
            sa.Column(_COLUMN, sa.String(length=36), nullable=True),
        )
        op.create_foreign_key(
            _FK_NAME,
            _TABLE,
            "top_content_items",
            [_COLUMN],
            ["id"],
            ondelete="SET NULL",
        )

    if _constraint_exists(bind, _TABLE, _NAV_CONSTRAINT):
        op.drop_constraint(_NAV_CONSTRAINT, _TABLE, type_="check")
    op.create_check_constraint(_NAV_CONSTRAINT, _TABLE, _nav_predicate())

    if not _constraint_exists(bind, _TABLE, _JUMP_CONSTRAINT):
        op.create_check_constraint(_JUMP_CONSTRAINT, _TABLE, _jump_predicate())


def downgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, _TABLE):
        return

    if _constraint_exists(bind, _TABLE, _JUMP_CONSTRAINT):
        op.drop_constraint(_JUMP_CONSTRAINT, _TABLE, type_="check")

    if _constraint_exists(bind, _TABLE, _NAV_CONSTRAINT):
        op.drop_constraint(_NAV_CONSTRAINT, _TABLE, type_="check")
    op.create_check_constraint(
        _NAV_CONSTRAINT,
        _TABLE,
        "navigation_command IS NULL OR navigation_command IN ('next', 'previous', 'pause', 'resume')",
    )

    if _fk_exists(bind, _TABLE, _FK_NAME):
        op.drop_constraint(_FK_NAME, _TABLE, type_="foreignkey")
    if _column_exists(bind, _TABLE, _COLUMN):
        op.drop_column(_TABLE, _COLUMN)
