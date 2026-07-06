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
  - CHG-024
  - CHG-028
  - CHG-029
  - CHG-030
  - CHG-005
  - CHG-007
  - CHG-008
related_adrs:
  - ADR-0001
  - ADR-0002
  - ADR-0007
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
- Ad figures reserve stable 1:1 cells; border radius, width, and color come from `inlineAdItemBorderRadiusPx`, `inlineAdItemBorderWidthPx`, and `inlineAdItemBorderColor` in the polled configuration (defaults: 5px radius, 0px width, `#ffffff`). Ad images fill each cell edge-to-edge via `object-fit: cover` (square sponsor assets are the supported format).
- Display configuration changes saved in the admin (including `inlineAdCount` and sponsor-strip border fields) propagate to an open kiosk through the existing `DisplayControlSyncService` cross-tab channel plus the normal polling cycle; no manual page reload is required.
- Top-region photos and videos render the full frame without cropping (`object-fit: contain` on the foreground). Unused band space is filled with a blurred backdrop copy of the same media (blur-fill). Under `prefers-reduced-motion: reduce`, the backdrop degrades to solid `#102832` instead of blur. See `ADR-0007`.
- Pinned iframes continue to fill the top region edge-to-edge without blur-fill framing (v1).
- Ad rotation uses its own cadence and is not reset by faster top-content advances in loop/rotation mode; the same ad cadence continues in fixed, iframe, and paused states while ads remain visible.
- The sponsor band avoids browser-extension bait in its rendered DOM class and test hook names (for example generic `ad-*` selectors) so Chrome deployments with cosmetic filtering still render first-party sponsor content.
- Branding overlay is visible, legible, and non-overlapping when configured, hidden for iframe mode, and absent when branding is empty.
- Fullscreen requests are surfaced with a user-action prompt when browser policy blocks automatic entry.
- KioskRotationController is the single owner of rotation timers and state; the component must not reach into private controller fields.
- The kiosk subscribes to the cross-tab event-config sync channel (`kiosk-event-config-sync`, see `EVENT.BRANDING`) so that an admin form save in another tab/window triggers `EventBrandingService.refresh()` within the same event loop turn, without waiting for the next polling cycle (CHG-024). The existing polling cycle is preserved as a fallback for cross-machine scenarios where BroadcastChannel cannot reach the kiosk host.
- Display state fingerprint comparison treats changes to `sourceReference`, `mediaFile.mediaUrl`, `effectiveDurationSeconds` (per content item), and `selectedIframe.url` as material even when content or iframe ids are unchanged. Rotation timers are preserved when only immaterial fields differ and remote-control fingerprint is unchanged.
- When the rotation engine detects an empty loop queue, `DisplayScreenComponent` wires `KioskRotationController.rotationEventSink` to `DisplayApiService.postRotationEvent()` so `content_rotation_empty` is posted to the backend audit pipeline.
- When the organizer logo URL changes after a prior load failure, the kiosk clears `hiddenLogoUrl` so the new URL is attempted without a full page reload.
- `DisplayPollingService` owns the kiosk polling lifecycle: `open()`, `start()`, `stop()`, `pollNow()`, exponential backoff (1–30 s with ±20 % jitter) on transient poll failures, fatal 401/403 handling, and `reconnecting` / `openError` signals for operator feedback. `DisplayScreenComponent` delegates open, polling, and manual refresh to this service instead of inline `watchState()` subscriptions.
- Transient poll failures keep rendering the last known state and show a non-intrusive reconnecting indicator. Initial `openDisplay` failure shows recoverable error UI with explicit retry; repeated open retries use the same backoff curve.
- Leaving `/display` stops polling and releases timers without subscription leaks.

## Public interfaces

- `Angular route /display`
- `DisplayApiService.openDisplay()`
- `DisplayApiService.getState()`
- `DisplayPollingService.open()`
- `DisplayPollingService.start()`
- `DisplayPollingService.stop()`
- `DisplayPollingService.pollNow()`
- `DisplayApiService.postRotationEvent()`
- `KioskRotationController.attach()`

## Owned code paths

- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/display-screen.component.spec.ts`
- `frontend/src/app/display/display-api.service.ts`
- `frontend/src/app/display/display-rotation.service.ts`
- `frontend/src/app/display/display-polling.service.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`
- `frontend/src/app/display/cursor.service.ts`
- `frontend/src/app/display/recurring-cadence.service.ts`
- `frontend/src/app/display/rotation-scheduler.service.ts`
- `frontend/src/app/display/kiosk-branding-overlay.component.ts`
- `frontend/src/app/display/kiosk-fullscreen-prompt.component.ts`
- `frontend/src/app/core/display-control-sync.service.ts`
- `frontend/src/app/core/event-branding.service.ts`
- `frontend/src/app/core/event-config-sync.service.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Portrait kiosk presentation is intentionally not supported beyond the rotate-device prompt.

## Change history

- CHG-014
- CHG-019
- CHG-021
- CHG-024
- CHG-005
- CHG-007
- CHG-008
- CHG-020
- CHG-028
