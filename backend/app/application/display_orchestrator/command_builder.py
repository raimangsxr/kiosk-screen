from __future__ import annotations

from datetime import datetime, timezone

from app.api.mappers import to_ad_schema, to_content_schema
from app.domain.rotation import resolve_effective_rotation
from app.repositories.models.ad import ClientAdItem
from app.repositories.models.content import TopContentItem
from app.repositories.models.kiosk_configuration import KioskDisplayConfiguration


def _command_id(sequence: int, *, now: datetime | None = None) -> str:
    current = now or datetime.now(timezone.utc)
    return f"cmd-{current.strftime('%Y%m%d')}-{sequence:06d}"


def build_show_content_payload(
    *,
    item: TopContentItem,
    configuration: KioskDisplayConfiguration,
    command_id: str,
    reason: str,
    playback_mode: str | None = None,
) -> dict:
    effective = resolve_effective_rotation(
        item.duration_seconds,
        item.rotation_animation,
        item.animation_duration_milliseconds,
        configuration.default_top_duration_seconds,
        configuration.default_top_rotation_animation,
        configuration.default_top_animation_duration_milliseconds,
    )
    content = to_content_schema(
        item,
        effective_duration_seconds=effective.duration_seconds,
        effective_rotation_animation=effective.rotation_animation,
        effective_animation_duration_milliseconds=effective.animation_duration_milliseconds,
    ).model_dump(mode="json", by_alias=True)
    mode = playback_mode or ("video" if item.content_type == "video" else "timer")
    return {
        "commandId": command_id,
        "content": content,
        "playback": {
            "mode": mode,
            "durationSeconds": effective.duration_seconds,
            "videoEndDelaySeconds": configuration.video_end_delay_seconds,
            "loopVideo": False,
        },
        "transition": {
            "animation": effective.rotation_animation,
            "durationMs": effective.animation_duration_milliseconds,
        },
        "reason": reason,
    }


def build_show_ads_payload(
    *,
    ads: list[ClientAdItem],
    configuration: KioskDisplayConfiguration,
    command_id: str,
    start_index: int,
    reason: str = "ad_rotation",
    inline_ad_count: int | None = None,
) -> dict:
    items = []
    for ad in ads:
        effective = resolve_effective_rotation(
            ad.duration_seconds,
            ad.rotation_animation,
            ad.animation_duration_milliseconds,
            configuration.default_ad_duration_seconds,
            configuration.default_ad_rotation_animation,
            configuration.default_ad_animation_duration_milliseconds,
        )
        items.append(
            to_ad_schema(
                ad,
                effective_duration_seconds=effective.duration_seconds,
                effective_rotation_animation=effective.rotation_animation,
                effective_animation_duration_milliseconds=effective.animation_duration_milliseconds,
            ).model_dump(mode="json", by_alias=True)
        )
    resolved_inline_ad_count = inline_ad_count if inline_ad_count is not None else configuration.inline_ad_count
    return {
        "commandId": command_id,
        "items": items,
        "startIndex": start_index,
        "inlineAdCount": resolved_inline_ad_count,
        "border": {
            "radiusPx": configuration.inline_ad_item_border_radius_px,
            "widthPx": configuration.inline_ad_item_border_width_px,
            "color": configuration.inline_ad_item_border_color,
        },
        "transition": {
            "animation": configuration.default_ad_rotation_animation,
            "durationMs": configuration.default_ad_animation_duration_milliseconds,
        },
        "durationSeconds": configuration.default_ad_duration_seconds,
        "reason": reason,
    }


def next_command_id(sequence: int) -> str:
    return _command_id(sequence)
