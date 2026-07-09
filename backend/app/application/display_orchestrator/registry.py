from __future__ import annotations

import threading
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.application.display_orchestrator.service import DisplayOrchestrator


class OrchestratorRegistry:
    _lock = threading.RLock()
    _instances: dict[tuple[str, str], DisplayOrchestrator] = {}
    _session_factory: Callable[[], Session] | None = None

    @classmethod
    def configure(cls, session_factory: Callable[[], Session]) -> None:
        cls._session_factory = session_factory

    @classmethod
    def get_or_create(cls, organization_id: str, operator_session_id: str) -> DisplayOrchestrator:
        if cls._session_factory is None:
            raise RuntimeError("OrchestratorRegistry is not configured")
        key = (organization_id, operator_session_id)
        with cls._lock:
            orchestrator = cls._instances.get(key)
            if orchestrator is None:
                orchestrator = DisplayOrchestrator(
                    organization_id=organization_id,
                    operator_session_id=operator_session_id,
                    session_factory=cls._session_factory,
                )
                cls._instances[key] = orchestrator
            return orchestrator

    @classmethod
    def get(cls, organization_id: str, operator_session_id: str) -> DisplayOrchestrator | None:
        return cls._instances.get((organization_id, operator_session_id))

    @classmethod
    def remove(cls, organization_id: str, operator_session_id: str) -> None:
        key = (organization_id, operator_session_id)
        with cls._lock:
            orchestrator = cls._instances.pop(key, None)
        if orchestrator is not None:
            orchestrator.shutdown()

    @classmethod
    def mark_content_mutated(cls, organization_id: str) -> None:
        with cls._lock:
            for (org_id, _session_id), orchestrator in cls._instances.items():
                if org_id == organization_id:
                    orchestrator.mark_content_mutated()

    @classmethod
    def instances_for_organization(cls, organization_id: str) -> list[DisplayOrchestrator]:
        with cls._lock:
            return [
                orchestrator
                for (org_id, _session_id), orchestrator in cls._instances.items()
                if org_id == organization_id
            ]

    @classmethod
    def reset(cls) -> None:
        with cls._lock:
            for orchestrator in cls._instances.values():
                orchestrator.shutdown()
            cls._instances.clear()
            cls._session_factory = None
