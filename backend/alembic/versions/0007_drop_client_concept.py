"""drop client concept (clients table, client_ad_items.client_id) and add advertiser

Revision ID: 0007_drop_client_concept
Revises: 0006_drop_client_ad_items_label
Create Date: 2026-06-19

Removes the Client entity per spec 014-drop-client. The migration
runs in this order:

1. Add the new ``advertiser`` column to ``client_ad_items``
   (``String(120)``, nullable).
2. Backfill ``advertiser`` from the joined ``clients.name`` for
   every existing row. Rows whose client has been deleted or
   whose client is missing for any reason are backfilled with
   ``NULL``.
3. Drop the foreign-key constraint and the ``client_id`` column
   on ``client_ad_items``.
4. Drop the ``clients`` table.

The migration is reversible for test environments: the downgrade
recreates the ``clients`` table from the distinct advertiser
values and re-adds the ``client_id`` FK on ``client_ad_items``.
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0007_drop_client_concept"
down_revision: str | tuple[str, ...] | None = "0006_drop_client_ad_items_label"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _clients_table_exists(bind) -> bool:
    inspector = sa.inspect(bind)
    return "clients" in inspector.get_table_names()


def _client_id_column_exists(bind) -> bool:
    inspector = sa.inspect(bind)
    if "client_ad_items" not in inspector.get_table_names():
        return False
    columns = {column["name"] for column in inspector.get_columns("client_ad_items")}
    return "client_id" in columns


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column(
        "client_ad_items",
        sa.Column("advertiser", sa.String(length=120), nullable=True),
    )

    if _clients_table_exists(bind) and _client_id_column_exists(bind):
        op.execute(
            """
            UPDATE client_ad_items AS ad
            SET advertiser = client.name
            FROM clients AS client
            WHERE ad.client_id = client.id
            """
        )

        op.drop_constraint(
            "client_ad_items_client_id_fkey", "client_ad_items", type_="foreignkey"
        )
        op.drop_column("client_ad_items", "client_id")

    if _clients_table_exists(bind):
        op.drop_table("clients")


def downgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column(
        "client_ad_items",
        sa.Column("client_id", sa.String(), nullable=True),
    )
    op.execute(
        """
        INSERT INTO clients (id, organization_id, name, is_active, created_at, updated_at)
        SELECT
            lower(replace(ad.advertiser, ' ', '-')) || '-' || row_number() OVER () AS id,
            ad.organization_id,
            ad.advertiser,
            true,
            now(),
            now()
        FROM (SELECT DISTINCT organization_id, advertiser FROM client_ad_items WHERE advertiser IS NOT NULL) AS ad
        WHERE ad.advertiser IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE client_ad_items AS ad
        SET client_id = lower(replace(ad.advertiser, ' ', '-')) || '-' || (
            SELECT row_number() OVER (PARTITION BY ad.organization_id, ad.advertiser ORDER BY ad.id)
            FROM client_ad_items sub
            WHERE sub.organization_id = ad.organization_id
              AND sub.advertiser = ad.advertiser
              AND sub.id = ad.id
            LIMIT 1
        )
        WHERE ad.advertiser IS NOT NULL
        """
    )
    op.alter_column("client_ad_items", "client_id", nullable=False)
    op.create_foreign_key(
        "client_ad_items_client_id_fkey",
        "client_ad_items",
        "clients",
        ["client_id"],
        ["id"],
    )

    op.drop_column("client_ad_items", "advertiser")
