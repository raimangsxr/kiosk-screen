# Context pack: CHG-056 novelty defer rotation

## Read first

1. `specs/contracts/content-rotation/contract.md` — orchestrator novelty queue, preload, advance
2. `specs/contracts/display-runtime/contract.md` — media gate, novelty indicator, cache
3. `specs/contracts/display-config-session/contract.md` — `/admin/configuration` fields
4. `specs/contracts/content-ads-admin/contract.md` — `isNovelty` admin semantics
5. `specs/changes/056-novelty-defer-rotation/spec.md` + clarifications session 2026-08-07
6. `specs/changes/056-novelty-defer-rotation/plan.md` + `tasks.md`
7. `backend/app/application/display_orchestrator/{rotation_logic,rotation_plan,preload,novelty_defer,service,snapshot_builder,sse_hub}.py`
8. `backend/app/api/display_stream.py` — kiosk events (`novelty_preload_ready`)
9. `frontend/src/app/display/{display-content-gate,novelty-preload-ready,novelty-queue-tracker,display-screen,display-media-cache}.*`
10. `frontend/src/app/features/display-config/*`

## Do not read by default

- `specs/archive/**`
- CHG-050 tasks/plan unless tracing preload/gate history or T048 regression
- Unrelated change specs

## Current gap (pre-implementation)

- `advance_loop_top` always emits head novelty at boundary and `consume_novelty` immediately.
- Client `DisplayContentGateService` holds slide for **all** loop content including novelties → rotation freeze on slow download.
- No server-side defer counter, rescheduled regular slot, or kiosk preload-ready aggregation.
- No `novelty_max_defer_transitions` configuration field.
- `media_error` from novelty gate timeout can skip novelty instead of deferring.

## Intended direction

1. Server owns defer/emission decisions; rotation continues with regular items while novelty downloads.
2. Kiosks report `novelty_preload_ready` when local cache ready; server marks novelty eligible when **all connected** kiosks report.
3. Orchestrator Redis state: per-novelty defer counts + `rescheduledRegularContentId`.
4. Discard after max defer → `consume_novelty` without `show_content` (admin flag cleared).
5. Client: bypass gate for `reason === 'novelty'`; keep gate for regular content; apply `noveltyMaxDeferTransitions` from `config_updated`.
6. Admin: new int field on configuration (default 3, range 1–10).
7. FR-010: defer/ready inactive in pause, fixed, iframe (backend + frontend tests).
8. ADR: no new file — see `research.md` §ADR decision.

## Contract touchpoints

- `CONTENT.ROTATION` — defer logic, ready aggregation, snapshot extensions
- `DISPLAY.RUNTIME` — gate bypass for novelties, ready event posting, indicator sync, config_updated
- `DISPLAY.CONFIG_SESSION` — `noveltyMaxDeferTransitions` field + propagation
- `CONTENT.ADS.ADMIN` — discard consumes `isNovelty`

## Tests (full matrix — sync with tasks.md)

### New

- `backend/tests/unit/test_novelty_defer_advance.py` — defer, emit, reschedule, priority-over-discard, SC-005, multi-novelty FIFO
- `backend/tests/unit/test_novelty_preload_ready.py` — ready aggregation, disconnect
- `backend/tests/unit/test_novelty_defer_inactive_modes.py` — FR-010 pause/fixed/iframe
- `backend/tests/integration/test_display_novelty_defer_sse.py` — defer SSE flow, FR-001 preload regression, multi-kiosk (or split file)
- `backend/tests/integration/test_novelty_defer_admin_discard.py` — optional split; admin `isNovelty` cleared after discard

### Updated (CHG-050 regression — T048)

- `backend/tests/integration/test_display_media_error_multi_kiosk.py`
- `frontend/src/app/display/display-content-gate.service.spec.ts`
- `frontend/src/app/display/display-screen.component.spec.ts`

### Frontend

- `frontend/src/app/display/novelty-preload-ready.service.spec.ts` — ready POST + FR-010 guards
- `frontend/src/app/display/novelty-queue-tracker.service.spec.ts` — defer metadata, reconnect
- `frontend/src/app/features/display-config/display-config.component.spec.ts`
- `frontend/src/app/display/display-screen.component.spec.ts` — `config_updated` SC-004, reconnect FR-012a

### Manual

- `specs/changes/056-novelty-defer-rotation/quickstart.md` §1–5
- Evidence table: `checklists/requirements.md` §Success Criteria Validation

## Terminology

| Layer | Field |
|-------|-------|
| DB | `novelty_max_defer_transitions` |
| API | `noveltyMaxDeferTransitions` |
| Snapshot | `deferCount`, `maxDefer`, `downloadReady` |

See also `contracts/contract-deltas.md` terminology table.
