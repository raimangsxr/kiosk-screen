from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.error_handlers import application_error_handler
from app.shared.errors.application_errors import ApplicationError


def test_application_error_response_keeps_user_message_safe_and_structured() -> None:
    app = FastAPI()
    app.add_exception_handler(ApplicationError, application_error_handler)

    @app.get("/storage-failure")
    def storage_failure() -> None:
        raise ApplicationError(
            status_code=500,
            code="storage_unavailable",
            user_message="The uploaded file could not be stored.",
            category="storage",
            diagnostic_message="Disk path /private/storage is unavailable",
        )

    response = TestClient(app).get("/storage-failure")

    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "storage_unavailable"
    assert body["message"] == "The uploaded file could not be stored."
    assert "/private/storage" not in str(body)
