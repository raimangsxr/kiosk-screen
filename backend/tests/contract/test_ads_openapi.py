"""Contract test for the ads OpenAPI surface (spec 009 US3).

Validates that the live FastAPI app exposes the documented
``/ads`` paths and that the legacy ``/clients`` paths are
absent (the ``Client`` entity was hard-deleted, see spec 009's
``## Supersedes`` block and migration ``0007``).

Detailed request/response shape validation is left to the
integration tests.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def openapi_schema(api_client: TestClient) -> dict:
    """Return the OpenAPI document for the test app."""
    response = api_client.get("/openapi.json")
    assert response.status_code == 200
    return response.json()


def test_ads_paths_exist_in_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    assert "/api/ads" in paths
    assert "/api/ads/{ad_id}" in paths
    assert "/api/ads/upload" in paths
    assert "/api/ads/reorder" in paths
    assert "AdItemRequest" in openapi_schema["components"]["schemas"]


def test_clients_paths_removed_from_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    assert "/clients" not in paths
    assert "/clients/{clientId}" not in paths
    assert "/api/clients" not in paths
    assert "/api/clients/{clientId}" not in paths