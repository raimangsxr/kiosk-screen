"""mark remote_control_polling_seconds deprecated (SSE orchestrator)

Revision ID: 0020_deprecate_polling
Revises: 0019_inline_ad_item_border
Create Date: 2026-07-08
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0020_deprecate_polling"
down_revision: str | None = "0019_inline_ad_item_border"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        COMMENT ON COLUMN kiosk_display_configurations.remote_control_polling_seconds IS
        'DEPRECATED (CHG-041): retained for SSE-down polling fallback interval only; orchestrator drives rotation.'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        COMMENT ON COLUMN kiosk_display_configurations.remote_control_polling_seconds IS NULL
        """
    )
