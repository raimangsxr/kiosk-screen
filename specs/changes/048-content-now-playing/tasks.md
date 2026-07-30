---
description: "Task list for CHG-048 content now playing & rotation logging"
---

# Tasks: Contenido en emisión y trazabilidad de rotación (CHG-048)

**Input**: Design documents from `/specs/changes/048-content-now-playing/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/admin-content-stream-now-playing.md`, `contracts/rotation-plan-logging.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — snapshot unit tests, logging unit tests, SSE integration tests, `admin-content-stream.service.spec.ts`, `content-list.component.spec.ts`, and manual `quickstart.md` (SC-001–SC-005).

**Organization**: SDD governance → foundational snapshot/logging → US1 admin highlight (P1) → US2 rotation logs (P1) → US3 replan logs (P2) → polish & validation.

**Post-analyze fixes** (2026-07-30): connect replay (C1), CHG-047 auth test update (I1), merged post-emit hook (D1), mode-change logging (I2), deactivated-item edge case (U1), a11y/edge-case coverage (U2/U3), FR-006 clarification (A1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US3 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Rotation snapshot: `backend/app/application/display_orchestrator/rotation_plan.py`
- Rotation logging: `backend/app/application/display_orchestrator/rotation_logging.py`
- Orchestrator emit: `backend/app/application/display_orchestrator/rotation_logic.py`
- Admin SSE: `backend/app/application/admin_content/{hooks.py,sse_hub.py}`
- Stream route: `backend/app/api/content_stream.py`
- Frontend stream: `frontend/src/app/features/content/admin-content-stream.service.ts`
- Content list: `frontend/src/app/features/content/content-list.component.{ts,css,html}`
- Contracts: `specs/contracts/content-ads-admin/contract.md`, `specs/contracts/content-rotation/contract.md`
- Change: `specs/changes/048-content-now-playing/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T005 complete.

- [X] T001 Read `specs/manifest.yml` and `specs/changes/048-content-now-playing/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/admin-content-stream-now-playing.md,contracts/rotation-plan-logging.md,contracts/contract-deltas.md}`.
- [X] T002 Merge CONTENT.ADS.ADMIN section from `specs/changes/048-content-now-playing/contracts/contract-deltas.md` into `specs/contracts/content-ads-admin/contract.md` (yellow row highlight, `now_playing_changed` SSE + connect replay, stream auth `get_current_user`, off-page hint, FR-011/FR-012).
- [X] T003 Merge CONTENT.ROTATION section from `specs/changes/048-content-now-playing/contracts/contract-deltas.md` into `specs/contracts/content-rotation/contract.md` (`rotation_plan` / `rotation_replan` INFO logs, `compute_rotation_plan_snapshot` semantics, `rotation_plan` with `showing: null` on ads/pause).
- [X] T004 Add CHG-048 entry `status: in-progress` to `specs/manifest.yml` under `changes:` and add `CHG-048` to `content-ads-admin.related_changes` and `content-rotation.related_changes`.
- [X] T005 Set `status: in-progress` in `specs/changes/048-content-now-playing/spec.md` frontmatter.

**Note**: No new ADR — reuse ADR-0009 per `research.md` R2/R9.

**Checkpoint**: Contracts and manifest updated; implementation may begin.

---

## Phase 2: Foundational — Rotation Snapshot & Logging (blocking for US2–US3)

**Purpose**: Shared read-only planner and structured log helpers; no orchestrator wiring yet.

**⚠️ CRITICAL**: Complete before Phase 4 (US2) and Phase 5 (US3).

- [X] T006 [P] Implement `RotationPlanSnapshot`, `ContentRef`, and `compute_rotation_plan_snapshot(orchestrator, session)` reusing `_regular_queue`, `_pick_next_regular`, `novelty_queue`, and recurring pick logic without mutating state in `backend/app/application/display_orchestrator/rotation_plan.py`.
- [X] T007 [P] Implement `log_rotation_plan(snapshot, *, organization_id, operator_session_id, reason)` and `log_rotation_replan(snapshot, *, organization_id, operator_session_id, reason)` at INFO with structured `extra` per `specs/changes/048-content-now-playing/contracts/rotation-plan-logging.md` in `backend/app/application/display_orchestrator/rotation_logging.py`; `novelties` field is `string[]` of ids (titles only on `showing`/`next` objects).
- [X] T008 [P] Add unit tests in `backend/tests/unit/test_rotation_plan_snapshot.py`: regular queue (showing=1 next=2), novelty insert while showing unchanged (showing=3 next=250 novelties=[250]), recurring due item, empty playlist edge cases.
- [X] T009 [P] Add unit tests in `backend/tests/unit/test_rotation_logging.py`: `caplog` asserts `rotation_plan` and `rotation_replan` payloads include `organizationId`, `operatorSessionId`, `showing`, `next`, `novelties` (id array), `reason`; no PII beyond admin titles.

**Checkpoint**: Snapshot and logging helpers tested in isolation.

---

## Phase 3: User Story 1 — Ver qué contenido está en pantalla (P1) 🎯 MVP

**Goal**: Yellow row/card highlight driven by SSE `now_playing_changed` (including connect replay); off-page hint; clears on ads/pause; `event_operator` can subscribe.

**Independent test**: Open `/admin/content` mid-rotation → yellow row immediately (replay); advances within ≤3 s on rotation; off-page hint when item not on current page.

**Requires Phase 1**. Backend SSE after T005; frontend after T011 (hooks exist).

### Backend — SSE `now_playing_changed`

- [X] T010 [P] [US1] Extend `AdminContentSseHub.publish_now_playing_changed(organization_id, *, content_id, title)` with envelope `{v:1,type:"now_playing_changed",at,contentId,title}` in `backend/app/application/admin_content/sse_hub.py`.
- [X] T011 [US1] Implement `notify_now_playing_changed(organization_id, *, content_id, title)` and `get_now_playing_for_org(organization_id) -> tuple[UUID|None, str|None]` (reads orchestrator `currentTopContentId`) in `backend/app/application/admin_content/hooks.py`.
- [X] T012 [US1] On admin stream subscribe in `backend/app/api/content_stream.py`, replay one `now_playing_changed` via `get_now_playing_for_org` (FR-002 connect replay; `research.md` R9).
- [X] T013 [US1] Add `_after_emit_top_content(...)` in `backend/app/application/display_orchestrator/rotation_logic.py` called from `emit_top_content`; initially calls only `notify_now_playing_changed` (logging added in T022).
- [X] T014 [US1] Call `notify_now_playing_changed(content_id=None)` when mode changes away from top loop content (ads, pause without top) in `backend/app/application/display_orchestrator/remote_control.py` (and remote jump paths that stop top emit per plan matrix).
- [X] T015 [US1] Change `GET /admin/content/stream` auth from `require_roles(CONTENT_MANAGEMENT_ROLES)` to `get_current_user` in `backend/app/api/content_stream.py`; **update** `backend/tests/integration/test_admin_content_stream.py` — replace `test_operator_without_content_roles_gets_403` with operator-can-connect test; keep 401 for unauthenticated.
- [X] T016 [P] [US1] Add integration tests in `backend/tests/integration/test_admin_content_now_playing_stream.py`: (a) connect replay sends current `now_playing_changed` without waiting for advance; (b) stream receives event after `advance_top`; (c) `contentId: null` on mode change to ads; (d) `event_operator` can connect; (e) org isolation unchanged.

### Frontend — highlight & hint

- [X] T017 [US1] Handle SSE `now_playing_changed` in `frontend/src/app/features/content/admin-content-stream.service.ts`: expose `nowPlayingContentId` and `nowPlayingTitle` signals; clear on `contentId: null`; no debounce (immediate UI).
- [X] T018 [US1] Apply `content-list__row--on-air` / `content-list__card-item--on-air` class bindings, `aria-label="En pantalla"` on matching row/card, and yellow `color-mix` token distinct from novelty orange with WCAG-readable text contrast in `frontend/src/app/features/content/content-list.component.ts` and `frontend/src/app/features/content/content-list.component.css` (FR-009, FR-011).
- [X] T019 [US1] Show compact hint «En pantalla: [título]» in admin list actions area when `nowPlayingContentId` is set and not in `visibleItems()` in `frontend/src/app/features/content/content-list.component.ts` (and template).
- [X] T020 [P] [US1] Extend `frontend/src/app/features/content/admin-content-stream.service.spec.ts`: `now_playing_changed` updates signals; null payload clears state; connect replay event applied on open.
- [X] T021 [P] [US1] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: row gets `content-list__row--on-air` when signal matches; hint when off-page; no highlight when null; novelty+on-air uses yellow not orange; «Solo novedades» filter with off-page on-air item shows hint not wrong row; drag class distinct from on-air class.

**Checkpoint**: US1 independently testable per `quickstart.md` §1–4, §1b, §7–8.

---

## Phase 4: User Story 2 — Trazar cada paso de la rotación en logs (P1)

**Goal**: INFO `rotation_plan` log on every top-content emit and when top content stops (showing null), with showing, next, novelties, org and session ids.

**Independent test**: Active display, 3 rotation steps → each step produces exactly one structured INFO log with three mandatory fields; ads mode → one log with `showing: null`.

**Requires Phase 2 and T013**.

- [X] T022 [US2] Extend `_after_emit_top_content` in `backend/app/application/display_orchestrator/rotation_logic.py` to also call `compute_rotation_plan_snapshot` + `log_rotation_plan` (single post-emit hook; no duplicate wiring).
- [X] T023 [US2] Wire `log_rotation_plan` on remote jump / fixed content / bootstrap emit paths **and** on `mode_changed` to ads/pause (snapshot with `showing: null`) in `backend/app/application/display_orchestrator/remote_control.py`.
- [X] T024 [P] [US2] Extend `backend/tests/unit/test_rotation_plan_snapshot.py`: 3-step regular rotation sequence assertions (showing/next/novelties per step).
- [X] T025 [P] [US2] Add integration tests in `backend/tests/integration/test_rotation_plan_logging.py`: `caplog` captures exactly one `rotation_plan` per `advance_top` with `organizationId` and `operatorSessionId`; mode change to ads logs `rotation_plan` with `showing: null`.

**Checkpoint**: US2 independently testable per `quickstart.md` §5.

---

## Phase 5: User Story 3 — Registrar cambio de cola sin avance (P2)

**Goal**: INFO `rotation_replan` when novelty queue or next planned item changes while showing id unchanged (not on novelty consume/emit).

**Independent test**: Item 3 on air, empty novelty queue → public upload → log within ≤2 s with showing=3, next=new id, novelties=[new id] without waiting for timer.

**Requires Phase 2**.

- [X] T026 [US3] On `notify_content_mutated` (public upload, admin create/update affecting novelty queue), when orchestrator active and `showing` unchanged but snapshot `next` or `novelties` differ, call `log_rotation_replan` with mapped reason in `backend/app/application/display_orchestrator/hooks.py` (FR-006; no replan on consume/emit).
- [X] T027 [US3] Guard replan: skip duplicate logs when snapshot unchanged; skip when no active orchestrator session in `backend/app/application/display_orchestrator/hooks.py`.
- [X] T028 [P] [US3] Add integration test in `backend/tests/integration/test_rotation_plan_logging.py`: public `POST /api/v1/public/content` while item 3 showing emits `rotation_replan` without `rotation_plan` until next advance.
- [X] T029 [P] [US3] Extend `backend/tests/unit/test_rotation_plan_snapshot.py`: multiple pending novelties listed in consume order.

**Checkpoint**: US3 independently testable per `quickstart.md` §6.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Edge-case wiring, full validation, manifest closure, agent context.

- [X] T030 [US1] When on-air item is deactivated/deleted and orchestrator clears or advances, emit `now_playing_changed` (updated id or `null`) from mutation/orchestrator path; add integration test in `backend/tests/integration/test_admin_content_now_playing_stream.py`.
- [X] T031 Run narrow backend tests: `pytest backend/tests/unit/test_rotation_plan_snapshot.py backend/tests/unit/test_rotation_logging.py backend/tests/integration/test_admin_content_now_playing_stream.py backend/tests/integration/test_rotation_plan_logging.py backend/tests/integration/test_admin_content_stream.py -q`.
- [X] T032 Run narrow frontend tests: `npm --prefix frontend run test -- --include='**/content-list*' --include='**/admin-content-stream*'`.
- [X] T033 Run `npm --prefix frontend run build` and fix any compile errors in touched frontend files.
- [X] T034 Execute manual scenarios in `specs/changes/048-content-now-playing/quickstart.md` §1–8; record pass/fail notes and SC-002/SC-004 timings in checklist or PR description.
- [X] T035 Update `specs/changes/048-content-now-playing/checklists/requirements.md` traceability if new FR coverage gaps found during implementation.
- [X] T036 Set `status: implemented` in `specs/changes/048-content-now-playing/spec.md` and `specs/manifest.yml` CHG-048 entry after validation passes.
- [X] T037 Update `AGENTS.md` SPECKIT markers: move CHG-048 to recently implemented; clear active plan.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005) ──blocks──► all implementation
Phase 2 (T006–T009) ──blocks──► Phase 4, Phase 5
Phase 3 US1 (T010–T021) ──depends on──► Phase 1; frontend T017–T021 after T011
Phase 4 US2 (T022–T025) ──depends on──► Phase 2 + T013
Phase 5 US3 (T026–T029) ──depends on──► Phase 2
Phase 6 (T030–T037) ──depends on──► Phases 3–5
```

### User story completion order

| Story | Priority | Depends on | Can start after |
|-------|----------|------------|-----------------|
| US1 | P1 | Phase 1 | T005 |
| US2 | P1 | Phase 2 + T013 | T009, T013 |
| US3 | P2 | Phase 2 | T009 |

**MVP scope**: Phase 1 + Phase 3 (US1) — operators see live yellow highlight with connect replay; Phase 2 can run parallel to US1 backend after T005.

---

## Parallel Execution Examples

### After Phase 1 complete

```text
Parallel: T006 rotation_plan.py + T007 rotation_logging.py + T010 sse_hub extension
```

### US1 backend + frontend split

```text
Parallel: T016 integration tests (backend) + T018 content-list CSS (frontend) after T011 hooks exist
Parallel: T020 admin-content-stream.service.spec.ts + T021 content-list.component.spec.ts
```

### US2 + US3 test authoring

```text
Parallel: T024 snapshot sequence tests + T029 multi-novelty tests
Parallel: T025 rotation_plan integration + T028 replan integration
```

---

## Implementation Strategy

1. **Governance first** (T001–T005) — contracts before code.
2. **US1 MVP** (T010–T021) — yellow row + SSE + connect replay.
3. **Foundational helpers** (T006–T009) — can overlap with US1 backend after T005.
4. **US2 logging** (T022–T025) — extend single `_after_emit_top_content` hook.
5. **US3 replan** (T026–T029) — mid-cycle novelty visibility.
6. **Edge cases + validate** (T030–T037).

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | T001–T005 (5) | — |
| 2 Foundational | T006–T009 (4) | — |
| 3 US1 Highlight | T010–T021 (12) | US1 |
| 4 US2 Rotation logs | T022–T025 (4) | US2 |
| 5 US3 Replan logs | T026–T029 (4) | US3 |
| 6 Polish | T030–T037 (8) | — |
| **Total** | **37 tasks** | |

**Per user story**: US1 = 12 tasks, US2 = 4 tasks, US3 = 4 tasks (+ 17 shared/foundational/polish).

**Parallel opportunities**: 14 tasks marked `[P]`.

**Format validation**: All 37 tasks use `- [ ]`, sequential T001–T037 IDs, story labels on US phases, and explicit file paths.
