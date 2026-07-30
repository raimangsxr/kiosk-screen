from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.admin_content.sse_hub import get_admin_content_sse_hub
from app.application.display_control.service import DisplayControlService
from app.application.display_orchestrator.registry import OrchestratorRegistry
from app.repositories.models.content import TopContentItem


def _is_top_content_on_air(state: dict) -> bool:
    if state.get("isPaused"):
        return False
    if state.get("contentMode") == "iframe":
        return False
    if state.get("contentMode") in {"loop", "fixed"}:
        return bool(state.get("currentTopContentId"))
    return False


def _active_orchestrator(organization_id: str):
    instances = OrchestratorRegistry.instances_for_organization(organization_id)
    if not instances:
        return None
    if len(instances) == 1:
        return instances[0]
    return max(instances, key=lambda item: item.operator_session_id)


def get_now_playing_for_org(
    session: Session,
    organization_id: str,
) -> tuple[str | None, str | None]:
    orchestrator = _active_orchestrator(organization_id)
    if orchestrator is None:
        operator_session = DisplayControlService(session).latest_active_session(organization_id)
        if operator_session is None:
            return None, None
        orchestrator = OrchestratorRegistry.get(organization_id, operator_session.id)
        if orchestrator is None:
            return None, None

    state = orchestrator._load_state()  # noqa: SLF001
    if not _is_top_content_on_air(state):
        return None, None

    content_id = str(state["currentTopContentId"])
    item = session.scalar(
        select(TopContentItem).where(
            TopContentItem.id == content_id,
            TopContentItem.organization_id == organization_id,
        )
    )
    title = item.title if item is not None else None
    return content_id, title


def notify_admin_content_inventory_changed(organization_id: str, *, reason: str = "mutation") -> None:
    get_admin_content_sse_hub().publish(organization_id, reason=reason)


def notify_now_playing_changed(
    organization_id: str,
    *,
    content_id: str | None,
    title: str | None = None,
) -> None:
    get_admin_content_sse_hub().publish_now_playing_changed(
        organization_id,
        content_id=content_id,
        title=title,
    )


def sync_now_playing_from_orchestrator(session: Session, organization_id: str) -> None:
    content_id, title = get_now_playing_for_org(session, organization_id)
    notify_now_playing_changed(organization_id, content_id=content_id, title=title)
