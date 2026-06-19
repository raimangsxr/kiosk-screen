"""drop client_ad_items.label

Revision ID: 0006_drop_client_ad_items_label
Revises: 0005_merge_heads
Create Date: 2026-06-19

Removes the redundant ``label`` column from ``client_ad_items`` per
spec 013-drop-label-display-order-drag-drop US1. The ``ClientAdItem``
model no longer references this column, so the database is brought
back in sync. Existing data is discarded; the user explicitly
requested a hard drop of the field.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0006_drop_client_ad_items_label"
down_revision: str | tuple[str, ...] | None = "0005_merge_heads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("client_ad_items")}
    if "label" in columns:
        op.drop_column("client_ad_items", "label")


def downgrade() -> None:
    op.add_column(
        "client_ad_items",
        sa.Column("label", sa.String(length=255), nullable=False, server_default=""),
    )
    op.alter_column("client_ad_items", "label", server_default=None)
