"""event branding layout columns

Revision ID: 0016_event_branding_layout
Revises: 0015_relax_kiosk_region_ratio
Create Date: 2026-06-28

Adds the two JSON columns that store the per-element branding
layout (logo, event name). Both columns default to NULL so
existing rows render with the documented visual defaults and the
migration is safe to run while the backend is serving traffic.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0016_event_branding_layout"
down_revision: str | tuple[str, ...] | None = "0015_relax_kiosk_region_ratio"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()

    if not _column_exists(bind, "event_configurations", "logo_layout"):
        op.add_column(
            "event_configurations",
            sa.Column("logo_layout", sa.JSON(), nullable=True),
        )

    if not _column_exists(bind, "event_configurations", "event_name_layout"):
        op.add_column(
            "event_configurations",
            sa.Column("event_name_layout", sa.JSON(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _column_exists(bind, "event_configurations", "logo_layout"):
        op.drop_column("event_configurations", "logo_layout")

    if _column_exists(bind, "event_configurations", "event_name_layout"):
        op.drop_column("event_configurations", "event_name_layout")