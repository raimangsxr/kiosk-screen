from pathlib import Path


def test_initial_migration_exists_and_creates_expected_tables():
    migration = Path("backend/alembic/versions/0001_initial_kiosk_schema.py")
    content = migration.read_text(encoding="utf-8")

    assert "organizations" in content
    assert "top_content_items" in content
    assert "client_ad_items" in content
    assert "operator_sessions" in content

