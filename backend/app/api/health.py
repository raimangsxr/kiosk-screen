from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.repositories.session import get_session
from app.services.health_probe_service import evaluate_readiness

router = APIRouter(tags=["Health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", response_model=None)
def ready(
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> JSONResponse | dict[str, str]:
    result = evaluate_readiness(session, settings)
    if not result.ready:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "checks": result.checks},
        )
    return {"status": "ready"}
