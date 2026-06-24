"""Contract test for the auth / display OpenAPI surface.

Validates that the live FastAPI app exposes the documented
``/auth/{login,logout,me}`` and ``/display/{open,state}`` paths.
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


def test_auth_and_display_paths_exist_in_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    assert "/api/auth/login" in paths
    assert "/api/auth/me" in paths
    assert "/api/auth/logout" in paths
    assert "/api/display/open" in paths
    assert "/api/display/state" in paths