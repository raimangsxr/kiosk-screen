# Tasks: Priorizar novedades descargadas

**Input**: Design documents from `specs/changes/058-prioritize-ready-novelties/`
**Tests**: Automated tests are required by TQ-002.

## Phase 1: Setup

- [x] T001 Verify CHG-058 manifest registration and active-plan pointer in `specs/manifest.yml` and `AGENTS.md`
- [x] T002 Verify the observable behavior update is present before implementation in `specs/contracts/content-rotation/contract.md`

## Phase 2: Foundational

- [x] T003 Review ordering invariants and decision precedence in `specs/changes/058-prioritize-ready-novelties/data-model.md` and `specs/changes/058-prioritize-ready-novelties/contracts/rotation-order.md`

## Phase 3: User Story 1 — Ready novelty burst (P1)

**Goal**: Emit every consecutive ready FIFO novelty before the preserved next regular item.

**Independent Test**: From regular 1 with ready novelties 6–8, the emitted sequence is `6,7,8,2,3` and the regular cursor remains correct.

- [x] T004 [US1] Add failing burst, single-novelty, and regular-cursor assertions in `backend/tests/unit/test_novelty_defer_advance.py`
- [x] T005 [P] [US1] Add failing planned-next assertions for a ready novelty ahead of a preserved regular in `backend/tests/unit/test_rotation_plan_snapshot.py`
- [x] T006 [US1] Reorder ready-novelty and preserved-regular decisions while retaining the regular slot across the burst in `backend/app/application/display_orchestrator/rotation_logic.py`
- [x] T007 [US1] Mirror execution precedence in the non-mutating planner in `backend/app/application/display_orchestrator/rotation_plan.py`

## Phase 4: User Story 2 — Incomplete novelty tolerance (P1)

**Goal**: Preserve FIFO blocking, defer/discard limits, and regular progress when the novelty head is not ready.

**Independent Test**: With novelty 6 not ready and novelty 7 ready, regular 2 emits, 6 is deferred, and 7 remains behind it.

- [x] T008 [US2] Add regression coverage for not-ready FIFO head plus ready follower and preserved regular behavior in `backend/tests/unit/test_novelty_defer_advance.py`
- [x] T009 [US2] Run and fix narrow defer/planner regressions in `backend/tests/unit/test_novelty_defer_advance.py` and `backend/tests/unit/test_rotation_plan_snapshot.py`

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T010 Run the backend unit or full backend suite and record validation in `specs/changes/058-prioritize-ready-novelties/quickstart.md`
- [x] T011 Mark CHG-058 implemented and synchronize change relationships in `specs/changes/058-prioritize-ready-novelties/spec.md` and `specs/manifest.yml`

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 → Polish.
- T004 and T005 may be prepared in parallel; T006 and T007 follow their corresponding failing tests.
- US2 depends on US1 because it validates the fallback path after the reordered priority decision.

## Implementation Strategy

1. Establish the failing `1,6,7,8,2,3` test.
2. Apply the smallest ordering change in execution and planner.
3. Lock down blocked-head and defer regressions.
4. Run narrow tests before broader backend validation.
