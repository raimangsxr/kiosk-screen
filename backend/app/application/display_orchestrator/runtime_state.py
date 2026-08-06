from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.application.display_orchestrator.command_builder import build_show_ads_payload, build_show_content_payload
from app.services.display_service import eligible_ads, eligible_top_content, get_display_state

if TYPE_CHECKING:
    from app.application.display_orchestrator.service import DisplayOrchestrator


def build_current_top_payload(
    session: Session,
    orchestrator: DisplayOrchestrator,
    organization_id: str,
) -> dict | None:
    extras = orchestrator.current_snapshot_extras()
    command_id = extras.get("currentTopCommandId")
    content_id = extras.get("currentTopContentId")
    if not command_id or not content_id:
        return None

    state = get_display_state(session, organization_id)
    item = next(
        (row for row in eligible_top_content(session, organization_id) if str(row.id) == content_id),
        None,
    )
    if item is None:
        return None

    playback_mode = "video" if item.content_type == "video" else "timer"
    return build_show_content_payload(
        item=item,
        configuration=state.configuration,
        command_id=str(command_id),
        reason="snapshot",
        playback_mode=playback_mode,
    )


def build_current_ads_payload(
    session: Session,
    orchestrator: DisplayOrchestrator,
    organization_id: str,
) -> dict | None:
    extras = orchestrator.current_snapshot_extras()
    ad_command_id = extras.get("currentAdCommandId")
    start_index = extras.get("currentAdStartIndex")
    if ad_command_id is None or start_index is None:
        return None

    state = get_display_state(session, organization_id)
    ads = eligible_ads(session, organization_id)
    if not ads:
        return None

    return build_show_ads_payload(
        ads=ads,
        configuration=state.configuration,
        command_id=ad_command_id,
        start_index=max(0, int(start_index) - (state.configuration.inline_ad_count or 1)),
        reason="snapshot",
    )
