# Context pack: CHG-057 ad rotation recovery

## Read first

1. `specs/contracts/content-rotation/contract.md` — orchestrator timers, ads visibility, ensure hooks
2. `specs/contracts/display-runtime/contract.md` — SSE, polling fallback, show_ads dedupe + animation split
3. `specs/changes/057-fix-ad-rotation-recovery/spec.md` + clarifications session 2026-08-07
4. `specs/changes/057-fix-ad-rotation-recovery/plan.md` + `research.md`
5. `backend/app/application/display_orchestrator/{hooks,runtime_state,service,remote_control,snapshot_builder,reaper}.py`
6. `backend/app/api/{display,display_stream,schemas}.py`
7. `frontend/src/app/display/{display-stream,display-screen,display-viewer.controller,display-polling,display-fingerprint}.*`
8. `frontend/src/app/core/api/display.api.ts`

## Do not read by default

- `specs/archive/**`
- CHG-056 novelty defer unless tracing ensure_top interaction
- Unrelated change specs

## Implemented summary (2026-08-07)

1. **`ensure_display_orchestrator`** on `GET /display/stream` open and `GET /display/state` — reaper-idle orchestrators reactivate without kiosk refresh.
2. **Ad timer lifecycle** — `advance_ad` cancels when `adsVisible` is false; `apply_remote_state` cancels on hide and calls `ensure_ad_rotation` on show; zero eligible ads cancels timer.
3. **Polled runtime sync** — `runtime_state.py` builds `currentTop`/`currentAds` for snapshot and `GET /state`; client fingerprint + `seedViewerFromState` apply rotation position during fallback polling.
4. **Animation vs media dedupe** — `applyShowAds` bumps `adAnimationRun` when effective animation ≠ `none` even if visible window unchanged; `none` stays static.
5. **Pause/fixed/iframe** — reconnect ensure re-arms sponsors only; top loop stays frozen per spec US1 scenario 4.
6. **Silent recovery** — no new kiosk banners (existing reconnect/fallback UI only).

## Contract touchpoints

- `CONTENT.ROTATION` — ensure hooks, ads visibility, polled runtime fields
- `DISPLAY.RUNTIME` — fallback sync, animation dedupe amendment

## Tests

### Backend

- `backend/tests/integration/test_display_ad_rotation_recovery.py` — reaper + ensure; pause sponsors-only; hide/show ads; polled `currentTop`/`currentAds`
- `backend/tests/unit/test_ad_rotation_recovery.py` — advance_ad cancel; ensure_ad_rotation; zero ads; duplicate ensure; remote hide/show

### Frontend

- `display-viewer.controller.spec.ts` — animation on duplicate fingerprint; static `none`
- `display-screen.component.spec.ts` — fallback applies `currentAds` from polled state
- `display-fingerprint.spec.ts` and `display.api.spec.ts` — poll fingerprint includes runtime fields

### Manual

- `quickstart.md` §1–4 (SC-001–SC-004); SC-005 post-deploy ops

## Terminology

| Layer | Name | Notes |
|-------|------|-------|
| Polled fields | `currentTop`, `currentAds` | Same shapes as SSE snapshot |
| Motor de rotación | `DisplayOrchestrator` / `ensure_display_orchestrator` | Server-side session rotation engine |
| Ensure | `ensure_display_orchestrator` | Re-arms timers + republishes sync payloads |
| Animation signal | `adAnimationRun` | Client-only; decoupled from media dedupe (FR-006) |
