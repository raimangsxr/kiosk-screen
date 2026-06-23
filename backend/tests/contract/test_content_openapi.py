"""Contract test for the content OpenAPI surface (spec 009 US1).

Validates that the live FastAPI app exposes the documented
``/content`` paths and that ``ContentItemRequest`` is in the
schema catalog. Detailed request/response shape validation is
left to the integration tests.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def openapi_schema(api_client: TestClient) -> dict:
    """Return the OpenAPI document for the test app."""
    response = api_client.get("/openapi.json")
    assert response.status_code == 200
    return response.json()


def test_content_paths_exist_in_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    assert "/content" in paths
    assert "/content/{content_id}" in paths
    assert "/content/upload" in paths
    assert "/content/reorder" in paths
    assert "ContentItemRequest" in openapi_schema["components"]["schemas"]