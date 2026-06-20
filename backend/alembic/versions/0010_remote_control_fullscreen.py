"""remote control fullscreen request

Revision ID: 0010_remote_fullscreen
Revises: 0009_remote_nav
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0010_remote_fullscreen"
down_revision: str | tuple[str, ...] | None = "0009_remote_nav"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    if not _column_exists(bind, "display_control_states", "fullscreen_requested"):
        op.add_column(
            "display_control_states",
            sa.Column("fullscreen_requested", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _column_exists(bind, "display_control_states", "fullscreen_requested"):
        op.drop_column("display_control_states", "fullscreen_requested")
