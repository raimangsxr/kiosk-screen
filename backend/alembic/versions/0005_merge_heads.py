"""merge api_keys and remote_control heads

Revision ID: 0005_merge_heads
Revises: 0004_display_control_state, 0003_api_keys
Create Date: 2026-06-19

Resolves the multiple-head situation created when 0003_api_keys (spec
009-public-content-api) and 0003_remote_control_polling both pointed at
0002_admin_media_uploads. No schema change: this revision is a no-op that
unifies the two lineages into a single linear history so that
``alembic upgrade head`` is unambiguous in fresh and seeded databases.
"""
from collections.abc import Sequence

revision: str = "0005_merge_heads"
down_revision: str | tuple[str, ...] | None = (
    "0004_display_control_state",
    "0003_api_keys",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
