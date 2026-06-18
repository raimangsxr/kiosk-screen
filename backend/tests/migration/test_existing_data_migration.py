from pathlib import Path


def test_refactor_migration_validation_artifact_exists() -> None:
    validation_path = Path(__file__).parents[3] / "specs" / "005-admin-refactor" / "validation" / "migration-validation.md"
    assert validation_path.exists()
