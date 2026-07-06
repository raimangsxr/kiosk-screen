---
description: "Task list for CHG-029 production quick wins"
---

# Tasks: Production Quick Wins

**Input**: Design documents from `/specs/changes/029-production-quick-wins/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, affected active contracts

**Tests**: Mandatory per TQ-002 — each user story includes automated test tasks.

**Organization**: Tasks grouped by user story (US1–US5). Contract updates block implementation (Constitution IV).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Backend: `backend/`
- Frontend: `frontend/src/app/`
- Contracts: `specs/contracts/**/contract.md`
- Change: `specs/changes/029-production-quick-wins/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Update active contracts before code changes (TQ-001, FR/TQ traceability).

**⚠️ CRITICAL**: No implementation phases below until this phase is complete.

- [x] T001 Verify branch `029-production-quick-wins` and read `specs/changes/029-production-quick-wins/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md}`.
- [x] T002 [P] Update `specs/contracts/public-content-api-keys/contract.md`: document sole public upload path `POST /api/public/content/upload`; state v1 API router must not register a duplicate public upload route (FR-001).
- [x] T003 [P] Update `specs/contracts/display-runtime/contract.md`: document extended display fingerprint fields (`sourceReference`, `mediaFile.mediaUrl`, `effectiveDurationSeconds`, `selectedIframe.url`); document `rotationEventSink` wired to rotation-event API (FR-002, FR-004).
- [x] T004 [P] Update `specs/contracts/display-events-audit/contract.md`: kiosk client posts `content_rotation_empty` via `POST /api/display/rotation-event` when loop queue is empty (FR-004).
- [x] T005 [P] Update `specs/contracts/auth-rbac/contract.md`: client treats HTTP 401 and 403 on protected APIs as session expiry → clear session and redirect to login (FR-006).
- [x] T006 [P] Update `specs/contracts/ops-platform/contract.md`: root `.nvmrc` pins Node 24; README and release CI align (FR-008).
- [x] T007 Set `CHG-029` status to `in-progress` in `specs/changes/029-production-quick-wins/spec.md` and `specs/manifest.yml`.

---

## Phase 2: User Story 1 — Single public upload path (Priority: P1) 🎯 MVP

**Goal**: API-key clients use exactly one documented upload URL; duplicate v1 route removed.

**Independent Test**: `POST /api/public/content/upload` with valid key → 201; `POST /api/content/upload` with key only → not 201.

- [x] T008 [US1] Add integration test `backend/tests/integration/test_public_content_router_regression.py`: assert Bearer key upload succeeds on `/api/public/content/upload` and fails (401/404) on `/api/content/upload` without admin session.
- [x] T009 [US1] Remove `api_v1_router.include_router(public_content_router)` and unused import from `backend/app/api/v1/router.py`; keep mount in `backend/app/main.py` unchanged.
- [x] T010 [US1] Verify `docs/postman/kiosk-screen-public-content.postman_collection.json` targets `/api/public/content/upload` only; update collection URL if mismatched.
- [x] T011 [US1] Run `pytest backend/tests/integration/test_public_content_router_regression.py backend/tests/integration/test_public_content*.py -q`.

---

## Phase 3: User Story 2 — Media and iframe fingerprint (Priority: P1)

**Goal**: Kiosk detects media/iframe URL changes on unchanged ids; rotation timers preserved when remote-control fingerprint unchanged.

**Independent Test**: `sameTopContentState` returns false when only `sourceReference` or `mediaUrl` changes; controller preserves timer on media-only poll.

- [x] T012 [P] [US2] Add cases to `frontend/src/app/display/display-fingerprint.spec.ts`: same id + different `sourceReference` → false; same id + different `mediaFile.mediaUrl` → false; same id + different `effectiveDurationSeconds` → false; unchanged material fields → true.
- [x] T013 [US2] Extend `sameTopContentState()` in `frontend/src/app/display/display-fingerprint.ts` with `sourceReference`, `mediaFile?.mediaUrl`, and `effectiveDurationSeconds` (fallback `durationSeconds`) per `data-model.md`.
- [x] T014 [US2] Extend `equalByDisplayFingerprint()` in `frontend/src/app/core/api/display.api.ts` to compare `selectedIframe?.url` in addition to `selectedIframe?.id`.
- [x] T015 [US2] Extend `_queueItemFingerprint()` in `frontend/src/app/display/kiosk-rotation.controller.ts` to include the same material fields as `sameTopContentState` for timer-preservation logic.
- [x] T016 [US2] Add controller spec in `frontend/src/app/display/kiosk-rotation.controller.spec.ts`: media-only queue change on current item preserves content timer when remote-control fields unchanged (FR-003).
- [x] T017 [US2] Add display-screen spec in `frontend/src/app/display/display-screen.component.spec.ts`: poll with same id but new `mediaFile.mediaUrl` updates rendered media without full reload mock.
- [x] T018 [US2] Run `npm --prefix frontend run test -- --include='**/display-fingerprint.spec.ts' --include='**/kiosk-rotation.controller.spec.ts'`.

---

## Phase 4: User Story 3 — Empty queue audit (Priority: P2)

**Goal**: `content_rotation_empty` persisted when rotation engine detects empty loop queue.

**Independent Test**: Empty queue triggers sink → `POST /api/display/rotation-event` with correct payload (mocked HTTP).

- [x] T019 [US3] Add `postRotationEvent(eventType, payload)` to `frontend/src/app/core/api/display.api.ts` calling `POST /api/display/rotation-event` with `withCredentials: true`.
- [x] T020 [US3] Wire `kioskRotation.rotationEventSink` in `frontend/src/app/display/display-screen.component.ts` during controller setup to call `DisplayApiService.postRotationEvent('content_rotation_empty', payload)` (fire-and-forget subscribe).
- [x] T021 [US3] Add spec in `frontend/src/app/display/display-screen.component.spec.ts` or extend `kiosk-rotation.controller.spec.ts`: empty queue invokes sink once per debounce window (mock API service).
- [x] T022 [US3] Run narrow frontend display tests covering rotation empty path.

---

## Phase 5: User Story 4 — Kiosk and admin shell fixes (Priority: P2)

**Goal**: Logo recovers after URL fix; 403 clears session; admin shell unsubscribes on destroy.

**Independent Test**: Per `quickstart.md` US-4 scenarios; interceptor and shell specs pass.

- [x] T023 [P] [US4] Add `effect()` in `frontend/src/app/display/display-screen.component.ts` to reset `hiddenLogoUrl` to `null` when `brandingViewModel().organizerLogoUrl` changes (FR-005).
- [x] T024 [P] [US4] Extend `frontend/src/app/core/auth/auth-expired.interceptor.ts` to handle `error.status === 403` like 401 (skip login URL); add or extend `frontend/src/app/core/auth/auth-expired.interceptor.spec.ts`.
- [x] T025 [P] [US4] Refactor `frontend/src/app/features/admin-shell/admin-shell.component.ts` router `events` subscription to use `takeUntilDestroyed(inject(DestroyRef))` (FR-007).
- [x] T026 [US4] Add branding spec case in `frontend/src/app/display/display-screen.component.spec.ts` or `kiosk-branding-overlay.component.spec.ts`: after `hiddenLogoUrl` set, new logo URL shows image.
- [x] T027 [US4] Run `npm --prefix frontend run test -- --include='**/auth-expired*' --include='**/admin-shell*'`.

---

## Phase 6: User Story 5 — Node version pin (Priority: P3)

**Goal**: `.nvmrc`, README, and CI agree on Node 24.

**Independent Test**: `cat .nvmrc` → `24`; README documents Node 24.

- [x] T028 [P] [US5] Create root `.nvmrc` with content `24`.
- [x] T029 [P] [US5] Update Node prerequisite in `README.md` to Node 24 (replace 22.14.0 reference); mention `nvm use` from repo root.
- [x] T030 [US5] Confirm `.github/workflows/release-images.yml` `node-version: "24"` matches `.nvmrc`; add comment in workflow only if clarification needed (no version change if already 24).

---

## Phase 7: Validation & Consolidation

**Purpose**: Full suite green; change ready to merge; unblock CHG-030.

- [x] T031 Run narrow tests from `specs/changes/029-production-quick-wins/context-pack.md` (fingerprint, display-screen, public content integration).
- [x] T032 Run `pytest backend/tests` and `npm --prefix frontend run test` and `npm --prefix frontend run build`.
- [x] T033 Execute manual checklist in `specs/changes/029-production-quick-wins/quickstart.md` (curl public path, empty-queue audit spot-check).
- [x] T034 Mark `CHG-029` as `implemented` in `specs/changes/029-production-quick-wins/spec.md` and `specs/manifest.yml`; record validation evidence in `checklists/requirements.md` notes.
- [x] T035 Consolidate accepted behavior into active contracts if any drift found during implementation; set change status `consolidated` when accepted.

---

## Dependencies & Execution Order

```text
Phase 1 (contracts) → blocks all implementation
Phase 2 (US1) ──────────────────────────────┐
Phase 3 (US2) ─── depends on contracts only  ├─ can run US1→US2→US3 sequentially
Phase 4 (US3) ─── depends on US2 optional    │   US4/US5 parallel after US2
Phase 5 (US4) ─── independent of US1/US3     │
Phase 6 (US5) ─── independent                ┘
Phase 7 → after all user stories
```

| Story | Depends on | Blocks |
|-------|------------|--------|
| US1 | Phase 1 | — |
| US2 | Phase 1 | CHG-030 (recommended) |
| US3 | Phase 1 | — |
| US4 | Phase 1 | — |
| US5 | Phase 1 | CHG-034 (recommended) |

---

## Parallel Execution Examples

**After Phase 1 completes:**

```text
# Backend-only (US1)
T008 → T009 → T011

# Frontend fingerprint (US2) — parallel test write
T012 ∥ T013 (different files after T012 tests may need T013 first - actually T012 tests first then T013 impl - sequential within US2)

# US4 subtasks in parallel
T023 ∥ T024 ∥ T025

# US5 in parallel
T028 ∥ T029
```

**Full parallel tracks (2 devs):**

- Dev A: Phase 2 (US1) → Phase 4 (US3)
- Dev B: Phase 3 (US2) → Phase 5 (US4) → Phase 6 (US5)

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (contracts)
2. Complete Phase 2 (US1): router fix + regression test
3. **STOP and VALIDATE**: public upload path tests green
4. Deploy/demo if needed before fingerprint work

### Incremental Delivery

1. Phase 1 → contracts
2. US1 → public API safety
3. US2 → kiosk media freshness (highest user-visible impact)
4. US3 → audit completeness
5. US4 + US5 → polish and toolchain
6. Phase 7 → merge

### Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | T001–T007 | — |
| 2 US1 | T008–T011 | Public upload |
| 3 US2 | T012–T018 | Fingerprint |
| 4 US3 | T019–T022 | Audit |
| 5 US4 | T023–T027 | UX fixes |
| 6 US5 | T028–T030 | Node pin |
| 7 Validation | T031–T035 | — |
| **Total** | **35 tasks** | |

---

## Notes

- Do not integrate `DisplayPollingService` (CHG-030 scope).
- Do not change session persistence (CHG-031 scope).
- Contract files must be updated in Phase 1 before merging implementation PRs.
- If `test_public_content_router_regression.py` name collides, use adjacent naming in `backend/tests/integration/`.
