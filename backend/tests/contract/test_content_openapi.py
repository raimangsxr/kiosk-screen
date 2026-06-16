from pathlib import Path

import yaml


def test_content_paths_exist_in_openapi_contract():
    contract = yaml.safe_load((Path(__file__).parents[3] / "specs/002-kiosk-screen/contracts/openapi.yaml").read_text())

    assert "/content" in contract["paths"]
    assert "/content/{contentId}" in contract["paths"]
    assert "ContentItemRequest" in contract["components"]["schemas"]
