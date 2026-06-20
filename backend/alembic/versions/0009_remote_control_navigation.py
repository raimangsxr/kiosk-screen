"""remote control rotation navigation

Revision ID: 0009_remote_nav
Revises: 0008_iframes_video_end
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0009_remote_nav"
down_revision: str | tuple[str, ...] | None = "0008_iframes_video_end"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    if not _column_exists(bind, "display_control_states", "navigation_command"):
        op.add_column("display_control_states", sa.Column("navigation_command", sa.String(length=16), nullable=True))
    if not _column_exists(bind, "display_control_states", "navigation_command_id"):
        op.add_column("display_control_states", sa.Column("navigation_command_id", sa.String(length=36), nullable=True))
    if bind.dialect.name != "sqlite":
        inspector = sa.inspect(bind)
        constraints = {constraint["name"] for constraint in inspector.get_check_constraints("display_control_states")}
        if "ck_display_control_navigation_command" not in constraints:
            op.create_check_constraint(
                "ck_display_control_navigation_command",
                "display_control_states",
                "navigation_command IS NULL OR navigation_command IN ('next', 'previous')",
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    constraints = set()
    if bind.dialect.name != "sqlite":
        constraints = {constraint["name"] for constraint in inspector.get_check_constraints("display_control_states")}
    if "ck_display_control_navigation_command" in constraints:
        op.drop_constraint("ck_display_control_navigation_command", "display_control_states", type_="check")
    if _column_exists(bind, "display_control_states", "navigation_command_id"):
        op.drop_column("display_control_states", "navigation_command_id")
    if _column_exists(bind, "display_control_states", "navigation_command"):
        op.drop_column("display_control_states", "navigation_command")
