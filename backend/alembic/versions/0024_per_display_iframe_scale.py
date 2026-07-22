"""per-display iframe scale overrides

Revision ID: 0024_per_display_iframe_scale
Revises: 0023_iframe_css_scale
Create Date: 2026-07-22
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024_per_display_iframe_scale"
down_revision: str | None = "0023_iframe_css_scale"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "display_devices",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "label", name="uq_display_devices_org_label"),
    )
    op.create_index("ix_display_devices_organization_id", "display_devices", ["organization_id"])

    op.create_table(
        "iframe_display_scale_overrides",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("display_device_id", sa.String(length=36), nullable=False),
        sa.Column("iframe_id", sa.String(length=36), nullable=False),
        sa.Column("scale_x", sa.Numeric(4, 2), nullable=False, server_default="1.00"),
        sa.Column("scale_y", sa.Numeric(4, 2), nullable=False, server_default="1.00"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["display_device_id"], ["display_devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["iframe_id"], ["iframes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("display_device_id", "iframe_id", name="uq_iframe_display_scale_device_iframe"),
    )

    op.add_column("kiosk_connections", sa.Column("display_device_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_kiosk_connections_display_device_id",
        "kiosk_connections",
        "display_devices",
        ["display_device_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_kiosk_connections_display_device_id", "kiosk_connections", type_="foreignkey")
    op.drop_column("kiosk_connections", "display_device_id")
    op.drop_table("iframe_display_scale_overrides")
    op.drop_index("ix_display_devices_organization_id", table_name="display_devices")
    op.drop_table("display_devices")
