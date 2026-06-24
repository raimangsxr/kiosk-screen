"""Contract test for the admin / readiness / events OpenAPI surface.

Validates that the live FastAPI app exposes the documented admin
endpoints and that the legacy ``/approved-domains`` paths are
absent (they were removed when the iframe entity replaced the
approved-domains table, see spec 006).

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


def test_admin_paths_exist_in_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    for path in [
        "/api/readiness",
        "/api/display/configuration",
        "/api/events",
        "/api/users",
        "/api/users/{user_id}",
    ]:
        assert path in paths, f"missing OpenAPI path: {path}"


def test_approved_domains_paths_removed_from_openapi_contract(openapi_schema: dict):
    paths = openapi_schema["paths"]
    assert "/approved-domains" not in paths
    assert "/approved-domains/{domainId}" not in paths
    assert "/api/approved-domains" not in paths
    assert "/api/approved-domains/{domainId}" not in paths