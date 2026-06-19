"""remote control polling interval

Revision ID: 0003_remote_control_polling
Revises: 0002_admin_media_uploads
Create Date: 2026-06-18
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_remote_control_polling"
down_revision: str | None = "0002_admin_media_uploads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "kiosk_display_configurations",
        sa.Column("remote_control_polling_seconds", sa.Integer(), nullable=False, server_default="3"),
    )
    op.create_check_constraint(
        "ck_kiosk_remote_control_polling_range",
        "kiosk_display_configurations",
        "remote_control_polling_seconds >= 1 AND remote_control_polling_seconds <= 60",
    )


def downgrade() -> None:
    op.drop_constraint("ck_kiosk_remote_control_polling_range", "kiosk_display_configurations", type_="check")
    op.drop_column("kiosk_display_configurations", "remote_control_polling_seconds")
