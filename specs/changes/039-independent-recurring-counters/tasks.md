---
description: "Task list for CHG-039 independent recurring content counters"
---

# Tasks: Independent Recurring Content Counters

**Input**: Design documents from `/specs/changes/039-independent-recurring-counters/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/recurring-cadence-behavior.md`

**Tests**: Mandatory per TQ-002 — each user story includes automated test tasks.

**Organization**: Tasks grouped by user story (US1–US4). Contract update blocks implementation (Constitution IV).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Frontend: `frontend/src/app/display/`
- Contracts: `specs/contracts/content-rotation/contract.md`
- Change: `specs/changes/039-independent-recurring-counters/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Update active contract and manifest before code changes (TQ-001, TQ-003).

**⚠️ CRITICAL**: No implementation phases below until this phase is complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/039-independent-recurring-counters/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/recurring-cadence-behavior.md}`.
- [x] T002 Update `specs/contracts/content-rotation/contract.md`: replace shared single `cadenceCounter` recurring behavior with per-item counter rules from `specs/changes/039-independent-recurring-counters/contracts/recurring-cadence-behavior.md` (increment every transition, `counter >= N`, due resolution by `displayOrder`, filler queue, pause/jump_to/hot-reset semantics).
- [x] T003 Add `CHG-039` to `specs/manifest.yml`: (a) append `CHG-039` under `CONTENT.ROTATION.related_changes`; (b) add full `changes:` entry with `id: CHG-039`, `path: specs/changes/039-independent-recurring-counters/spec.md`, `status: in-progress`, `modifies: [CONTENT.ROTATION]`, `depends_on: []`, `consolidated_into: []`, `read_by_default: true`.
- [x] T004 Set `status: in-progress` in `specs/changes/039-independent-recurring-counters/spec.md` frontmatter.

---

## Phase 2: Foundational — Recurring cadence pure layer (blocking)

**Purpose**: Stateless cadence math shared by all user stories. Blocks controller integration.

**Independent Test**: `recurring-cadence.service.spec.ts` passes with increment, due (`>= N`), filler queue, prune, and cadence-change detection.

- [x] T005 Rewrite `frontend/src/app/display/recurring-cadence.service.ts`: replace single-counter API (`smallestRecurringCadence`, `pickRecurringItem`, `shouldFireRecurring`, `nextCounter`, `shouldResetOnEmptyRecurring`) with per-item helpers per `plan.md` — `regularQueue`, `fillerQueue`, `incrementCounters`, `dueItems`, `resetCounter`, `clearCounters`, `pruneCounters`, `cadenceChanges` (pure functions; no Angular state).
- [x] T006 Rewrite `frontend/src/app/display/recurring-cadence.service.spec.ts`: cover `incrementCounters` (+1 all ids), `dueItems` with `counter >= N` sorted by `displayOrder`, `fillerQueue` vs `regularQueue` exclusion, `pruneCounters` on removed ids, `cadenceChanges` detecting N changes; remove legacy `counter > N` / smallest-cadence-only tests. (Run after T005 — not parallel.)
- [x] T007 Run `npm --prefix frontend run test -- --include='**/recurring-cadence.service.spec.ts'`.

---

## Phase 3: User Story 1 — Predictable sponsor cadence per item (Priority: P1) 🎯 MVP

**Goal**: Each recurring item fires on its own N schedule; multiple items with different N do not block each other.

**Independent Test**: A (N=6) appears at transitions 6, 12, 18, 24, 30; B (N=30) appears on transition 31 after A when both due at 30.

- [x] T008 [US1] Replace `cadenceCounter: signal<number>` with `recurringCounters: signal<ReadonlyMap<string, number>>` in `frontend/src/app/display/kiosk-rotation.controller.ts`; grep repo for `cadenceCounter` and remove or migrate all references.
- [x] T009 [US1] Rewrite `_advanceContentRegular()` in `frontend/src/app/display/kiosk-rotation.controller.ts`: on each loop tick (not paused), increment all recurring counters via service; resolve due items (`>= N`, smallest `displayOrder` first); show one due item and reset only its counter without advancing `_regularCursorId`; when no due items and `regularQueue` non-empty advance regular queue; when no due items and `regularQueue` empty use `pickNext(fillerQueue, _fillerCursorId)` (include `_fillerCursorId` state in this task).
- [x] T010 [US1] Remove legacy recurring branch guard `regularQueue.length > 0` before increment so counters advance when only recurring items exist (filler path from T009 handles recurring-only queues).
- [x] T011 [P] [US1] Update `frontend/src/app/display/kiosk-rotation.controller.spec.ts`: replace `shows the recurring content every N advances` test for per-item N=6 cadence (`>= N` — appearances at transitions 6 and 12 over 12 transitions with regular queue).
- [x] T012 [P] [US1] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: A (N=6, `displayOrder` 10) and B (N=30, `displayOrder` 20) with regular R₁–R₃ — A at transitions 6,12,18,24,30; B on transition 31 immediately after A on transition 30.
- [x] T013 [P] [US1] Add `frontend/src/app/display/recurring-cadence.service.spec.ts` case: ten recurring items each with N=30 — assert each id's counter reaches 30 independently after 30 increments (SC-001 / US1 acceptance 3).
- [x] T014 [P] [US1] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: three recurring items (same N=6, distinct `displayOrder`) all due on one transition — appear on three consecutive transitions in order with no regular content between (US1 acceptance 4).
- [x] T015 [US1] Run `npm --prefix frontend run test -- --include='**/recurring-cadence.service.spec.ts' --include='**/kiosk-rotation.controller.spec.ts'`.

---

## Phase 4: User Story 2 — Recurring items delay normal rotation (Priority: P1)

**Goal**: Due recurring occupies a transition slot; regular cursor resumes on next non-due tick.

**Independent Test**: Bootstrap at A; X (N=3) on transitions 3 and 6; seven transitions show `B → C → X → A → B → X → C`.

- [x] T016 [US2] Verify due-item branch in `_advanceContentRegular()` in `frontend/src/app/display/kiosk-rotation.controller.ts` returns early without updating `_regularCursorId`.
- [x] T017 [P] [US2] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: regular A,B,C + X (N=3), bootstrap at A — X on transitions 3 and 6; after seven transitions screens are `B,C,X,A,B,X,C` (not legacy `counter > N` positions).
- [x] T018 [P] [US2] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: after showing due X, only X's counter resets to 0 while another recurring item's counter retains its post-increment value.

---

## Phase 5: User Story 3 — Recurring-only queue filler (Priority: P2)

**Goal**: When no regular content exists and no item is due, rotate recurring items by `displayOrder`; filler ticks increment counters.

**Independent Test**: Two recurring items only — filler alternation between due events; A fires at transition 6.

- [x] T019 [US3] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: recurring-only A (N=6) and B (N=30) — filler cycles by `displayOrder` before first due event; A fires at transition 6.
- [x] T020 [P] [US3] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` assertion: filler transitions increment both recurring counters.
- [x] T021 [P] [US3] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: inactive recurring item with N is excluded from filler rotation and counter increments (US4 acceptance 6).

---

## Phase 6: User Story 4 — Operator controls preserve counter state (Priority: P2)

**Goal**: Pause freezes counters; `jump_to` and hot cadence edits reset only affected item; novelty burst does not increment; mode transitions preserve counters.

**Independent Test**: Per `quickstart.md` US-4 — pause preserves counts; `jump_to` resets target only; polled N change resets that id only.

- [x] T022 [US4] Extend `bindInputs` queue effect in `frontend/src/app/display/kiosk-rotation.controller.ts`: track `lastRecurringCadenceById`, call `pruneCounters`, reset per-id on `cadenceChanges`, `clearCounters` when no recurring items remain (FR-010, FR-011).
- [x] T023 [US4] Update `applyNavigationCommand('jump_to')` in `frontend/src/app/display/kiosk-rotation.controller.ts`: reset only target recurring item's counter; non-recurring `jump_to` must not reset any recurring counters.
- [x] T024 [P] [US4] Update pause spec in `frontend/src/app/display/kiosk-rotation.controller.spec.ts`: assert `recurringCounters` map unchanged across pause/resume with mid-cycle values.
- [x] T025 [P] [US4] Update `jump_to` spec in `frontend/src/app/display/kiosk-rotation.controller.spec.ts`: recurring target resets only its counter; second recurring unchanged; add case for `jump_to` regular target leaving recurring counters intact.
- [x] T026 [P] [US4] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: polled queue update changing one item's `recurringEveryXIterations` resets only that id's counter.
- [x] T027 [P] [US4] Add or extend novelty burst spec in `frontend/src/app/display/kiosk-rotation.controller.spec.ts`: recurring counters unchanged across novelty slides; increment resumes after burst.
- [x] T028 [P] [US4] Add `frontend/src/app/display/kiosk-rotation.controller.spec.ts` case: non-zero counters preserved across loop → iframe → loop (and loop → fixed → loop) transitions (US4 acceptance 5).
- [x] T029 [US4] Remove or rewrite obsolete specs in `frontend/src/app/display/kiosk-rotation.controller.spec.ts` that assert shared `cadenceCounter`, `counter > N`, or smallest-cadence-only `pickRecurringItem` behavior.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Admin copy, full validation, close change.

- [x] T030 [P] Verify `frontend/src/app/features/content/content-form.component.ts` recurring hint text matches FR-012 (iterations = screen transitions); adjust `mat-hint` copy only if it still implies a shared/global counter.
- [x] T031 Run narrow tests from `specs/changes/039-independent-recurring-counters/context-pack.md` (`recurring-cadence.service.spec.ts`, `kiosk-rotation.controller.spec.ts`).
- [x] T032 Run `npm --prefix frontend run test` and `npm --prefix frontend run build`.
- [x] T033 Execute manual checklist in `specs/changes/039-independent-recurring-counters/quickstart.md` (independent cadences, filler, pause, jump_to, hot cadence).
- [x] T034 Set `status: implemented` in `specs/changes/039-independent-recurring-counters/spec.md` and update `specs/manifest.yml` CHG-039 status to `implemented`; record validation evidence in `specs/changes/039-independent-recurring-counters/checklists/requirements.md` notes.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T004) ──blocks──► Phase 2 (T005–T007)
                                      │
                                      ▼
                               Phase 3 US1 (T008–T015) 🎯 MVP
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              Phase 4 US2       Phase 5 US3       Phase 6 US4
              (T016–T018)       (T019–T021)       (T022–T029)
                    │                 │                 │
                    └─────────────────┴─────────────────┘
                                      ▼
                               Phase 7 (T030–T034)
```

### User story dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 | Phase 2 | T007 |
| US2 | US1 controller wiring | T009 |
| US3 | US1 filler in T009 | T009 |
| US4 | US1 counter map | T008 |

---

## Parallel Execution Examples

```text
After T009: T011 + T012 + T013 + T014 (spec files — batch in one session)
T017 + T018 [US2] — same spec file
T019 + T020 + T021 [US3] — same spec file
T024–T028 [US4] — same spec file after T022–T023
T030 parallel with T031 once implementation stable
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (contracts).
2. Complete Phase 2 (pure service).
3. Complete Phase 3 (counter map + advance/filler + US1 tests including T013–T014).
4. **STOP and validate**: narrow test command from T015.

### Incremental delivery

1. Phase 1 + 2 → foundation
2. US1 → MVP
3. US2 → normal-delay semantics (`>= N` ticks)
4. US3 → recurring-only tests
5. US4 → operator controls + mode preservation
6. Phase 7 → ship

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | T001–T004 (4) | — |
| 2 Foundational | T005–T007 (3) | — |
| 3 US1 | T008–T015 (8) | P1 🎯 |
| 4 US2 | T016–T018 (3) | P1 |
| 5 US3 | T019–T021 (3) | P2 |
| 6 US4 | T022–T029 (8) | P2 |
| 7 Polish | T030–T034 (5) | — |
| **Total** | **34 tasks** | |

### Independent test criteria

| Story | Independent test |
|-------|------------------|
| US1 | A every 6 ticks; B on tick 31; 10-item independence; 3-way due |
| US2 | X on ticks 3 and 6; `B,C,X,A,B,X,C` after 7 transitions |
| US3 | Recurring-only filler + due at N=6; inactive excluded |
| US4 | Pause freeze; jump_to scoped reset; hot N reset; mode preserve; novelty freeze |

---

## Notes

- No backend tasks — frontend-only per `research.md`.
- Filler branch is implemented in T009 (not deferred to US3) to avoid recurring-only regression between phases.
- T003 manifest entry may already be applied during analyze remediation; verify before duplicating.
- Legacy `cadenceCounter` public signal: removed in T008 after grep.
