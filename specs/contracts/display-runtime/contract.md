---
id: DISPLAY.RUNTIME
type: contract
status: active
source_of_truth: true
owns:
  - frontend/src/app/display/display-screen.component.ts
  - frontend/src/app/display/display-screen.component.css
  - frontend/src/app/display/display-screen.component.spec.ts
  - frontend/src/app/display/display-api.service.ts
  - frontend/src/app/display/display-rotation.service.ts
  - frontend/src/app/display/kiosk-rotation.controller.ts
  - frontend/src/app/core/display-control-sync.service.ts
  - frontend/src/app/core/event-branding.service.ts
tests:
  - frontend/src/app/display/**/*.spec.ts
  - frontend/src/app/core/display-control-sync.service.ts
  - backend/tests/**/*display*
related_changes:
  - CHG-014
  - CHG-019
  - CHG-005
  - CHG-007
  - CHG-008
related_adrs:
  - ADR-0001
  - ADR-0002
---

# Display Screen Runtime Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.RUNTIME`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- The runtime opens the display, starts polling, and renders top content, iframe content, fixed content, fallback, ads, fullscreen prompt, and branding according to the polled DisplayState.
- Top and ad regions use the active configuration ratios (`topRegionRatio` and `bottomRegionRatio`), defaulting to `5 / 1` before the first poll. The runtime clamps defensively to `>= 1`. See `DISPLAY.CONFIG_SESSION` for the configurable contract and `ADR-0002` for the polled-source-of-truth principle.
- Default layout is stable before the first poll, and ads-hidden mode lets the top region fill the viewport.
- Landscape viewports 1280x720, 1920x1080, 2560x1440, and 3840x2160 render without scrollbars, clipped text, or layout shifts greater than one pixel when switching content modes.
- Portrait viewports hide kiosk regions and show a single high-contrast rotate-device prompt while backend polling continues.
- Ad figures reserve stable proportional cells; ad images fit without cropping, including tall portrait uploads.
- Branding overlay is visible, legible, and non-overlapping when configured, hidden for iframe mode, and absent when branding is empty.
- Fullscreen requests are surfaced with a user-action prompt when browser policy blocks automatic entry.
- KioskRotationController is the single owner of rotation timers and state; the component must not reach into private controller fields.

## Public interfaces

- `Angular route /display`
- `DisplayApiService.openDisplay()`
- `DisplayApiService.watchState()`
- `KioskRotationController.attach()`

## Owned code paths

- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/display-screen.component.spec.ts`
- `frontend/src/app/display/display-api.service.ts`
- `frontend/src/app/display/display-rotation.service.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`
- `frontend/src/app/core/display-control-sync.service.ts`
- `frontend/src/app/core/event-branding.service.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Portrait kiosk presentation is intentionally not supported beyond the rotate-device prompt.

## Change history

- CHG-014
- CHG-019
- CHG-005
- CHG-007
- CHG-008
- CHG-020
