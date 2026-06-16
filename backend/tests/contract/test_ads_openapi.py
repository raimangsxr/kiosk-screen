from pathlib import Path

import yaml


def test_ads_paths_exist_in_openapi_contract():
    contract = yaml.safe_load((Path(__file__).parents[3] / "specs/002-kiosk-screen/contracts/openapi.yaml").read_text())

    assert "/clients" in contract["paths"]
    assert "/ads" in contract["paths"]
    assert "/ads/{adId}" in contract["paths"]
    assert "AdItemRequest" in contract["components"]["schemas"]
