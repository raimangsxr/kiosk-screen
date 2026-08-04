# Context pack: CHG-050 novelty media preload

## Read first

1. `specs/contracts/content-rotation/contract.md` — preload SSE, media_error advance
2. `specs/contracts/display-runtime/contract.md` — media gate, cache, novelty indicator
3. `specs/changes/050-novelty-media-preload/spec.md`
4. `specs/changes/050-novelty-media-preload/plan.md`
5. `backend/app/application/display_orchestrator/preload.py` (new)
6. `backend/app/application/display_orchestrator/{rotation_logic,hooks,snapshot_builder,service}.py`
7. `frontend/src/app/display/{display-media-cache,display-content-gate,novelty-queue-tracker,novelty-queue-indicator}.*`
8. `frontend/src/app/display/display-screen.component.ts`

## Do not read by default

- `specs/archive/**`
- Unrelated change specs unless touching shared rotation_plan

## Current gap (pre-implementation)

- `emit_preload` only on regular advance; no novelty preload on enqueue.
- `handle_media_error` does not advance rotation.
- No display content gate; remote URL fallback causes black frames.
- No novelty queue indicator overlay.

## Intended direction

1. Preload on novelty enqueue + next regular after each emit (loop only).
2. Gate: latest wins, commit when ready (`GATE_TIMEOUT_MS = 30_000`).
3. `media_error` → global advance.
4. Indicator: icons, check/error, 5+N; sync from latest preload + snapshot.
5. FR-009: no warm/gate/indicator in pause/fixed/iframe.

## Contract touchpoints

- `CONTENT.ROTATION` + `DISPLAY.RUNTIME` — updated in analyze remediation (CHG-050).

## Tests

- `backend/tests/unit/test_preload_items.py`
- `backend/tests/unit/test_media_error_advance.py`
- `backend/tests/integration/test_display_preload_sse.py`
- `backend/tests/integration/test_display_media_error_multi_kiosk.py`
- `frontend/src/app/display/display-content-gate.service.spec.ts`
- `frontend/src/app/display/novelty-queue-tracker.service.spec.ts`
