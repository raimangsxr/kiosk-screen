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
  - frontend/src/app/display/display-polling.service.ts
  - frontend/src/app/display/display-stream.service.ts
  - frontend/src/app/display/display-viewer.controller.ts
  - frontend/src/app/display/kiosk-rotation.controller.ts
  - frontend/src/app/core/display-control-sync.service.ts
  - frontend/src/app/core/event-branding.service.ts
  - frontend/src/app/display/display-label.service.ts
  - frontend/src/app/display/iframe-scale.service.ts
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
  - CHG-036
  - CHG-041
  - CHG-044
  - CHG-045
related_adrs:
  - ADR-0001
  - ADR-0002
  - ADR-0007
  - ADR-0009
  - ADR-0012
  - ADR-0013
---

# Display Screen Runtime Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.RUNTIME`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- The runtime opens the display, registers with the server, and subscribes to the SSE command stream (`GET /api/display/stream`). It renders top content, iframe content, fixed content, fallback, ads, fullscreen prompt, and branding according to server commands (`show_content`, `show_ads`, `show_iframe`, `mode_changed`, `config_updated`, `snapshot`). See `ADR-0009`.
- `DisplayPollingService` is a degraded fallback only when SSE is unavailable for more than 60 seconds; it is not used on the happy path. `KioskRotationController` is deprecated and retained for unit-test coverage only — the server orchestrator owns rotation timers.
- Displays report playback facts the server cannot observe (`video_ended`, `media_error`) via `POST /api/display/kiosk/events`. Duplicate reports for the same `commandId` are idempotent.
- `DisplayStreamService` owns the SSE lifecycle: connect, reconnect with `Last-Event-ID`, `reconnecting` indicator (CHG-030 parity), and fatal 401/403 handling (navigate to login).
- `DisplayViewerController` applies server commands to template state.
- Top and ad regions use configuration ratios from SSE `config_updated` or `snapshot`, defaulting to `5 / 1` before the first event. The runtime clamps defensively to `>= 1`. See `DISPLAY.CONFIG_SESSION` and `ADR-0002`.
- Default layout is stable before the first poll, and ads-hidden mode lets the top region fill the viewport.
- Landscape viewports 1280x720, 1920x1080, 2560x1440, and 3840x2160 render without scrollbars, clipped text, or layout shifts greater than one pixel when switching content modes.
- Portrait viewports hide kiosk regions and show a single high-contrast rotate-device prompt while the SSE stream reconnects or degraded polling runs.
- Ad figures reserve stable 1:1 cells; border radius, width, and color come from `inlineAdItemBorderRadiusPx`, `inlineAdItemBorderWidthPx`, and `inlineAdItemBorderColor` in the active configuration delivered via SSE (defaults: 5px radius, 0px width, `#ffffff`). Ad images fill each cell edge-to-edge via `object-fit: cover` (square sponsor assets are the supported format).
- Display configuration changes saved in the admin propagate to all connected displays via SSE `config_updated` within one second. Layout fields (ratios, sponsor-strip borders) apply immediately; playlist fields apply at the next content or sponsor boundary.
- Branding changes propagate via SSE `branding_updated` (see `EVENT.BRANDING`); admin cross-tab `BroadcastChannel` remains optional for admin UI only.
- Top-region photos and videos render the full frame without cropping (`object-fit: contain` on the foreground). Unused band space is filled with a blurred backdrop copy of the same media (blur-fill). Under `prefers-reduced-motion: reduce`, the backdrop degrades to solid `#102832` instead of blur. See `ADR-0007`.
- Pinned iframes fill the top region inside an `overflow: hidden` host. The iframe uses inverse dimensions (`width: calc(100% / scaleX)`, `height: calc(100% / scaleY)`), horizontal centering via `margin-inline: auto`, plus `transform: scale(scaleX, scaleY)` with `transform-origin: top center` so the host footprint stays fixed while embedded content is zoomed. Effective scale values are resolved client-side via `IframeScaleService`: per-display override when present, otherwise `show_iframe` / `snapshot` defaults (`scaleX`, `scaleY`; default `1.0`). Resolution applies on `show_iframe`, `iframe_scale_updated`, snapshot bootstrap, and SSE-degraded polling paths. The iframe URL is not augmented with density query parameters and no `bull:config` postMessage is sent.
- Operators set a stable kiosk display label via `DisplayLabelService` (local storage). A non-empty label is required on `POST /api/display/kiosk/register`; registration returns `displayDeviceId` for override resolution.
- Ad rotation uses its own cadence and is not reset by faster top-content advances in loop/rotation mode; the same ad cadence continues in fixed, iframe, and paused states while ads remain visible.
- The sponsor band avoids browser-extension bait in its rendered DOM class and test hook names (for example generic `ad-*` selectors) so Chrome deployments with cosmetic filtering still render first-party sponsor content.
- Branding overlay is visible, legible, and non-overlapping when configured, hidden for iframe mode, and absent when branding is empty.
- Fullscreen requests are surfaced with a user-action prompt when browser policy blocks automatic entry.
- The kiosk applies `branding_updated` SSE events via `EventBrandingService.refresh()`. Kiosk-path `BroadcastChannel` sync is retired; admin cross-tab sync remains optional for the admin UI only.
- Server command handling replaces display-state fingerprint comparison for timer preservation; the orchestrator decides when to emit new `show_content` commands.
- Empty-queue audit is emitted by the server orchestrator (`orchestrator_empty_queue`); client `content_rotation_empty` posts are deprecated.
- When the organizer logo URL changes after a prior load failure, the kiosk clears `hiddenLogoUrl` so the new URL is attempted without a full page reload.
- `DisplayPollingService` provides degraded-fallback lifecycle when SSE is down: exponential backoff, fatal 401/403, `reconnecting` / `openError` signals, and a visible fallback banner after 60 seconds.
- Transient SSE failures keep rendering the last known frame and show a non-intrusive reconnecting indicator.
- Leaving `/display` closes the SSE stream and releases timers without subscription leaks.

## Public interfaces

- `Angular route /display`
- `POST /api/display/kiosk/register`
- `GET /api/display/iframe-scales/me`
- `GET /api/display/stream` (SSE)
- `POST /api/display/kiosk/events`
- `DisplayStreamService.connect()`
- `DisplayViewerController.applyCommand()`
- `DisplayApiService.openDisplay()` (session bootstrap)
- `GET /api/display/state` (deprecated SSE-down fallback only)

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
- `frontend/src/app/display/display-label.service.ts`
- `frontend/src/app/display/iframe-scale.service.ts`

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
- CHG-030
- CHG-036
- CHG-041
- CHG-044 — per-iframe CSS scale (`scaleX`/`scaleY`) replaces CHG-042/043 embed-density stack (`DisplayLayoutService`, `embed_app_height_px`, `bull:config`, `layout_updated` SSE).
- CHG-045 — per-display iframe scale overrides with client-side resolution and `iframe_scale_updated` SSE.
- CHG-029 (recurring-content rotation refresh without full page reload, pre-formal spec)
