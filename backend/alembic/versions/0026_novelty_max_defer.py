"""kiosk novelty max defer transitions

Revision ID: 0026_novelty_max_defer
Revises: 0025_iframe_preventive_reload
Create Date: 2026-08-07
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0026_novelty_max_defer"
down_revision: str | None = "0025_iframe_preventive_reload"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "kiosk_display_configurations",
        sa.Column(
            "novelty_max_defer_transitions",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )
    op.create_check_constraint(
        "ck_kiosk_novelty_max_defer_range",
        "kiosk_display_configurations",
        "novelty_max_defer_transitions >= 1 AND novelty_max_defer_transitions <= 10",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_kiosk_novelty_max_defer_range",
        "kiosk_display_configurations",
        type_="check",
    )
    op.drop_column("kiosk_display_configurations", "novelty_max_defer_transitions")
