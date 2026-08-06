# Contract deltas: CHG-057 Ad Rotation Recovery

**Date**: 2026-08-07  
**Apply to active contracts before implementation**

## CONTENT.ROTATION

### Add

- **Orchestrator ensure on reconnect**: Opening `GET /api/display/stream` for a registered kiosk MUST call the same ensure path as `POST /api/display/kiosk/register` so a reaped or idle orchestrator is recreated and rotation timers re-armed without page refresh.
- **Orchestrator ensure on polled state**: `GET /api/display/state` MUST call ensure when the orchestrator is inactive before building the response (idempotent).
- **Ads visibility rearma**: When remote control transitions `adsVisible` from false to true, the orchestrator MUST call `ensure_ad_rotation` (publish current window + arm ad timer). While ads are hidden, ad timers MUST be cancelled; `advance_ad` MUST NOT leave a one-shot timer that permanently stops rotation.
- **Polled runtime fields**: `GET /api/display/state` (and open display bootstrap response) MAY include `currentTop` and `currentAds` with the same shapes as SSE `snapshot` when an orchestrator is active — reflecting live rotation position, not static playlist head.

### Unchanged

- Server owns rotation timers; pause freezes top only; sponsors continue when `adsVisible` (FR-011/012).
- Reaper grace (~120s) and SSE fallback delay (~60s) unless minor tuning documented in plan.
- Novelty defer (CHG-056), recurring counters, empty-queue debounce.

---

## DISPLAY.RUNTIME

### Add

- **Fallback sync**: When `DisplayPollingService` receives `DisplayState` with `currentTop` / `currentAds`, the runtime MUST apply them via the same viewer paths as SSE (`applyShowContent` / `applyShowAds`) when they differ from the displayed rotation position — not only seed empty `visibleAds` on bootstrap.
- **Poll fingerprint**: `equalByDisplayFingerprint` MUST include orchestrator runtime position (`currentTop` / `currentAds`) so rotation advances trigger poll-driven UI updates.
- **`show_ads` animation split (CHG-053 amendment)**: Equivalent consecutive visible windows MAY skip redundant media warm and `visibleAds` reassignment, but MUST still run sponsor rotation animation when configured animation ≠ `none`. Animation `none` remains static (no forced pulse).
- **Silent recovery**: No new kiosk messages for successful auto-recovery; existing reconnect/fallback banners unchanged.

### Replace / clarify

- **`show_ads` dedupe (CHG-051, CHG-053)**: Dedupe applies to **media retention and visible state writes**, not to **animation execution** when animation ≠ `none`.

### Unchanged

- SSE happy path command handling; `KioskRotationController` deprecated.
- Polling handoff: stop poll when SSE reconnects within one cycle.
- Portrait prompt, iframe scaling, content gate for regular (non-novelty) content.

---

## Manifest

Add `CHG-057` under `changes:` with `modifies: [CONTENT.ROTATION, DISPLAY.RUNTIME]`, `extends: [CHG-041, CHG-051, CHG-053]`, `status: planned`.

Update `related_changes` on `CONTENT.ROTATION` and `DISPLAY.RUNTIME` contracts.

---

## Terminology

| Concept | API / client |
|---------|----------------|
| Polled runtime position | `currentTop`, `currentAds` on `DisplayState` |
| Ensure path | `ensure_display_orchestrator` → `ensure_ad_rotation` + `ensure_top_rotation` |
| Animation bump | `adAnimationRun` signal increment |
