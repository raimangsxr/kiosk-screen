---
id: EVENT.BRANDING
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/event_configuration.py
  - backend/app/api/event_branding.py
  - backend/app/api/schemas.py
  - backend/app/api/mappers.py
  - backend/app/repositories/models/event_configuration.py
  - backend/app/services/event_configuration_service.py
  - backend/alembic/versions/0016_event_branding_layout.py
  - frontend/src/app/core/event-branding.service.ts
  - frontend/src/app/core/api/event-branding.api.ts
  - frontend/src/app/core/api/event-config.api.ts
  - frontend/src/app/features/event-config/**
  - frontend/src/app/display/display-screen.component.ts
  - frontend/src/app/display/display-screen.component.css
  - frontend/src/app/display/kiosk-branding-overlay.component.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-008
  - CHG-019
  - CHG-023
  - CHG-024
related_adrs:
  - ADR-0005
---

# Event Branding Contract

## Purpose

This active contract is the current source of truth for `EVENT.BRANDING`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Administrators can configure event name, organizer name, organizer logo, and event duration.
- Administrators can configure five visual layout properties for the organizer logo (`logoSize`, `logoX`, `logoY`, `logoTransparency`, `logoBorderRadius`) and five for the event name pill (`eventNameSize`, `eventNameX`, `eventNameY`, `eventNameTransparency`, `eventNameBorderRadius`). Values are interpreted as viewport-relative units (vh / vw / %).
- All layout fields are integer-valued on the wire from the admin form (CHG-024 follow-up). The MatSlider uses `step: 1` and the value indicator renders `Math.round(value)` to keep the read-out clean. The backend `BrandingLayout` Pydantic model still declares `size`, `x`, `y`, and `borderRadius` as `float` for backward compatibility with rows that may have been saved before the integer-only step was enforced; the API continues to round-trip fractional floats but new writes only ever contain integers.
- The logo `height` is bound with a minimum of `36px` and otherwise scales linearly with `logoSize` (vh). The event-name `font-size` is bound with a minimum of `13px` and otherwise scales linearly with `eventNameSize` (vw). The previous pixel-based upper clamps (80px / 28px) were removed so administrators can actually see size variations in the documented range `[1, 50]`; pre-CHG-023 baselines remain visible only on viewports where the default `6vh` / `1.6vw` values stay below the historical caps.
- All ten layout fields are rendered in the admin form as Material sliders (`MatSlider`) instead of `<input type="number">`, with the documented `min`, `max`, and `step` per field, a discrete value indicator, and full keyboard accessibility (Left/Right/Up/Down arrow keys step by the configured amount). The numeric read-out and unit (`vh`, `vw`, `%`) are rendered next to each slider so the operator sees the current value while dragging.
- Layout slider changes are auto-saved with a 400 ms debounce (CHG-024). A single continuous drag of one slider triggers at most one `PUT /event-configuration` request when the operator releases the thumb. Pristine forms and programmatic `patchValue` do not trigger auto-save. Auto-save failures surface as a non-blocking status indicator on the affected section without showing a toast or resetting the form.
- The kiosk displays branding when configured and hides the overlay when no branding fields are available.
- Broken organizer logos are hidden without breaking the kiosk runtime.
- Branding remains visible and non-overlapping across supported landscape viewports. The overlay container is anchored to the top of the kiosk and its two children are positioned with `position: absolute`: the organizer logo is anchored from the overlay's left edge and the event name is anchored from the overlay's right edge so the two children never collide (see `ADR-0005`).
- When a layout is configured, both elements are positioned inside the overlay with `position: absolute` driven by CSS custom properties (`--logo-x`, `--logo-y`, `--logo-size`, `--logo-transparency`, `--logo-border-radius`, `--event-name-x`, `--event-name-y`, `--event-name-size`, `--event-name-transparency`, `--event-name-border-radius`). When the layout is absent (NULL on the row), the CSS falls back to the documented visual defaults and the overlay renders identically to the pre-layout baseline.
- The event-name pill is rendered with `white-space: nowrap` and no `max-width` / `overflow` constraints, so the full text is always visible on a single line regardless of length or size; very long names may extend leftward past the logo and must be sized or shortened to avoid overlap.
- Layout changes saved in the admin form are reflected in the kiosk through two complementary mechanisms (CHG-024): (a) a cross-tab `BroadcastChannel` notification (`kiosk-event-config-sync`, localStorage key `kiosk-event-config-sync-event`) emitted by the admin on every successful save (auto or explicit); (b) the existing `remoteControlPollingSeconds` polling cycle (default 3-5 s, minimum 1 s) which still catches cross-machine changes. The notification path makes same-browser iteration feel instant (~1 s end-to-end) without removing the polling safety net. No manual reload is required in either path.
- Branding is not shown over iframe mode.
- `GET /event-branding` is anonymous and single-tenant: it returns branding for the first (and only supported) organization in the deployment. Request context does not carry an organization id; multi-tenant scoping is not implemented.

## Public interfaces

- `GET /event-configuration` — returns the full `EventConfigurationSchema`; includes `logoLayout` and `eventNameLayout` when the columns are non-NULL.
- `PUT /event-configuration` — accepts `multipart/form-data` with the existing fields plus optional `logoLayout` and `eventNameLayout` JSON-encoded strings. Out-of-range values are rejected with HTTP 400 (range-validated by the `BrandingLayout` Pydantic model).
- `GET /event-branding` — returns the kiosk-facing `EventBrandingSchema`; includes `logoLayout` and `eventNameLayout` when the columns are non-NULL.
- `BrandingLayout` (Pydantic model) — five optional numeric fields with the following ranges. The admin form only writes integer values, but the API continues to accept fractional floats for backward compatibility:
  - `size: float` ∈ `[1, 50]` (interpreted as vh for the logo, vw for the event name)
  - `x: float` ∈ `[0, 100]`
    - `logoX`: vw from the overlay's left edge.
    - `eventNameX`: vw from the overlay's right edge (expressed from the right so the value grows naturally with the pill's distance from the right edge).
  - `y: float` ∈ `[0, 100]` (vh from the overlay's top edge)
  - `transparency: int` ∈ `[0, 100]` (percent, applied as `opacity: (100 - transparency) / 100` so `100` is fully transparent / invisible and `0` is fully opaque / visible — matches the field name)
  - `borderRadius: float` ∈ `[0, 50]` (vh)
- `BrandingLayout` is optional end-to-end: a request with `logoLayout=null` or missing entirely is valid and means "use visual defaults".

## Cross-tab sync channel (CHG-024)

- `EventConfigSyncService` (provided in root) owns the cross-tab channel for event configuration changes.
- Channel name: `kiosk-event-config-sync`. Storage key: `kiosk-event-config-sync-event`.
- `notifyEventConfigChanged()` is called by the `EventConfigFacade` after every successful save (auto or explicit) and posts both to `BroadcastChannel` and to `localStorage` for browsers that block `BroadcastChannel` in some contexts.
- `changes$` (Observable<void>) emits whenever another tab/window calls `notifyEventConfigChanged()`. The display component subscribes and calls `EventBrandingService.refresh()` on each emission.
- The channel name is deliberately distinct from `kiosk-display-control-sync` (used by remote control flows) so the two flows do not cross-trigger.

## Breaking changes

- `transparency` semantics changed from `opacity = transparency / 100` to `opacity = (100 - transparency) / 100` so the field name matches its behavior. Pre-existing rows that saved a non-NULL layout will render with the inverted opacity after deploy; rows with NULL layout are unaffected because they use the new `0` default (fully opaque).

## Owned code paths

- `backend/app/api/event_configuration.py`
- `backend/app/api/event_branding.py`
- `backend/app/api/schemas.py`
- `backend/app/api/mappers.py`
- `backend/app/repositories/models/event_configuration.py`
- `backend/app/services/event_configuration_service.py`
- `backend/alembic/versions/0016_event_branding_layout.py`
- `frontend/src/app/core/event-branding.service.ts`
- `frontend/src/app/core/api/event-branding.api.ts`
- `frontend/src/app/core/api/event-config.api.ts`
- `frontend/src/app/core/event-config-sync.service.ts`
- `frontend/src/app/features/event-config/**`
- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/kiosk-branding-overlay.component.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.
- The two new JSON columns on `event_configurations` MUST be added via an idempotent Alembic migration; the migration MUST be safe to run while the backend is serving traffic.
- The default-look preservation baseline (defaults `logoSize: 6` and `eventNameSize: 1.6` render within +/-1px of the pre-CHG-023 visual) MUST be covered by an explicit Karma spec at 1280×720, 1920×1080, and 3840×2160. Removing the historical pixel-based upper clamps (see Current behavior) means the pre-CHG-023 80px / 28px visuals at 1920×1080 and 3840×2160 no longer apply by default; the spec must assert the new viewport-relative sizing instead.

## Non-goals

- Multi-logo sponsor carousels are handled by ads, not branding.
- Drag-and-drop position picker in the admin form (numeric inputs only).
- Per-event branding themes beyond the two layout fields per element.
- Animations on layout change (content rotation animations are out of scope).

## Change history

- CHG-008
- CHG-019
- CHG-023
- CHG-024
- CHG-032
