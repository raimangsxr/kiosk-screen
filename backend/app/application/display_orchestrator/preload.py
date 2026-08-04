from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.application.display_orchestrator.rotation_logic import novelty_queue
from app.application.display_orchestrator.sse_hub import get_display_sse_hub
from app.repositories.models.content import TopContentItem
from app.services.display_service import eligible_top_content

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator
    from sqlalchemy.orm import Session


def media_url(item: TopContentItem) -> str | None:
    media_file = getattr(item, "media_file", None)
    if media_file is not None and getattr(media_file, "public_reference", None):
        return media_file.public_reference
    if item.source_reference:
        return item.source_reference
    return None


def build_preload_item(item: TopContentItem, *, is_novelty: bool) -> dict[str, Any] | None:
    url = media_url(item)
    if url is None:
        return None
    return {
        "contentId": str(item.id),
        "mediaUrl": url,
        "contentType": item.content_type,
        "mediaVersion": str(item.id),
        "isNovelty": is_novelty,
    }


def build_preload_items_from_snapshot(
    orchestrator: DisplayOrchestrator,
    session: Session,
) -> list[dict[str, Any]]:
    from app.application.display_orchestrator.service import _pick_next_regular, _regular_queue

    eligible = eligible_top_content(session, orchestrator.organization_id)
    items: list[dict[str, Any]] = []
    for novelty in novelty_queue(eligible):
        built = build_preload_item(novelty, is_novelty=True)
        if built is not None:
            items.append(built)

    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") == "loop" and not state.get("isPaused"):
        regular = _regular_queue(eligible)
        if regular:
            next_item = _pick_next_regular(regular, state.get("currentTopContentId"))
            if next_item is not None:
                built = build_preload_item(next_item, is_novelty=False)
                if built is not None:
                    items.append(built)
    return items


def pending_novelty_items(
    orchestrator: DisplayOrchestrator,
    session: Session,
) -> list[dict[str, Any]]:
    eligible = eligible_top_content(session, orchestrator.organization_id)
    items: list[dict[str, Any]] = []
    for novelty in novelty_queue(eligible):
        built = build_preload_item(novelty, is_novelty=True)
        if built is not None:
            items.append(built)
    return items


def publish_preload(
    orchestrator: DisplayOrchestrator,
    items: list[dict[str, Any]],
) -> None:
    if not items:
        return
    get_display_sse_hub().publish(
        organization_id=orchestrator.organization_id,
        operator_session_id=orchestrator.operator_session_id,
        event_type="preload",
        payload={
            "items": items,
            "leadTimeSeconds": 5,
        },
    )


def emit_novelty_preload(orchestrator: DisplayOrchestrator, session: Session) -> None:
    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") != "loop" or state.get("isPaused"):
        return
    items = pending_novelty_items(orchestrator, session)
    publish_preload(orchestrator, items)


def emit_next_regular_preload(
    orchestrator: DisplayOrchestrator,
    session: Session,
    *,
    after_item: TopContentItem,
) -> None:
    from app.application.display_orchestrator.service import _pick_next_regular, _regular_queue

    state = orchestrator._load_state()  # noqa: SLF001
    if state.get("contentMode") != "loop" or state.get("isPaused"):
        return

    eligible = eligible_top_content(session, orchestrator.organization_id)
    if novelty_queue(eligible):
        return

    regular = _regular_queue(eligible)
    if not regular:
        return

    upcoming = _pick_next_regular(regular, str(after_item.id))
    if upcoming is None or str(upcoming.id) == str(after_item.id):
        return

    built = build_preload_item(upcoming, is_novelty=False)
    if built is not None:
        publish_preload(orchestrator, [built])
