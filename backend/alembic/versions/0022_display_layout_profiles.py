"""display layout profiles and per-device embed density

Revision ID: 0022_display_layout_profiles
Revises: 0021_kiosk_connections
Create Date: 2026-07-17
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0022_display_layout_profiles"
down_revision: str | None = "0021_kiosk_connections"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEFAULT_DENSITIES = '{"amrn_bull": 720, "amrn_escalabirras": 720}'


def upgrade() -> None:
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
        "kiosk_display_configurations",
        sa.Column(
            "embed_density_defaults",
            sa.JSON(),
            nullable=False,
            server_default=_DEFAULT_DENSITIES,
        ),
    )

    op.add_column(
        "iframes",
        sa.Column("embed_app_family", sa.String(length=32), nullable=True),
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


def downgrade() -> None:
    op.drop_constraint("fk_kiosk_connections_display_device_id", "kiosk_connections", type_="foreignkey")
    op.drop_column("kiosk_connections", "display_device_id")
    op.drop_column("iframes", "embed_app_family")
    op.drop_column("kiosk_display_configurations", "embed_density_defaults")
    op.drop_index("ix_display_devices_organization_id", table_name="display_devices")
    op.drop_table("display_devices")
    op.drop_index("ix_display_layout_profiles_organization_id", table_name="display_layout_profiles")
    op.drop_table("display_layout_profiles")
