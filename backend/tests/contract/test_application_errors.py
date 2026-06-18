from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.error_handlers import application_error_handler
from app.shared.errors.application_errors import ApplicationError


def test_application_error_handler_returns_safe_error_envelope() -> None:
    app = FastAPI()
    app.add_exception_handler(ApplicationError, application_error_handler)

    @app.get("/boom")
    def boom() -> None:
        raise ApplicationError(
            status_code=409,
            code="conflict_active_dependency",
            user_message="The record cannot be deleted while it is in use.",
            category="dependency",
            diagnostic_message="internal model path should not leak",
            details={"record_id": "123"},
        )

    response = TestClient(app).get("/boom")

    assert response.status_code == 409
    assert response.json() == {
        "code": "conflict_active_dependency",
        "message": "The record cannot be deleted while it is in use.",
        "category": "dependency",
        "details": {"record_id": "123"},
    }
