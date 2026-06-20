"""preconfigured iframes and video end delay

Revision ID: 0008_preconfigured_iframes_and_video_end
Revises: 0007_drop_client_concept
Create Date: 2026-06-20
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0008_preconfigured_iframes_and_video_end"
down_revision: str | tuple[str, ...] | None = "0007_drop_client_concept"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _fk_names(bind, table_name: str, column_name: str) -> list[str]:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return []
    return [
        fk["name"]
        for fk in inspector.get_foreign_keys(table_name)
        if column_name in fk.get("constrained_columns", []) and fk.get("name")
    ]


def upgrade() -> None:
    bind = op.get_bind()

    op.execute("DELETE FROM top_content_items WHERE content_type = 'embedded_web'")
    op.drop_table("approved_embedded_domains", if_exists=True)

    op.create_table(
        "iframes",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("created_by_user_id", sa.String(), nullable=True),
        sa.Column("updated_by_user_id", sa.String(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "url", name="uq_iframes_organization_id_url"),
    )
    op.create_index("ix_iframes_organization_id", "iframes", ["organization_id"])

    if _column_exists(bind, "display_control_states", "selected_content_id"):
        for fk_name in _fk_names(bind, "display_control_states", "selected_content_id"):
            op.drop_constraint(fk_name, "display_control_states", type_="foreignkey")
        op.drop_column("display_control_states", "selected_content_id")
    if not _column_exists(bind, "display_control_states", "selected_iframe_id"):
        op.add_column("display_control_states", sa.Column("selected_iframe_id", sa.String(length=36), nullable=True))
        op.create_foreign_key(
            "fk_display_control_states_selected_iframe_id_iframes",
            "display_control_states",
            "iframes",
            ["selected_iframe_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if not _column_exists(bind, "kiosk_display_configurations", "video_end_delay_seconds"):
        op.add_column(
            "kiosk_display_configurations",
            sa.Column("video_end_delay_seconds", sa.Integer(), nullable=False, server_default="2"),
        )
        op.create_check_constraint(
            "ck_kiosk_video_end_delay_range",
            "kiosk_display_configurations",
            "video_end_delay_seconds >= 0 AND video_end_delay_seconds <= 30",
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _column_exists(bind, "kiosk_display_configurations", "video_end_delay_seconds"):
        op.drop_constraint("ck_kiosk_video_end_delay_range", "kiosk_display_configurations", type_="check")
        op.drop_column("kiosk_display_configurations", "video_end_delay_seconds")

    if _column_exists(bind, "display_control_states", "selected_iframe_id"):
        for fk_name in _fk_names(bind, "display_control_states", "selected_iframe_id"):
            op.drop_constraint(fk_name, "display_control_states", type_="foreignkey")
        op.drop_column("display_control_states", "selected_iframe_id")
    if not _column_exists(bind, "display_control_states", "selected_content_id"):
        op.add_column("display_control_states", sa.Column("selected_content_id", sa.String(), nullable=True))
        op.create_foreign_key(
            "display_control_states_selected_content_id_fkey",
            "display_control_states",
            "top_content_items",
            ["selected_content_id"],
            ["id"],
        )

    op.drop_index("ix_iframes_organization_id", table_name="iframes")
    op.drop_table("iframes")

    op.create_table(
        "approved_embedded_domains",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("approved_by_user_id", sa.String(), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "domain", name="uq_approved_domains_organization_domain"),
    )
