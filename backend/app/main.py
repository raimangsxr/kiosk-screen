from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.errors import APIError, api_error_handler
from app.api.middleware import RequestIdMiddleware
from app.api.router import api_router
from app.api.v1.error_handlers import application_error_handler
from app.config import get_settings
from app.repositories.session import create_session_factory
from app.services.bootstrap_service import ensure_mvp_bootstrap_data
from app.shared.errors.application_errors import ApplicationError


def bootstrap_default_data(app: FastAPI) -> None:
    if app.state.skip_bootstrap:
        return

    with create_session_factory()() as session:
        if ensure_mvp_bootstrap_data(session, get_settings()):
            session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    bootstrap_default_data(app)
    yield


app = FastAPI(title="Kiosk Screen API", version="0.1.0", lifespan=lifespan)
app.state.auth_sessions = {}
app.state.skip_bootstrap = False
app.add_middleware(RequestIdMiddleware)
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(ApplicationError, application_error_handler)
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
