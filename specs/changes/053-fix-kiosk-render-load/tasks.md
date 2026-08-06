# Tasks: CHG-053 kiosk render load

**Input**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/contract-deltas.md`, `quickstart.md`  
**Tests**: Required and written before implementation. Manual performance gates remain explicit.

## Phase 1: SDD Governance & Context

- [x] T001 Read `specs/manifest.yml`, `specs/contracts/display-runtime/contract.md`, and `specs/changes/053-fix-kiosk-render-load/context-pack.md`
- [x] T002 Create CHG-053 `spec.md`, clarification outcome, requirements/performance checklists, and register `.specify/feature.json`
- [x] T003 Update `specs/contracts/display-runtime/contract.md` before implementation with CHG-053 runtime bounds
- [x] T004 Update `specs/manifest.yml` with CHG-053 status and `DISPLAY.RUNTIME` relationship
- [x] T005 Amend `docs/adr/0007-top-content-blur-fill.md` with the single-original backdrop decision
- [x] T006 Create `plan.md`, `research.md`, `data-model.md`, `contracts/contract-deltas.md`, and `quickstart.md`; update the active-plan marker in `AGENTS.md`

## Phase 2: User Story 1 — Rotación fotográfica fluida (P1)

**Independent test**: One original photo element plus a derived backdrop div, no persistent CSS filter, bounded 320 px capture, and reduced-motion animation suppression.

- [x] T007 [US1] Update `frontend/src/app/display/display-screen.component.spec.ts` to require one original photo element, a CSS backdrop div, baked backdrop capture, and cleanup on content change
- [x] T008 [US1] Run the focused component spec and record the expected pre-implementation failures
- [x] T009 [US1] Replace dual-photo rendering with shared bounded photo/video backdrop capture in `frontend/src/app/display/display-screen.component.ts`
- [x] T010 [US1] Remove continuous backdrop filters and suppress non-essential animations under reduced motion in `frontend/src/app/display/display-screen.component.css`
- [x] T011 [US1] Re-run `frontend/src/app/display/display-screen.component.spec.ts`

## Phase 3: User Story 2 — Precarga realmente acotada (P1)

**Independent test**: Ten candidates retain/warm only the first; a removed in-flight completion and a post-teardown completion are revoked; failed probes release temporary URLs.

- [x] T012 [P] [US2] Extend `frontend/src/app/display/display-viewer.controller.spec.ts` for one-candidate preload storage
- [x] T013 [P] [US2] Extend `frontend/src/app/display/display-media-cache.service.spec.ts` for queue pruning, late completion, failed probe cleanup, and lifecycle generation
- [x] T014 [US2] Run the focused viewer/cache specs and record the expected pre-implementation failures
- [x] T015 [US2] Limit `DisplayViewerController.applyPreload()` to one URL in `frontend/src/app/display/display-viewer.controller.ts`
- [x] T016 [US2] Enforce retained-only queue and asynchronous completion lifecycle in `frontend/src/app/display/display-media-cache.service.ts`
- [x] T017 [US2] Bound snapshot/preload warming and retain pending gate media in `frontend/src/app/display/display-screen.component.ts`
- [x] T018 [US2] Re-run the focused viewer/cache specs

## Phase 4: User Story 3 — Trabajo reactivo y patrocinadores (P2)

**Independent test**: Command-ID-only sponsor changes do not restart animation; command handlers do not replay from viewer mutations; fallback starts after reactive activation and stops on SSE recovery.

- [x] T019 [P] [US3] Update `frontend/src/app/display/display-viewer.controller.spec.ts` for visible-window sponsor equivalence and real presentation changes
- [x] T020 [P] [US3] Add component lifecycle tests in `frontend/src/app/display/display-screen.component.spec.ts` for reactive activation, one-shot fallback start/stop, and command effect isolation
- [x] T021 [US3] Remove command identity from the visible sponsor fingerprint in `frontend/src/app/display/display-viewer.controller.ts`
- [x] T022 [US3] Convert activation/fallback fields to signals and isolate SSE command application with `untracked()` in `frontend/src/app/display/display-screen.component.ts`
- [x] T023 [US3] Re-run focused component/viewer specs

## Phase 5: Validation & Consolidation

- [x] T024 Run all three focused specs from `quickstart.md`
- [x] T025 Run `npm --prefix frontend run test`
- [x] T026 Run `npm --prefix frontend run build`
- [x] T027 Inspect the production bundle/runtime structure for one original photo, filter-free derived backdrop, and visible-plus-one preload bound
- [ ] T028 Execute and record the 10-minute Production-equivalent profile against version 1.9.0 (manual; requires representative browser/hardware measurements)
- [ ] T029 Execute and record the multi-hour release soak (manual release gate; do not complete from automated evidence)
- [x] T030 Reconcile `spec.md`, `context-pack.md`, `DISPLAY.RUNTIME`, `specs/manifest.yml`, and validation evidence; keep status `in-progress` until representative runtime evidence is recorded

## Dependencies & Execution Order

- Phase 1 blocks source implementation and is complete.
- T007/T012/T013/T019/T020 precede their matching implementation tasks.
- US1 and US2 are both P1; US3 depends on the same component but is behaviorally separable.
- T024 precedes the full suite; T025 precedes the production build.
- T028 and T029 are manual evidence gates and remain unchecked unless actually performed.

## Parallel Opportunities

- T012 and T013 touch separate focused spec files.
- T019 and T020 touch separate focused spec files.
- No backend work is required because CHG-053 changes no protocol or persistence contract.
