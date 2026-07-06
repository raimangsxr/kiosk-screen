import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.observability.logging import log_fields
from app.shared.errors.application_errors import (
    ApplicationError,
    DuplicateEmailError,
    InternalServerApplicationError,
)


logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def application_error_handler(request: Request, exc: ApplicationError) -> JSONResponse:
    correlation_id = _request_id(request)
    content: dict[str, object] = {
        "code": exc.code,
        "message": exc.user_message,
        "category": exc.category,
        "details": exc.details,
    }
    if correlation_id:
        content["correlationId"] = correlation_id
    return JSONResponse(status_code=exc.status_code, content=content)


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    message = str(exc.orig).lower()
    if "uq_users_organization_email" in message or "users.organization_id, users.email" in message:
        return await application_error_handler(request, DuplicateEmailError())
    logger.exception(
        "Unhandled integrity error",
        extra=log_fields(request_id=_request_id(request)),
    )
    return await application_error_handler(
        request,
        InternalServerApplicationError(correlation_id=_request_id(request)),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id(request)
    logger.exception(
        "Unhandled exception",
        extra=log_fields(request_id=request_id, error_type=exc.__class__.__name__),
    )
    return await application_error_handler(request, InternalServerApplicationError(correlation_id=request_id))
