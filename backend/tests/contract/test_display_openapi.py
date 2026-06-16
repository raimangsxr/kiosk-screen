from pathlib import Path

import yaml


def test_auth_and_display_paths_exist_in_openapi_contract():
    contract_path = Path(__file__).parents[3] / "specs" / "002-kiosk-screen" / "contracts" / "openapi.yaml"
    contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))

    paths = contract["paths"]
    assert "/auth/login" in paths
    assert "/auth/me" in paths
    assert "/auth/logout" in paths
    assert "/display/open" in paths
    assert "/display/state" in paths
