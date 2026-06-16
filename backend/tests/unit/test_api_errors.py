import asyncio
from starlette.requests import Request

from app.api.errors import APIError, api_error_handler


def test_api_error_handler_returns_contract_shape():
    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    response = asyncio.run(
        api_error_handler(request, APIError(400, "bad_request", "Bad request", {"field": "x"}))
    )

    assert response.status_code == 400
    assert b"bad_request" in response.body
