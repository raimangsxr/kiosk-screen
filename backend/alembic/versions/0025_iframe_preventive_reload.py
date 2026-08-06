"""kiosk iframe preventive reload seconds

Revision ID: 0025_iframe_preventive_reload
Revises: 0024_per_display_iframe_scale
Create Date: 2026-08-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0025_iframe_preventive_reload"
down_revision: str | None = "0024_per_display_iframe_scale"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "kiosk_display_configurations",
        sa.Column(
            "iframe_preventive_reload_seconds",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "ck_kiosk_iframe_preventive_reload_range",
        "kiosk_display_configurations",
        "iframe_preventive_reload_seconds >= 0 AND iframe_preventive_reload_seconds <= 86400",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_kiosk_iframe_preventive_reload_range",
        "kiosk_display_configurations",
        type_="check",
    )
    op.drop_column("kiosk_display_configurations", "iframe_preventive_reload_seconds")
