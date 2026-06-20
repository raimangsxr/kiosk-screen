"""event branding and event duration

Revision ID: 0011_event_branding
Revises: 0010_remote_fullscreen
Create Date: 2026-06-20
"""
from collections.abc import Sequence
import uuid

from alembic import op
import sqlalchemy as sa

revision: str = "0011_event_branding"
down_revision: str | tuple[str, ...] | None = "0010_remote_fullscreen"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _constraint_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    for ck in inspector.get_check_constraints(table_name):
        if ck.get("name") == constraint_name:
            return True
    return False


def _fk_exists(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    for fk in inspector.get_foreign_keys(table_name):
        if fk.get("name") == constraint_name:
            return True
    return False


def upgrade() -> None:
    bind = op.get_bind()

    # 1) Create event_configurations table if missing.
    if not _table_exists(bind, "event_configurations"):
        op.create_table(
            "event_configurations",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("organization_id", sa.String(length=36), nullable=False),
            sa.Column("event_name", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("organizer_name", sa.String(length=255), nullable=False, server_default=""),
            sa.Column("organizer_logo_media_id", sa.String(length=36), nullable=True),
            sa.Column("event_duration_minutes", sa.Integer(), nullable=False, server_default="240"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
            sa.Column("updated_by_user_id", sa.String(length=36), nullable=True),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(
                ["organization_id"],
                ["organizations.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["organizer_logo_media_id"],
                ["media_file_references.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", name="uq_event_configurations_organization_id"),
        )
        op.create_index(
            "ix_event_configurations_organization_id",
            "event_configurations",
            ["organization_id"],
        )

    # 2) Add check constraints if missing.
    if not _constraint_exists(bind, "event_configurations", "ck_event_duration_minutes_positive"):
        op.create_check_constraint(
            "ck_event_duration_minutes_positive",
            "event_configurations",
            "event_duration_minutes > 0",
        )
    if not _constraint_exists(bind, "event_configurations", "ck_event_duration_minutes_max"):
        op.create_check_constraint(
            "ck_event_duration_minutes_max",
            "event_configurations",
            "event_duration_minutes <= 1440",
        )

    # 3) Backfill from kiosk_display_configurations (only if it still has the column).
    if _column_exists(bind, "kiosk_display_configurations", "configured_event_duration_minutes"):
        bind.execute(
            sa.text(
                "INSERT INTO event_configurations ("
                "  id, organization_id, event_name, organizer_name,"
                "  organizer_logo_media_id, event_duration_minutes,"
                "  created_at, updated_at, created_by_user_id, updated_by_user_id"
                ") SELECT "
                "  :id, kdc.organization_id, '', '', NULL,"
                "  kdc.configured_event_duration_minutes,"
                "  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL "
                "FROM kiosk_display_configurations kdc "
                "ON CONFLICT (organization_id) DO NOTHING"
            ),
            {"id": uuid.uuid4().hex},
        )

    # 4) Backfill any orgs that have no kiosk_display_configurations row but do exist.
    # Use a row generator so ON CONFLICT still applies.
    bind.execute(
        sa.text(
            "INSERT INTO event_configurations ("
            "  id, organization_id, event_name, organizer_name,"
            "  organizer_logo_media_id, event_duration_minutes,"
            "  created_at, updated_at, created_by_user_id, updated_by_user_id"
            ") SELECT "
            "  :id, o.id, '', '', NULL, 240,"
            "  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL "
            "FROM organizations o "
            "WHERE NOT EXISTS ("
            "  SELECT 1 FROM event_configurations ec WHERE ec.organization_id = o.id"
            ") "
            "ON CONFLICT (organization_id) DO NOTHING"
        ),
        {"id": uuid.uuid4().hex},
    )

    # 5) Drop the old column and its check constraint from kiosk_display_configurations.
    if _constraint_exists(bind, "kiosk_display_configurations", "ck_kiosk_event_duration_positive"):
        op.drop_constraint(
            "ck_kiosk_event_duration_positive",
            "kiosk_display_configurations",
            type_="check",
        )
    if _column_exists(bind, "kiosk_display_configurations", "configured_event_duration_minutes"):
        op.drop_column("kiosk_display_configurations", "configured_event_duration_minutes")


def downgrade() -> None:
    bind = op.get_bind()

    # Restore the old column + check constraint if not present.
    if not _column_exists(bind, "kiosk_display_configurations", "configured_event_duration_minutes"):
        op.add_column(
            "kiosk_display_configurations",
            sa.Column(
                "configured_event_duration_minutes",
                sa.Integer(),
                nullable=False,
                server_default="240",
            ),
        )
    if not _constraint_exists(bind, "kiosk_display_configurations", "ck_kiosk_event_duration_positive"):
        op.create_check_constraint(
            "ck_kiosk_event_duration_positive",
            "kiosk_display_configurations",
            "configured_event_duration_minutes > 0",
        )

    # Note: per spec §Assumption, downgrade does NOT migrate data values back.
