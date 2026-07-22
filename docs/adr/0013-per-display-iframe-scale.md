# ADR-0013: Per-display iframe scale

**Status**: Accepted  
**Date**: 2026-07-22  
**Change**: CHG-045  
**Supersedes**: ADR-0012 non-goal on per-kiosk overrides (partial)

## Context

CHG-044 stores one `scaleX`/`scaleY` per iframe record, applied identically on every
kiosk. Mixed-resolution venues need different zoom per physical screen while sharing the
same iframe URL. CHG-042 solved a similar problem with embed density but was removed as
too heavy.

## Decision

1. Restore slim `display_devices` (stable id + editable label) and
   `iframe_display_scale_overrides` keyed by `(display_device_id, iframe_id)`.
2. Iframe defaults remain the organization baseline; overrides are optional and sparse.
3. Kiosk resolves effective scale **client-side**: `override ?? show_iframe.iframe.scale`
   using `displayDeviceId` from register and a cached override map.
4. New SSE event `iframe_scale_updated` notifies the affected display when an override
   changes; `show_iframe` payload keeps iframe defaults (broadcast unchanged).
5. Admin configures overrides from iframe list summary + edit-form matrix; no on-display
   calibration UI.

## Consequences

### Positive

- Different screens can tune the same iframe independently.
- Reuses CHG-044 CSS transform host; no embed-density protocol or sibling-app coupling.
- Label rename preserves overrides via stable device id.

### Negative

- Extra tables and admin matrix UX.
- Client-side resolution requires kiosk to load override map on register.

## Related

- CHG-044, CHG-045
- Contracts: `IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`
