from __future__ import annotations

from sqlalchemy.orm import Session

from app.api.mappers import to_configuration_schema, to_iframe_schema
from app.application.display_orchestrator.command_builder import build_show_ads_payload, build_show_content_payload
from app.services.display_service import eligible_ads, eligible_top_content, get_display_state


def build_snapshot_payload(
    session: Session,
    organization_id: str,
    *,
    orchestrator: object | None = None,
) -> dict:
    state = get_display_state(session, organization_id)
    remote_control = state.remote_control
    configuration = to_configuration_schema(state.configuration).model_dump(mode="json", by_alias=True)
    content_mode = remote_control.content_mode if remote_control is not None else "loop"
    is_paused = remote_control is not None and remote_control.navigation_command == "pause"
    ads_visible = remote_control.ads_visible if remote_control is not None else True
    selected_iframe = (
        to_iframe_schema(state.selected_iframe).model_dump(mode="json", by_alias=True)
        if state.selected_iframe is not None
        else None
    )
    current_top = None
    current_ads = None
    if orchestrator is not None:
        extras = orchestrator.current_snapshot_extras()
        command_id = extras.get("currentTopCommandId")
        content_id = extras.get("currentTopContentId")
        if command_id and content_id:
            item = next(
                (row for row in eligible_top_content(session, organization_id) if str(row.id) == content_id),
                None,
            )
            if item is not None:
                playback_mode = "video" if item.content_type == "video" else "timer"
                current_top = build_show_content_payload(
                    item=item,
                    configuration=state.configuration,
                    command_id=str(command_id),
                    reason="snapshot",
                    playback_mode=playback_mode,
                )
        ad_command_id = extras.get("currentAdCommandId")
        start_index = extras.get("currentAdStartIndex")
        if ad_command_id is not None and start_index is not None:
            ads = eligible_ads(session, organization_id)
            if ads:
                current_ads = build_show_ads_payload(
                    ads=ads,
                    configuration=state.configuration,
                    command_id=ad_command_id,
                    start_index=max(0, int(start_index) - (state.configuration.inline_ad_count or 1)),
                    reason="snapshot",
                )
    return {
        "configuration": configuration,
        "contentMode": content_mode,
        "isPaused": is_paused,
        "adsVisible": ads_visible,
        "selectedIframe": selected_iframe,
        "currentTop": current_top,
        "currentAds": current_ads,
        "fallbackActive": state.fallback_active,
    }


from app.application.display_orchestrator.config_mutation import (  # noqa: E402
    DEFERRED_BOUNDARY_FIELDS,
    IMMEDIATE_LAYOUT_FIELDS,
    build_config_updated_payload,
    diff_configuration_fields,
)

__all__ = [
    "DEFERRED_BOUNDARY_FIELDS",
    "IMMEDIATE_LAYOUT_FIELDS",
    "build_config_updated_payload",
    "build_snapshot_payload",
    "diff_configuration_fields",
]
