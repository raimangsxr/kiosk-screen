"""add api_keys table

Revision ID: 0003_api_keys
Revises: 0002_admin_media_uploads
Create Date: 2026-06-18

Adds the api_keys table for the public content upload API (spec 009).
See specs/009-public-content-api/data-model.md for the schema rationale.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0003_api_keys"
down_revision: str | None = "0002_admin_media_uploads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "api_keys",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("key_prefix", sa.String(length=16), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "key_hash ~ '^[0-9a-f]{64}$'",
            name="ck_api_keys_key_hash_format",
        ),
        sa.CheckConstraint(
            "key_prefix ~ '^ksk_live_[A-Za-z0-9_-]{8}$'",
            name="ck_api_keys_key_prefix_format",
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_prefix", name="uq_api_keys_key_prefix"),
    )
    op.create_index(
        "ix_api_keys_organization_id",
        "api_keys",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_api_keys_organization_id", table_name="api_keys")
    op.drop_table("api_keys")
