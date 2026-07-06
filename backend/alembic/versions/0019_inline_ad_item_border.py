"""add inline ad item border styling columns

Revision ID: 0019_inline_ad_item_border
Revises: 0018_user_auth_sessions
Create Date: 2026-07-06
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0019_inline_ad_item_border"
down_revision: str | None = "0018_user_auth_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "kiosk_display_configurations",
        sa.Column("inline_ad_item_border_radius_px", sa.Integer(), nullable=False, server_default="5"),
    )
    op.add_column(
        "kiosk_display_configurations",
        sa.Column("inline_ad_item_border_width_px", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "kiosk_display_configurations",
        sa.Column("inline_ad_item_border_color", sa.String(length=32), nullable=False, server_default="#ffffff"),
    )
    op.create_check_constraint(
        "ck_kiosk_inline_ad_item_border_radius_range",
        "kiosk_display_configurations",
        "inline_ad_item_border_radius_px >= 0 AND inline_ad_item_border_radius_px <= 32",
    )
    op.create_check_constraint(
        "ck_kiosk_inline_ad_item_border_width_range",
        "kiosk_display_configurations",
        "inline_ad_item_border_width_px >= 0 AND inline_ad_item_border_width_px <= 8",
    )


def downgrade() -> None:
    op.drop_constraint("ck_kiosk_inline_ad_item_border_width_range", "kiosk_display_configurations", type_="check")
    op.drop_constraint("ck_kiosk_inline_ad_item_border_radius_range", "kiosk_display_configurations", type_="check")
    op.drop_column("kiosk_display_configurations", "inline_ad_item_border_color")
    op.drop_column("kiosk_display_configurations", "inline_ad_item_border_width_px")
    op.drop_column("kiosk_display_configurations", "inline_ad_item_border_radius_px")
