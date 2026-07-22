from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from app.repositories.models.iframe import Iframe
from app.repositories.models.iframe_display_scale_override import IframeDisplayScaleOverride


@dataclass(frozen=True)
class EffectiveIframeScale:
    scale_x: Decimal
    scale_y: Decimal
    source: Literal["override", "default"]


def resolve_effective_scale(
    iframe: Iframe,
    override: IframeDisplayScaleOverride | None,
) -> EffectiveIframeScale:
    if override is not None:
        return EffectiveIframeScale(scale_x=override.scale_x, scale_y=override.scale_y, source="override")
    return EffectiveIframeScale(scale_x=iframe.scale_x, scale_y=iframe.scale_y, source="default")
