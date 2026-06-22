"""content rotation modes: recurring, fixed, autodetect

Revision ID: 0012_content_rotation_modes
Revises: 0011_event_branding
Create Date: 2026-06-22
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0012_content_rotation_modes"
down_revision: str | tuple[str, ...] | None = "0011_event_branding"
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


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return index_name in {idx["name"] for idx in inspector.get_indexes(table_name)}


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

    # 1) top_content_items: recurring_every_x_iterations
    if _table_exists(bind, "top_content_items") and not _column_exists(
        bind, "top_content_items", "recurring_every_x_iterations"
    ):
        op.add_column(
            "top_content_items",
            sa.Column("recurring_every_x_iterations", sa.Integer(), nullable=True),
        )

    # 2) top_content_items: is_fixed
    if _table_exists(bind, "top_content_items") and not _column_exists(
        bind, "top_content_items", "is_fixed"
    ):
        op.add_column(
            "top_content_items",
            sa.Column(
                "is_fixed",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    # 3) Check constraints on top_content_items
    if _table_exists(bind, "top_content_items"):
        if not _constraint_exists(bind, "top_content_items", "ck_top_content_recurring_positive"):
            op.create_check_constraint(
                "ck_top_content_recurring_positive",
                "top_content_items",
                "recurring_every_x_iterations IS NULL OR recurring_every_x_iterations >= 1",
            )
        if not _constraint_exists(bind, "top_content_items", "ck_top_content_not_fixed_and_recurring"):
            op.create_check_constraint(
                "ck_top_content_not_fixed_and_recurring",
                "top_content_items",
                "NOT (is_fixed AND recurring_every_x_iterations IS NOT NULL)",
            )

    # 4) Partial index on is_fixed
    if _table_exists(bind, "top_content_items") and not _index_exists(
        bind, "top_content_items", "ix_top_content_items_is_fixed"
    ):
        op.create_index(
            "ix_top_content_items_is_fixed",
            "top_content_items",
            ["is_fixed"],
            unique=False,
            postgresql_where=sa.text("is_fixed = true"),
        )

    # 5) display_control_states: selected_fixed_content_id
    if _table_exists(bind, "display_control_states") and not _column_exists(
        bind, "display_control_states", "selected_fixed_content_id"
    ):
        op.add_column(
            "display_control_states",
            sa.Column("selected_fixed_content_id", sa.String(length=36), nullable=True),
        )
        op.create_foreign_key(
            "fk_display_control_states_selected_fixed_content_id",
            "display_control_states",
            "top_content_items",
            ["selected_fixed_content_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # 6) Widen content_mode CHECK to include 'fixed'
    if _table_exists(bind, "display_control_states") and _constraint_exists(
        bind, "display_control_states", "ck_display_control_content_mode"
    ):
        op.drop_constraint(
            "ck_display_control_content_mode",
            "display_control_states",
            type_="check",
        )
    if _table_exists(bind, "display_control_states") and not _constraint_exists(
        bind, "display_control_states", "ck_display_control_content_mode"
    ):
        op.create_check_constraint(
            "ck_display_control_content_mode",
            "display_control_states",
            "content_mode IN ('loop', 'iframe', 'fixed')",
        )

    # 7) New CHECK: fixed mode requires a target
    if _table_exists(bind, "display_control_states") and not _constraint_exists(
        bind, "display_control_states", "ck_display_control_fixed_has_target"
    ):
        op.create_check_constraint(
            "ck_display_control_fixed_has_target",
            "display_control_states",
            "selected_fixed_content_id IS NOT NULL OR content_mode != 'fixed'",
        )


def downgrade() -> None:
    bind = op.get_bind()

    # Reverse order: drop checks, drop FK/column, drop top_content_items checks/columns.
    if _constraint_exists(bind, "display_control_states", "ck_display_control_fixed_has_target"):
        op.drop_constraint(
            "ck_display_control_fixed_has_target",
            "display_control_states",
            type_="check",
        )

    if _constraint_exists(bind, "display_control_states", "ck_display_control_content_mode"):
        op.drop_constraint(
            "ck_display_control_content_mode",
            "display_control_states",
            type_="check",
        )
    op.create_check_constraint(
        "ck_display_control_content_mode",
        "display_control_states",
        "content_mode IN ('loop', 'iframe')",
    )

    if _fk_exists(
        bind, "display_control_states", "fk_display_control_states_selected_fixed_content_id"
    ):
        op.drop_constraint(
            "fk_display_control_states_selected_fixed_content_id",
            "display_control_states",
            type_="foreignkey",
        )
    if _column_exists(bind, "display_control_states", "selected_fixed_content_id"):
        op.drop_column("display_control_states", "selected_fixed_content_id")

    if _index_exists(bind, "top_content_items", "ix_top_content_items_is_fixed"):
        op.drop_index("ix_top_content_items_is_fixed", table_name="top_content_items")

    if _constraint_exists(bind, "top_content_items", "ck_top_content_not_fixed_and_recurring"):
        op.drop_constraint(
            "ck_top_content_not_fixed_and_recurring",
            "top_content_items",
            type_="check",
        )
    if _constraint_exists(bind, "top_content_items", "ck_top_content_recurring_positive"):
        op.drop_constraint(
            "ck_top_content_recurring_positive",
            "top_content_items",
            type_="check",
        )
    if _column_exists(bind, "top_content_items", "is_fixed"):
        op.drop_column("top_content_items", "is_fixed")
    if _column_exists(bind, "top_content_items", "recurring_every_x_iterations"):
        op.drop_column("top_content_items", "recurring_every_x_iterations")