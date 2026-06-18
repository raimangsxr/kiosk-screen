from pathlib import Path


def test_migration_validation_documents_required_decision_paths() -> None:
    path = Path(__file__).parents[3] / "specs" / "005-admin-refactor" / "validation" / "migration-validation.md"
    content = path.read_text(encoding="utf-8")

    assert "Path A" in content
    assert "Path B" in content
    assert "T108" in content
