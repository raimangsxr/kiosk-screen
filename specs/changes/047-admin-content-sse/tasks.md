---
description: "Task list for CHG-047 admin content list SSE"
---

# Tasks: Admin Content List Live Updates (SSE)

**Input**: Design documents from `/specs/changes/047-admin-content-sse/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/admin-content-stream.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — backend hub unit tests, integration stream tests, `admin-content-stream.service.spec.ts`, extended `content-list.component.spec.ts`, and manual `quickstart.md` (SC-001–SC-005).

**Organization**: SDD governance → foundational backend SSE → US4 refresh quick win → US1+US2 live sync (P1) → US3 novelty consume → US4 resilience → polish & validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Admin SSE hub: `backend/app/application/admin_content/`
- Stream route: `backend/app/api/content_stream.py`
- Frontend stream: `frontend/src/app/features/content/admin-content-stream.service.ts`
- Content list: `frontend/src/app/features/content/content-list.component.ts`
- Contract: `specs/contracts/content-ads-admin/contract.md`
- Change: `specs/changes/047-admin-content-sse/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T004 complete.

- [X] T001 Read `specs/manifest.yml` and `specs/changes/047-admin-content-sse/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/admin-content-stream.md,contracts/contract-deltas.md}`.
- [X] T002 Merge CONTENT.ADS.ADMIN section from `specs/changes/047-admin-content-sse/contracts/contract-deltas.md` into `specs/contracts/content-ads-admin/contract.md` (SSE stream, live list, coalesce, stale indicator, refresh button).
- [X] T003 Add CHG-047 entry `status: in-progress` to `specs/manifest.yml` under `changes:` and `content-ads-admin.related_changes`.
- [X] T004 Set `status: in-progress` in `specs/changes/047-admin-content-sse/spec.md` frontmatter.

**Note**: No new ADR — reuse ADR-0009 per `research.md` R8.

**Checkpoint**: Contract and manifest updated; implementation may begin.

---

## Phase 2: Foundational Backend SSE (blocking for US1–US3)

**Purpose**: Hub, publish hook, stream endpoint, app startup.

**⚠️ CRITICAL**: Complete before Phase 4 (live sync).

- [X] T005 [P] Implement `AdminContentSseHub` with local subscribers, Redis Pub/Sub channel `pubsub:org:{orgId}:admin-content`, and `content_inventory_changed` envelope in `backend/app/application/admin_content/sse_hub.py` (mirror `display_orchestrator/sse_hub.py` patterns).
- [X] T006 [P] Implement `notify_admin_content_inventory_changed(organization_id, *, reason)` in `backend/app/application/admin_content/hooks.py`.
- [X] T007 Extend `notify_content_mutated` in `backend/app/application/display_orchestrator/hooks.py` to call `notify_admin_content_inventory_changed` with `reason="mutation"`.
- [X] T008 Implement `GET /admin/content/stream` (`StreamingResponse`, `CONTENT_MANAGEMENT_ROLES`, org-scoped fan-out, ping comments) in `backend/app/api/content_stream.py`.
- [X] T009 Register `content_stream` router in `backend/app/api/v1/router.py` and start hub via `get_admin_content_sse_hub().start()` in `backend/app/main.py` (alongside display hub).
- [X] T010 [P] Add unit tests in `backend/tests/unit/test_admin_content_sse_hub.py` for subscribe/publish, org isolation, and Redis fan-out (mock Redis).

**Checkpoint**: Stream endpoint returns SSE; mutations publish `content_inventory_changed`.

---

## Phase 3: User Story 4 — Manual Refresh Quick Win (P2) 🎯 Early deliverable

**Goal**: Wire **Actualizar** to reload list without waiting for SSE (FR-006, SC-004).

**Independent test**: Click **Actualizar** on `/admin/content`; network shows `GET /api/content`; list updates.

- [X] T011 [US4] Bind `(refresh)="onRefresh()"` on `app-admin-list` and implement `onRefresh()` calling `this.facade.refresh().subscribe()` in `frontend/src/app/features/content/content-list.component.ts`.
- [X] T012 [P] [US4] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: clicking `[data-testid="admin-list-refresh"]` triggers facade refresh.

**Checkpoint**: Manual refresh works independently of SSE.

---

## Phase 4: User Story 1 + 2 — Live Inventory Sync (P1) 🎯 MVP

**Goal**: Operators see public uploads (US1) and peer edits (US2) within ~3 s without page reload.

**Independent test**: Two browsers on `/admin/content`; change in B appears in A &lt;3 s; public upload shows novelty row in A.

**Requires Phase 2**.

- [X] T013 [P] Add integration tests in `backend/tests/integration/test_admin_content_stream.py`: (a) authenticated stream receives `content_inventory_changed` after admin `POST /api/content`; (b) same after public `POST /api/v1/public/content` with API key (US1/G1); (c) `403` for authenticated user without `CONTENT_MANAGEMENT_ROLES`; (d) `401` when unauthenticated.
- [X] T014 [US1] [US2] Create `AdminContentStreamService` with `EventSource` (`withCredentials: true`), connect/disconnect API, and 1 s debounced `inventoryChanged$` output in `frontend/src/app/features/content/admin-content-stream.service.ts`.
- [X] T015 [US1] [US2] Start stream in `ngOnInit` and `stop()` in `ngOnDestroy` from `frontend/src/app/features/content/content-list.component.ts` (FR-011 page-scoped lifecycle); initial load uses standard `facade.refresh()`.
- [X] T016 [P] [US1] [US2] Add `refresh({ silent?: boolean })` to `frontend/src/app/features/content/content.facade.ts`: when `silent: true`, skip `loadingState` toggle (FR-016); skip silent refresh while `saving()` is true (U4).
- [X] T017 [US1] [US2] Subscribe to debounced stream events and call `this.facade.refresh({ silent: true }).subscribe()` in `frontend/src/app/features/content/content-list.component.ts` (FR-013 silent sync).
- [X] T018 [US1] [US2] Preserve `pageIndex`, `pageSize`, `noveltyFilterOnly`, and prune `selection` for deleted ids after remote refresh in `frontend/src/app/features/content/content-list.component.ts` (FR-004, FR-005).
- [X] T019 [P] [US1] [US2] Add `frontend/src/app/features/content/admin-content-stream.service.spec.ts`: debounce coalesces multiple events within 1 s into one emission; disconnect on `stop()`.
- [X] T020 [P] [US1] [US2] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: simulated stream event triggers silent facade refresh, updates visible rows, and does **not** show `[data-testid="admin-list-skeleton"]` (I2).
- [X] T021 [P] [US1] [US2] Extend `frontend/src/app/features/content/content.facade.spec.ts`: `refresh({ silent: true })` does not set `loading`; skipped while `saving()` is true.

**Checkpoint**: US1 and US2 independently testable (two-browser + public upload scenarios in `quickstart.md` §1–2).

---

## Phase 5: User Story 3 — Kiosk Novelty Consume (P2)

**Goal**: Admin list reflects `isNovelty` cleared when kiosk consumes upload (FR-009).

**Independent test**: Public upload → **Solo novedades** → kiosk shows item → badge clears in admin &lt;5 s.

**Requires Phase 4**.

- [X] T022 [US3] Call `notify_admin_content_inventory_changed(organization_id, reason="novelty_consumed")` after novelty DB update in `backend/app/application/display_orchestrator/rotation_logic.py`.
- [X] T023 [P] [US3] Extend `backend/tests/integration/test_admin_content_stream.py`: orchestrator novelty consume emits `content_inventory_changed` with `reason=novelty_consumed`.
- [ ] T024 [US3] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: remote silent refresh clears novelty chip / filtered empty state when `isNovelty` becomes false.

**Checkpoint**: US3 independently testable per `quickstart.md` §3.

---

## Phase 6: User Story 4 — Connection Resilience (P2)

**Goal**: Auto-reconnect, auth failure handling, 30 s stale indicator (FR-007, FR-014, US4.2–4.4).

**Independent test**: Offline 35 s → hint «Los datos pueden estar desactualizados»; restore network → sync without full reload; expired session → login.

**Requires Phase 4**.

- [X] T025 [US4] Implement auto-reconnect and reconnect reconcile (`refresh({ silent: true })` on `EventSource` open) in `frontend/src/app/features/content/admin-content-stream.service.ts`.
- [X] T026 [US4] On fatal `401`/`403`, close stream and delegate to existing auth redirect in `frontend/src/app/features/content/admin-content-stream.service.ts`.
- [X] T027 [US4] Add `streamStale` signal (true after 30 s disconnected) and render «Los datos pueden estar desactualizados» below the action bar with `data-testid="content-stream-stale-hint"` in `frontend/src/app/features/content/content-list.component.ts` template/styles (FR-014, U1).
- [X] T028 [P] [US4] Extend `frontend/src/app/features/content/admin-content-stream.service.spec.ts`: reconnect after error; auth failure closes stream.
- [ ] T029 [P] [US4] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: `[data-testid="content-stream-stale-hint"]` appears after 30 s simulated disconnect.

**Checkpoint**: US4 fully testable per `quickstart.md` §4, §6.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Drag defer, burst regression, navigation remount, validation.

- [X] T030 Defer remote refresh while `cdkDrag` is active; flush on `cdkDragEnded` in `frontend/src/app/features/content/content-list.component.ts` and `frontend/src/app/features/content/admin-content-stream.service.ts` (FR-015).
- [ ] T031 [P] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: no DOM row swap during active drag; silent refresh runs after drop.
- [X] T032 [P] Add automated burst coalesce test in `frontend/src/app/features/content/admin-content-stream.service.spec.ts`: 5 events within 200 ms emit one `inventoryChanged$` (FR-012, U2).
- [ ] T033 [P] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: remount after simulated navigation away/back calls `refresh()` and stream `start()` (U3 edge case).
- [X] T034 Run narrow tests: `pytest backend/tests/unit/test_admin_content_sse_hub.py backend/tests/integration/test_admin_content_stream.py` and `npm --prefix frontend run test -- --include='**/admin-content-stream*' --include='**/content-list*' --include='**/content.facade*'`.
- [X] T035 Run broader validation: `pytest backend/tests` and `npm --prefix frontend run build` per `AGENTS.md`.
- [ ] T036 Execute manual scenarios in `specs/changes/047-admin-content-sse/quickstart.md` and record results in `specs/changes/047-admin-content-sse/checklists/requirements.md` notes.

---

## Phase 8: Consolidation

- [X] T037 Mark CHG-047 `status: implemented` in `specs/changes/047-admin-content-sse/spec.md` and `specs/manifest.yml`.
- [X] T038 Update `AGENTS.md` SPECKIT markers to reflect CHG-047 implemented / no active plan.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T004)
    ↓
Phase 2 (T005–T010) ─────────────────────────────┐
    ↓                                            │
Phase 3 US4 refresh (T011–T012) — parallel OK    │
    ↓                                            │
Phase 4 US1+US2 (T013–T021) ← requires Phase 2   │
    ↓                                            │
Phase 5 US3 (T022–T024)                          │
    ↓                                            │
Phase 6 US4 resilience (T025–T029)               │
    ↓                                            │
Phase 7 Polish (T030–T036)                       │
    ↓                                            │
Phase 8 Consolidation (T037–T038)                │
```

### User story dependencies

| Story | Depends on | Independently testable after |
|-------|------------|------------------------------|
| US4 (refresh only) | Phase 1 | T012 |
| US1 + US2 | Phase 2 + Phase 4 | T021 |
| US3 | Phase 4 + T022 | T024 |
| US4 (full) | Phase 4 | T029 |

---

## Parallel Execution Examples

### After Phase 2 completes

```text
Parallel: T010 (hub unit tests) + T011–T012 (US4 refresh UI) — different layers
```

### Phase 4

```text
Parallel: T013 (integration tests) + T014 (stream service scaffold)
Then: T015–T018 (list + facade wiring) sequential
Parallel: T019 + T020 + T021 (spec files) after T016–T017
```

### Phase 6

```text
Parallel: T028 + T029 (spec files) while T025–T027 land in service/component
```

---

## Implementation Strategy

### MVP (minimum shippable)

1. Complete Phase 1–2 (backend stream + publish).
2. Complete Phase 4 (US1+US2 live sync).
3. Validate with `quickstart.md` §1–2.

Delivers core operator value: public uploads and multi-operator sync.

### Incremental delivery

1. Phase 3 — **Actualizar** fix (immediate UX win, no SSE).
2. Phase 4 — live sync (MVP).
3. Phase 5 — novelty consume visibility.
4. Phase 6 — resilience + stale indicator.
5. Phase 7–8 — drag defer, burst checks, consolidation.

---

## Task Summary

| Metric | Count |
|--------|------:|
| **Total tasks** | **38** |
| Phase 1 (governance) | 4 |
| Phase 2 (foundational) | 6 |
| US4 refresh quick win | 2 |
| US1 + US2 (shared) | 8 |
| US3 | 3 |
| US4 resilience | 5 |
| Polish & validation | 7 |
| Consolidation | 2 |

**Parallel opportunities**: T005/T006/T010; T011–T012 alongside Phase 2 tests; T013/T014; T019–T021; T023/T028/T029/T031–T033; T032.

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 4 (T001–T021), optionally Phase 3 (T011–T012) first for quick refresh fix.
