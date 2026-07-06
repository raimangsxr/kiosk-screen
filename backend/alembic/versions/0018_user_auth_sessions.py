"""add user_auth_sessions for shared operator login sessions

Revision ID: 0018_user_auth_sessions
Revises: 0017_content_is_novelty
Create Date: 2026-07-06

CHG-031: replace in-memory auth_sessions with database-backed sessions.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0018_user_auth_sessions"
down_revision: str | None = "0017_content_is_novelty"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_auth_sessions_user_id", "user_auth_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_auth_sessions_user_id", table_name="user_auth_sessions")
    op.drop_table("user_auth_sessions")
