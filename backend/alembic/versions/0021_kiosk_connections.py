"""add kiosk_connections ops audit trail

Revision ID: 0021_kiosk_connections
Revises: 0020_deprecate_polling
Create Date: 2026-07-08
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021_kiosk_connections"
down_revision: str | None = "0020_deprecate_polling"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "kiosk_connections",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("operator_session_id", sa.String(length=36), nullable=False),
        sa.Column("client_instance_id", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["operator_session_id"], ["operator_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_kiosk_connections_organization_id",
        "kiosk_connections",
        ["organization_id"],
    )
    op.create_index(
        "ix_kiosk_connections_operator_session_id",
        "kiosk_connections",
        ["operator_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_kiosk_connections_operator_session_id", table_name="kiosk_connections")
    op.drop_index("ix_kiosk_connections_organization_id", table_name="kiosk_connections")
    op.drop_table("kiosk_connections")
