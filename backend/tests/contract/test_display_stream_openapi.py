"""Contract test for display stream OpenAPI paths (CHG-041)."""

from fastapi.testclient import TestClient
import pytest


@pytest.fixture
def openapi_schema(api_client: TestClient) -> dict:
    response = api_client.get("/openapi.json")
    assert response.status_code == 200
    return response.json()


def test_display_stream_paths_exist_in_openapi_contract(openapi_schema: dict) -> None:
    paths = openapi_schema["paths"]
    assert "/api/display/kiosk/register" in paths
    assert "/api/display/stream" in paths
