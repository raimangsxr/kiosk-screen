"""add is_novelty to top_content_items

Revision ID: 0017_content_is_novelty
Revises: 0016_event_branding_layout
Create Date: 2026-07-03

Public API uploads mark new items as novelty so kiosks can intercept
loop rotation. Defaults to false for existing rows.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0017_content_is_novelty"
down_revision: str | None = "0016_event_branding_layout"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "top_content_items",
        sa.Column("is_novelty", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("top_content_items", "is_novelty")
