from pathlib import Path


def test_planning_openapi_contract_exists_with_expected_groups():
    contract_path = Path(__file__).parents[3] / "specs" / "002-kiosk-screen" / "contracts" / "openapi.yaml"

    contract = contract_path.read_text(encoding="utf-8")

    assert "openapi: 3.1.0" in contract
    assert "/auth/login:" in contract
    assert "/display/state:" in contract
    assert "/content:" in contract
    assert "/ads:" in contract
    assert "/users:" in contract

