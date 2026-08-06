# Data Model: CHG-057 Ad Rotation Recovery

**Date**: 2026-08-07

## Schema changes

**None.** No PostgreSQL migration. All runtime position data already lives in Redis orchestrator JSON (`currentAdStartIndex`, `currentAdCommandId`, `currentTopContentId`, `currentTopCommandId`, etc.).

## API model extensions

### `DisplayStateSchema` / `DisplayState` (GET `/api/display/state`, POST `/api/display/open`)

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `currentTop` | `ShowContentPayload` \| null | when orchestrator active + loop content showing | orchestrator Redis + eligible top queue |
| `currentAds` | `ShowAdsPayload` \| null | when orchestrator active + ads eligible | orchestrator Redis + eligible ads |

Shapes match SSE snapshot fields (`snapshot.currentTop`, `snapshot.currentAds`). Omitted or `null` when no active orchestrator or no current command.

### Unchanged fields

`configuration`, `topContent`, `ads`, `remoteControl`, `selectedIframe`, `fallbackActive`, `fixedEligibleContents` — playlist/catalog data; not rotation cursor.

## Server state transitions

### Orchestrator lifecycle (recovery)

```text
[active, timers armed]
    │ SSE subscribers = 0 for >120s
    ▼
[reaped — registry empty, Redis state may persist]
    │ kiosk: stream reconnect OR GET /state (fallback)
    ▼
[ensure_display_orchestrator → ensure_*_rotation → timers re-armed]
    │ publish show_ads / show_content or include in polled current*
    ▼
[active]
```

### Ad visibility (remote control)

```text
adsVisible: true, ad timer armed
    │ operator hides ads
    ▼
adsVisible: false, ad timer cancelled
    │ ad tick (if any) → advance_ad no-op
    │ operator shows ads
    ▼
ensure_ad_rotation → show_ads sync + timer armed
```

## Client state

| Signal / field | Change |
|----------------|--------|
| `DisplayViewerController.lastShowAdsFingerprint` | Still dedupes media/state writes |
| `DisplayViewerController.adAnimationRun` | Increments on every `show_ads` when animation ≠ `none` |
| `equalByDisplayFingerprint` | Includes `currentTop` / `currentAds` position |
| `seedViewerFromState` | Applies `currentTop` / `currentAds` from polled state when present |

## Validation rules

- `currentTop` present only when `remoteControl.contentMode === 'loop'` and not paused (or when orchestrator state says so).
- `currentAds` null when `adsVisible === false` or no eligible ads.
- `ensure_display_orchestrator` on GET `/state` is idempotent; must not create duplicate scheduler threads (registry `get_or_create` + existing `ensure_*` guards).

## Relationships

- **OrchestratorRegistry** — in-memory orchestrator instances; `ensure` recreates from Redis when reaped.
- **DisplaySseHub** — stream open triggers ensure; unrelated to poll path except shared orchestrator.
- **DisplayPollingService** — consumes extended `DisplayState`; no new endpoints.
