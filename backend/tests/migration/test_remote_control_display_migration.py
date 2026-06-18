from pathlib import Path


def test_remote_control_polling_migration_adds_default_and_constraint() -> None:
    versions_dir = Path("backend/alembic/versions")
    migration_files = list(versions_dir.glob("*remote_control*.py"))

    assert migration_files, "remote control display migration is required"
    content = "\n".join(path.read_text(encoding="utf-8") for path in migration_files)

    assert "remote_control_polling_seconds" in content
    assert "server_default=\"3\"" in content or "server_default='3'" in content
    assert "remote_control_polling_seconds >= 1" in content
    assert "remote_control_polling_seconds <= 60" in content
