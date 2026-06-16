from fastapi import FastAPI

from app.api.errors import APIError, api_error_handler
from app.api.middleware import RequestIdMiddleware
from app.api.router import api_router

app = FastAPI(title="Kiosk Screen API", version="0.1.0")
app.state.auth_sessions = {}
app.add_middleware(RequestIdMiddleware)
app.add_exception_handler(APIError, api_error_handler)
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
