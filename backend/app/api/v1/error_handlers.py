from fastapi import Request
from fastapi.responses import JSONResponse

from app.shared.errors.application_errors import ApplicationError


async def application_error_handler(_: Request, exc: ApplicationError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.user_message,
            "category": exc.category,
            "details": exc.details,
        },
    )
