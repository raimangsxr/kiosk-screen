"""iframe css scale; remove embed density tables and columns

Revision ID: 0023_iframe_css_scale
Revises: 0022_display_layout_profiles
Create Date: 2026-07-21
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023_iframe_css_scale"
down_revision: str | None = "0022_display_layout_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("fk_kiosk_connections_display_device_id", "kiosk_connections", type_="foreignkey")
    op.drop_column("kiosk_connections", "display_device_id")

    op.drop_index("ix_display_devices_organization_id", table_name="display_devices")
    op.drop_table("display_devices")
    op.drop_index("ix_display_layout_profiles_organization_id", table_name="display_layout_profiles")
    op.drop_table("display_layout_profiles")

    op.drop_column("kiosk_display_configurations", "embed_density_defaults")
    op.drop_column("iframes", "embed_app_family")

    op.add_column(
        "iframes",
        sa.Column("scale_x", sa.Numeric(4, 2), nullable=False, server_default="1.00"),
    )
    op.add_column(
        "iframes",
        sa.Column("scale_y", sa.Numeric(4, 2), nullable=False, server_default="1.00"),
    )


def downgrade() -> None:
    op.drop_column("iframes", "scale_y")
    op.drop_column("iframes", "scale_x")

    op.add_column(
        "iframes",
        sa.Column("embed_app_family", sa.String(length=32), nullable=True),
    )

    op.add_column(
        "kiosk_display_configurations",
        sa.Column(
            "embed_density_defaults",
            sa.JSON(),
            nullable=False,
            server_default='{"amrn_bull": 720, "amrn_escalabirras": 720}',
        ),
    )

    op.create_table(
        "display_layout_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("densities", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_display_layout_profiles_org_name"),
    )
    op.create_index(
        "ix_display_layout_profiles_organization_id",
        "display_layout_profiles",
        ["organization_id"],
    )

    op.create_table(
        "display_devices",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("layout_profile_id", sa.String(length=36), nullable=True),
        sa.Column("local_overrides", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(
            ["layout_profile_id"],
            ["display_layout_profiles.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "label", name="uq_display_devices_org_label"),
    )
    op.create_index(
        "ix_display_devices_organization_id",
        "display_devices",
        ["organization_id"],
    )

    op.add_column(
        "kiosk_connections",
        sa.Column("display_device_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_kiosk_connections_display_device_id",
        "kiosk_connections",
        "display_devices",
        ["display_device_id"],
        ["id"],
        ondelete="SET NULL",
    )
