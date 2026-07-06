from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.api.errors import APIError, api_error_handler
from app.api.middleware import RequestIdMiddleware
from app.api.router import api_router
from app.api.v1.error_handlers import (
    application_error_handler,
    integrity_error_handler,
    unhandled_exception_handler,
)
from app.api.v1.public_content.routes import router as public_content_router
from app.config import get_settings, validate_production_settings
from app.observability.logging import configure_logging
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
    configure_logging()
    validate_production_settings(get_settings())
    bootstrap_default_data(app)
    yield


def _register_exception_handlers(target: FastAPI) -> None:
    target.add_exception_handler(APIError, api_error_handler)
    target.add_exception_handler(ApplicationError, application_error_handler)
    target.add_exception_handler(IntegrityError, integrity_error_handler)
    target.add_exception_handler(Exception, unhandled_exception_handler)


settings = get_settings()

# A dedicated sub-app carries CORS only for the public content router (FR-017A).
# The rest of the API is unaffected by the CORS middleware. Default allowlist is
# empty (no cross-origin browser access). When PUBLIC_API_CORS_ORIGINS is set,
# browser-based callers can opt-in by adding their origin to the env var.
public_app = FastAPI(title="Kiosk Screen Public API", version="0.1.0", lifespan=lifespan)
public_app.state.skip_bootstrap = True
public_app.add_middleware(RequestIdMiddleware)
_register_exception_handlers(public_app)
if settings.public_api_cors_origins:
    public_app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.public_api_cors_origins),
        allow_methods=["POST"],
        allow_headers=["Authorization", "Content-Type"],
        allow_credentials=False,
        max_age=600,
    )
public_app.include_router(public_content_router)


class _MainAppBuilder:
    """Defer building the main app until first access; this keeps ``public_app`` and
    the final ``app`` sharing the same dependency-overrides dict so test fixtures
    that override ``get_session`` apply to both the main app and the public sub-app.
    """

    def __init__(self) -> None:
        self._main: FastAPI | None = None

    def __call__(self) -> FastAPI:
        if self._main is not None:
            return self._main
        main = FastAPI(title="Kiosk Screen API", version="0.1.0", lifespan=lifespan)
        main.state.skip_bootstrap = False
        main.add_middleware(RequestIdMiddleware)
        _register_exception_handlers(main)
        main.mount("/api/public", public_app)
        # Share the SAME dict instance between sub-app and main app so test fixtures
        # mutating it (e.g. ``app.dependency_overrides[get_session] = ...``) are
        # visible to both.
        public_app.dependency_overrides = main.dependency_overrides
        main.include_router(api_router, prefix="/api")
        self._main = main
        return main


_builder = _MainAppBuilder()


def _resolve_app() -> FastAPI:
    return _builder()


class _AppProxy:
    """ASGI proxy that defers building the main app until first access.

    Tests (and runtime code) access attributes like ``app.dependency_overrides``;
    the proxy ensures that any such access triggers the build and returns the
    attribute of the final, fully-mounted main app.
    """

    def __getattr__(self, item):
        return getattr(_resolve_app(), item)

    async def __call__(self, scope, receive, send):
        return await _resolve_app()(scope, receive, send)


app = _AppProxy()  # type: ignore[assignment]