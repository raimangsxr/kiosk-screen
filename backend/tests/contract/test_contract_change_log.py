from pathlib import Path


def test_contract_change_log_covers_required_contract_types() -> None:
    path = Path(__file__).parents[3] / "specs" / "005-admin-refactor" / "contracts" / "contract-change-log.md"
    content = path.read_text(encoding="utf-8")

    for expected in ["Hall navigation", "Admin workflows", "Backend API/error envelope", "Display state", "Data migration"]:
        assert expected in content
