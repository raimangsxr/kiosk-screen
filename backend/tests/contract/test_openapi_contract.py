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


def test_remote_control_backend_contract_documents_display_control_paths():
    contract_path = Path(__file__).parents[3] / "specs" / "006-remote-control-display" / "contracts" / "backend-contract.md"

    contract = contract_path.read_text(encoding="utf-8")

    assert "remoteControlPollingSeconds" in contract
    assert "Remote Control State Response" in contract
    assert "Remote Control Update Request" in contract
    assert "Iframe Options Response" in contract
    assert "Effective Display State Response" in contract
