from dataclasses import dataclass
from pathlib import Path
import tempfile

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import Settings


@dataclass(frozen=True, slots=True)
class ReadinessProbeResult:
    ready: bool
    checks: dict[str, str]


def probe_database(session: Session) -> str:
    session.execute(text("SELECT 1"))
    return "ok"


def probe_media_storage(settings: Settings) -> str:
    media_root = Path(settings.media_storage_path)
    media_root.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        prefix=".ready-",
        suffix=".tmp",
        dir=media_root,
        delete=True,
    ) as handle:
        handle.write("ok")
        handle.flush()
    return "ok"


def evaluate_readiness(session: Session, settings: Settings) -> ReadinessProbeResult:
    checks: dict[str, str] = {}
    ready = True

    try:
        checks["database"] = probe_database(session)
    except Exception as exc:  # noqa: BLE001 — probe boundary
        checks["database"] = f"error: {exc.__class__.__name__}"
        ready = False

    try:
        checks["media_storage"] = probe_media_storage(settings)
    except Exception as exc:  # noqa: BLE001 — probe boundary
        checks["media_storage"] = f"error: {exc.__class__.__name__}"
        ready = False

    return ReadinessProbeResult(ready=ready, checks=checks)
