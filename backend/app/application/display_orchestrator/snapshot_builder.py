from __future__ import annotations

from sqlalchemy.orm import Session

from app.api.mappers import to_configuration_schema, to_iframe_schema
from app.application.display_orchestrator.runtime_state import build_current_ads_payload, build_current_top_payload
from app.services.display_service import get_display_state


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
        current_top = build_current_top_payload(session, orchestrator, organization_id)
        current_ads = build_current_ads_payload(session, orchestrator, organization_id)
    payload = {
        "configuration": configuration,
        "contentMode": content_mode,
        "isPaused": is_paused,
        "adsVisible": ads_visible,
        "selectedIframe": selected_iframe,
        "currentTop": current_top,
        "currentAds": current_ads,
        "fallbackActive": state.fallback_active,
    }
    if orchestrator is not None:
        payload["pendingNovelties"] = pending_novelty_items(orchestrator, session)
    return payload


from app.application.display_orchestrator.config_mutation import (  # noqa: E402
    DEFERRED_BOUNDARY_FIELDS,
    IMMEDIATE_LAYOUT_FIELDS,
    build_config_updated_payload,
    diff_configuration_fields,
)
from app.application.display_orchestrator.preload import pending_novelty_items

__all__ = [
    "DEFERRED_BOUNDARY_FIELDS",
    "IMMEDIATE_LAYOUT_FIELDS",
    "build_config_updated_payload",
    "build_snapshot_payload",
    "diff_configuration_fields",
]
