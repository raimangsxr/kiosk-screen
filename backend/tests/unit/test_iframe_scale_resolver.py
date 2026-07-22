from decimal import Decimal

from app.application.iframe_scale_resolver import resolve_effective_scale
from app.repositories.models.iframe import Iframe
from app.repositories.models.iframe_display_scale_override import IframeDisplayScaleOverride


def test_resolve_uses_override_when_present() -> None:
    iframe = Iframe(organization_id="org-1", url="https://example.org", scale_x=Decimal("1.00"), scale_y=Decimal("1.00"))
    override = IframeDisplayScaleOverride(
        display_device_id="device-1",
        iframe_id="iframe-1",
        scale_x=Decimal("1.25"),
        scale_y=Decimal("0.80"),
    )
    effective = resolve_effective_scale(iframe, override)
    assert effective.source == "override"
    assert effective.scale_x == Decimal("1.25")
    assert effective.scale_y == Decimal("0.80")


def test_resolve_uses_iframe_default_when_override_missing() -> None:
    iframe = Iframe(organization_id="org-1", url="https://example.org", scale_x=Decimal("1.50"), scale_y=Decimal("0.90"))
    effective = resolve_effective_scale(iframe, None)
    assert effective.source == "default"
    assert effective.scale_x == Decimal("1.50")
    assert effective.scale_y == Decimal("0.90")


def test_resolve_independent_per_device_same_iframe() -> None:
    iframe = Iframe(organization_id="org-1", url="https://example.org", scale_x=Decimal("1.00"), scale_y=Decimal("1.00"))
    override_a = IframeDisplayScaleOverride(
        display_device_id="device-a",
        iframe_id="iframe-1",
        scale_x=Decimal("1.10"),
        scale_y=Decimal("1.10"),
    )
    effective_a = resolve_effective_scale(iframe, override_a)
    effective_b = resolve_effective_scale(iframe, None)
    assert effective_a.source == "override"
    assert effective_b.source == "default"
    assert effective_a.scale_x != effective_b.scale_x
