"""admin media uploads

Revision ID: 0002_admin_media_uploads
Revises: 0001_initial_kiosk_schema
Create Date: 2026-06-17
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_admin_media_uploads"
down_revision: str | None = "0001_initial_kiosk_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_file_references",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("public_reference", sa.String(length=1024), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("media_type", sa.String(length=16), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_reference")
    )
    op.add_column("top_content_items", sa.Column("media_file_id", sa.String(), nullable=True))
    op.add_column("top_content_items", sa.Column("rotation_animation", sa.String(length=16), nullable=True))
    op.add_column("top_content_items", sa.Column("animation_duration_milliseconds", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_top_content_media_file", "top_content_items", "media_file_references", ["media_file_id"], ["id"])
    op.create_check_constraint(
        "ck_top_content_animation_duration_positive",
        "top_content_items",
        "animation_duration_milliseconds IS NULL OR animation_duration_milliseconds > 0"
    )

    op.add_column("client_ad_items", sa.Column("media_file_id", sa.String(), nullable=True))
    op.add_column("client_ad_items", sa.Column("rotation_animation", sa.String(length=16), nullable=True))
    op.add_column("client_ad_items", sa.Column("animation_duration_milliseconds", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_client_ads_media_file", "client_ad_items", "media_file_references", ["media_file_id"], ["id"])
    op.create_check_constraint(
        "ck_client_ads_animation_duration_positive",
        "client_ad_items",
        "animation_duration_milliseconds IS NULL OR animation_duration_milliseconds > 0"
    )

    op.add_column("kiosk_display_configurations", sa.Column("default_top_rotation_animation", sa.String(length=16), nullable=False, server_default="none"))
    op.add_column("kiosk_display_configurations", sa.Column("default_ad_rotation_animation", sa.String(length=16), nullable=False, server_default="none"))
    op.add_column("kiosk_display_configurations", sa.Column("default_top_animation_duration_milliseconds", sa.Integer(), nullable=False, server_default="300"))
    op.add_column("kiosk_display_configurations", sa.Column("default_ad_animation_duration_milliseconds", sa.Integer(), nullable=False, server_default="300"))
    op.add_column("kiosk_display_configurations", sa.Column("inline_ad_count", sa.Integer(), nullable=False, server_default="1"))
    op.create_check_constraint(
        "ck_kiosk_top_animation_duration_positive",
        "kiosk_display_configurations",
        "default_top_animation_duration_milliseconds > 0"
    )
    op.create_check_constraint(
        "ck_kiosk_ad_animation_duration_positive",
        "kiosk_display_configurations",
        "default_ad_animation_duration_milliseconds > 0"
    )
    op.create_check_constraint("ck_kiosk_inline_ad_count_positive", "kiosk_display_configurations", "inline_ad_count > 0")


def downgrade() -> None:
    op.drop_constraint("ck_kiosk_inline_ad_count_positive", "kiosk_display_configurations", type_="check")
    op.drop_constraint("ck_kiosk_ad_animation_duration_positive", "kiosk_display_configurations", type_="check")
    op.drop_constraint("ck_kiosk_top_animation_duration_positive", "kiosk_display_configurations", type_="check")
    op.drop_column("kiosk_display_configurations", "inline_ad_count")
    op.drop_column("kiosk_display_configurations", "default_ad_animation_duration_milliseconds")
    op.drop_column("kiosk_display_configurations", "default_top_animation_duration_milliseconds")
    op.drop_column("kiosk_display_configurations", "default_ad_rotation_animation")
    op.drop_column("kiosk_display_configurations", "default_top_rotation_animation")
    op.drop_constraint("ck_client_ads_animation_duration_positive", "client_ad_items", type_="check")
    op.drop_constraint("fk_client_ads_media_file", "client_ad_items", type_="foreignkey")
    op.drop_column("client_ad_items", "animation_duration_milliseconds")
    op.drop_column("client_ad_items", "rotation_animation")
    op.drop_column("client_ad_items", "media_file_id")
    op.drop_constraint("ck_top_content_animation_duration_positive", "top_content_items", type_="check")
    op.drop_constraint("fk_top_content_media_file", "top_content_items", type_="foreignkey")
    op.drop_column("top_content_items", "animation_duration_milliseconds")
    op.drop_column("top_content_items", "rotation_animation")
    op.drop_column("top_content_items", "media_file_id")
    op.drop_table("media_file_references")
