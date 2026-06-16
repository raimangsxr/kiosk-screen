from pathlib import Path

import yaml


def test_admin_paths_exist_in_openapi_contract():
    contract = yaml.safe_load((Path(__file__).parents[3] / "specs/002-kiosk-screen/contracts/openapi.yaml").read_text())
    paths = contract["paths"]

    for path in ["/readiness", "/display/configuration", "/approved-domains", "/events", "/users", "/users/{userId}"]:
        assert path in paths
