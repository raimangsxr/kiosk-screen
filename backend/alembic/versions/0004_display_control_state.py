"""display control state

Revision ID: 0004_display_control_state
Revises: 0003_remote_control_polling
Create Date: 2026-06-18
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0004_display_control_state"
down_revision: str | None = "0003_remote_control_polling"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "display_control_states",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("display_session_id", sa.String(), nullable=False),
        sa.Column("content_mode", sa.String(length=16), nullable=False),
        sa.Column("selected_content_id", sa.String(), nullable=True),
        sa.Column("ads_visible", sa.Boolean(), nullable=False),
        sa.Column("updated_by_user_id", sa.String(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("content_mode IN ('loop', 'iframe')", name="ck_display_control_content_mode"),
        sa.ForeignKeyConstraint(["display_session_id"], ["operator_sessions.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["selected_content_id"], ["top_content_items.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("display_session_id", name="uq_display_control_state_session"),
    )


def downgrade() -> None:
    op.drop_table("display_control_states")
