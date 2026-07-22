---
description: "Task list for CHG-043 live density profile calibration"
---

# Tasks: Live Density Profile Calibration

**Input**: Design documents from `/specs/changes/043-live-density-preview/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/contract-deltas.md`, `docs/adr/0011-live-profile-calibration-preview.md`; CHG-042 implemented on branch `042-per-display-iframe-layout`

**Tests**: Mandatory per TQ-002 — backend integration (preview fanout, apply endpoint), frontend facade/component specs, manual quickstart Phases 1–5.

**Organization**: SDD governance → foundational preview/apply backend → US1 create + live sliders (MVP) → US2 edit + apply to assigned → US3 assign + fine-tune → polish & consolidation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US3 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Backend layout: `backend/app/application/display_layout/`
- Layout API: `backend/app/api/display_layout.py`
- SSE hub: `backend/app/application/display_orchestrator/sse_hub.py`
- Frontend admin layout: `frontend/src/app/features/display-layout/`
- Frontend display runtime: `frontend/src/app/display/`
- Remote control: `frontend/src/app/features/remote-control/`
- Contracts: `specs/contracts/{display-runtime,display-config-session}/contract.md`
- Change: `specs/changes/043-live-density-preview/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas and align ADR with clarifications before code (TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T006 complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/043-live-density-preview/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md}`; note clarifications: autosave preview targets test kiosk only (FR-012); **Aplicar a pantallas asignadas** for production fanout (FR-013); assign confirm applies to target (FR-014).
- [x] T002 Merge DISPLAY.RUNTIME section from `specs/changes/043-live-density-preview/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md` (`profile_preview` source, targeted preview SSE, apply fanout semantics).
- [x] T003 [P] Merge DISPLAY.CONFIG_SESSION section from `specs/changes/043-live-density-preview/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md` (calibration workspace, autosave, apply button, iframe activation dialog).
- [x] T004 [P] Verify `specs/changes/043-live-density-preview/{data-model.md,contracts/contract-deltas.md,research.md}` align with spec clarifications (preview-only autosave fanout, apply-assigned, assign via PATCH device).
- [x] T005 [P] Verify `docs/adr/0011-live-profile-calibration-preview.md` matches spec (autosave does not fan out to assigned devices; apply action does).
- [x] T006 Set `status: in-progress` in `specs/changes/043-live-density-preview/spec.md` frontmatter; set CHG-043 entry `status: in-progress` in `specs/manifest.yml`.

---

## Phase 2: Foundational — Preview & apply backend (blocking)

**Purpose**: `profile_preview` source, targeted preview fanout, apply-to-assigned endpoint shared by all user stories.

**Independent Test**: `pytest backend/tests/integration/test_display_layout_api.py -k preview -v` passes — PUT with `previewKioskId` emits SSE to one kiosk only; assigned kiosk unchanged until apply.

**Gate G0** (exit Phase 2): Integration proves preview fanout is single-kiosk; apply endpoint fans out to assigned devices with `profile` source.

- [x] T007 Add `profile_preview` to `EmbedDensitySource` (or equivalent enum) in `backend/app/domain/embed_layout.py`.
- [x] T008 Implement `preview_layout_on_kiosk(organization_id, profile_id, preview_kiosk_id)` in `backend/app/application/display_layout/service.py` publishing SSE `layout_updated` with `source: profile_preview` per family; no `local_overrides` write.
- [x] T009 Implement `apply_profile_to_assigned_devices(organization_id, profile_id)` in `backend/app/application/display_layout/service.py` fanning out `layout_updated` with `source: profile` to all devices where `layout_profile_id == profile.id`; reuse existing profile-update audit path if present (no new audit event type).
- [x] T010 Refactor `update_profile` in `backend/app/application/display_layout/service.py`: when `preview_kiosk_id` query param present, persist densities then call preview only (FR-012); do **not** org-wide or assigned fanout on autosave path.
- [x] T011 Extend `backend/app/api/display_layout.py`: optional `previewKioskId` query on `PUT /api/admin/display-layout/profiles/{id}`; add `POST /api/admin/display-layout/profiles/{id}/apply-assigned` (FR-013) with `content_manager` RBAC.
- [x] T012 [P] Add Pydantic request/response schemas for apply and preview query param in `backend/app/api/schemas.py`; wire mappers in `backend/app/api/mappers.py` if needed.
- [x] T013 [P] Extend `backend/tests/integration/test_display_layout_api.py`: (a) PUT with `previewKioskId` → SSE to preview kiosk only, assigned kiosk density unchanged; (b) POST apply-assigned → assigned kiosk receives `profile` source update; (c) invalid `previewKioskId` → 400/404.
- [x] T014 [P] Extend `backend/tests/contract/test_display_layout_openapi.py` for new query param and apply-assigned route.
- [x] T015 Run `pytest backend/tests/integration/test_display_layout_api.py backend/tests/contract/test_display_layout_openapi.py -v`.

---

## Phase 3: User Story 1 — Calibrate a new profile on a live display (Priority: P1) 🎯 MVP

**Goal**: Operator creates profile with mandatory test kiosk, selects iframe, tunes slider; kiosk resizes within 2 s; autosave persists without per-tick save (SC-001, SC-002, SC-003).

**Independent Test**: One connected kiosk in iframe mode; create profile via sliders only; reload admin shows saved values; network shows one PUT per slider rest.

**Gate G1** (exit Phase 3): Slider move → test kiosk iframe resizes; `local_overrides` row unchanged on device.

- [x] T016 [US1] Create `frontend/src/app/features/display-layout/display-layout-calibration.facade.ts` with `LiveCalibrationSession` state, 500 ms debounced autosave (`debounceTime` + `switchMap`), autosave status (`idle | saving | saved | error`), and `PUT` via `DisplayLayoutApiService` with `previewKioskId`.
- [x] T017 [P] [US1] Extend `frontend/src/app/features/display-layout/display-layout.api.ts` with `updateProfile(id, densities, previewKioskId?)` and types for live kiosks / iframes.
- [x] T018 [US1] Create `frontend/src/app/features/display-layout/display-layout-calibration.component.ts`: test kiosk picker (`GET .../live`), iframe picker (org iframe list), profile name field, MatSlider per family (pattern from `frontend/src/app/display/display-density-panel.component.ts`), autosave status chip (`idle | guardando | guardado | error`) per FR-009; disable all sliders until kiosk + iframe selected (FR-001, FR-002).
- [x] T019 [US1] Enable only the slider matching selected iframe `embedAppFamily`; disable others with Spanish message (FR-003, FR-011).
- [x] T020 [US1] Wire create flow in `display-layout-calibration.component.ts`: POST profile with defaults → open calibration workspace → sliders active after kiosk + iframe + name (research R5).
- [x] T021 [US1] Integrate iframe mode gate in `display-layout-calibration.facade.ts`: if test kiosk not in iframe mode, show confirmation dialog (FR-015); on accept call `remote-control.facade.ts` `setIframeMode` with selected iframe URL; block sliders until active.
- [x] T022 [P] [US1] Extend `frontend/src/app/display/display-layout.service.ts` and `frontend/src/app/display/display-stream.models.ts` to treat `profile_preview` source like `profile` for embed URL + `bull:config` without writing cache as local override (FR-008).
- [x] T023 [US1] Refactor `frontend/src/app/features/display-layout/display-layout-profiles.component.ts` to host calibration workspace (create/edit entry points) instead of numeric-only create form.
- [x] T024 [P] [US1] Extend `frontend/src/app/shared/util/embed-density-labels.ts` with `profile_preview` → Spanish **vista previa**.
- [x] T025 [P] [US1] Create `frontend/src/app/features/display-layout/display-layout-calibration.facade.spec.ts` covering debounce coalescing (10 moves → 1 save), previewKioskId on PUT, and error retry retention (FR-010).
- [x] T026 [P] [US1] Extend `frontend/src/app/features/display-layout/display-layout-profiles.component.spec.ts`: sliders disabled without test kiosk; enabled after kiosk + iframe selection.
- [x] T027 [US1] Manual validation per `specs/changes/043-live-density-preview/quickstart.md` Phase 1 and Phase 4; record pass in `specs/changes/043-live-density-preview/checklists/requirements.md` notes.

---

## Phase 4: User Story 2 — Refine an existing profile on a live display (Priority: P1)

**Goal**: Edit profile on test kiosk; other assigned kiosks unchanged during autosave; **Aplicar a pantallas asignadas** pushes production density (FR-012, FR-013).

**Independent Test**: Profile assigned to kiosk A and B; calibrate on test kiosk C; only C preview changes until apply; after apply, A and B match profile.

- [x] T028 [US2] Load existing profile into `display-layout-calibration.component.ts` edit mode with current densities and assigned-device count for apply button visibility.
- [x] T029 [US2] Add **Aplicar a pantallas asignadas** button in `display-layout-calibration.component.ts`; visible only when `assignedDeviceCount > 0` (FR-013); calls `POST .../apply-assigned` via `display-layout.api.ts`.
- [x] T030 [US2] Extend autosave error UI in `display-layout-calibration.component.ts`: non-blocking error with retry on failure (FR-010); status chip already present from US1 (FR-009).
- [x] T031 [US2] Handle test kiosk switch mid-session in `display-layout-calibration.facade.ts`: update `previewKioskId` on next autosave; preview follows new kiosk without local override on old kiosk.
- [x] T032 [P] [US2] Add stale concurrent-edit notice in `display-layout-calibration.facade.ts` when profile `updatedAt` changes under editor (edge case spec).
- [x] T033 [P] [US2] Extend `backend/tests/integration/test_display_layout_api.py` US2 scenario: two assigned kiosks + preview kiosk; autosave does not change assigned; apply updates both.
- [x] T034 [P] [US2] Extend `display-layout-calibration.facade.spec.ts` and `display-layout-profiles.component.spec.ts` for apply button visibility and apply API call.
- [x] T035 [US2] Manual validation per `quickstart.md` Phase 2; record pass in checklist notes.

---

## Phase 5: User Story 3 — Assign and fine-tune before deployment (Priority: P2)

**Goal**: Assign flow opens calibration pre-filled for target display; confirm assignment applies density to target without separate apply button (FR-014, SC-005).

**Independent Test**: Register device label matches connected kiosk; calibrar y asignar → fine-tune → confirm; target kiosk matches profile on iframe load.

- [x] T036 [US3] Add **Calibrar y asignar** entry from device row in `frontend/src/app/features/display-layout/display-layout-profiles.component.ts` opening calibration with target kiosk pre-selected as test kiosk.
- [x] T037 [US3] Implement assign confirm in `display-layout-calibration.facade.ts`: call existing `PATCH /api/admin/display-layout/devices/{id}` with `layoutProfileId` via `display-layout.api.ts`; backend `assign_profile_to_device` already publishes `profile` SSE to target kiosk via `_publish_layout_to_device` (FR-014). No separate apply button in assign flow.
- [x] T038 [US3] Block live fine-tune when no connected kiosk matches registered label; show Spanish explanation; retain slider values in UI (US3 acceptance scenario 2).
- [x] T039 [P] [US3] Extend `backend/tests/integration/test_display_layout_api.py`: assign during calibration applies density to target kiosk immediately.
- [x] T040 [US3] Manual validation per `quickstart.md` Phase 3; record pass in checklist notes.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Empty states, failure handling, validation gates, consolidation.

- [x] T041 [P] Add no-connected-kiosks empty state in `display-layout-calibration.component.ts` — calibration blocked, list/delete profiles still allowed (edge case spec).
- [x] T042 [P] Verify `frontend/src/app/display/display-layout.service.spec.ts` covers `profile_preview` source handling; extend if gaps remain.
- [x] T043 Run narrow tests: `pytest backend/tests/integration/test_display_layout_api.py backend/tests/contract/test_display_layout_openapi.py -v` and `npm --prefix frontend run test -- --include='**/display-layout*.spec.ts'`.
- [x] T044 Run broader validation: `pytest backend/tests` and `npm --prefix frontend run build`.
- [x] T045 Manual validation per `quickstart.md` Phase 5 (autosave failure retry); record pass in checklist notes.
- [x] T046 Update `specs/changes/043-live-density-preview/context-pack.md` with final entrypoints and validation evidence.
- [x] T047 Mark CHG-043 `status: implemented` in `specs/changes/043-live-density-preview/spec.md` and `specs/manifest.yml` after all gates pass.
- [x] T048 Consolidate any remaining contract notes from change deltas into active contracts if drift found during implementation.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T006)
  └─ blocks all implementation

Phase 2 (T007–T015) Foundational backend
  └─ blocks US1–US3 frontend preview/apply wiring

Phase 3 (T016–T027) US1 MVP 🎯
  └─ minimum shippable increment

Phase 4 (T028–T035) US2
  └─ depends on Phase 2 apply endpoint + Phase 3 calibration shell

Phase 5 (T036–T040) US3
  └─ depends on Phase 3 calibration shell + Phase 2 assign fanout

Phase 6 (T041–T048) Polish
  └─ after US1–US3 complete
```

### User Story Dependency Graph

```text
US1 (create + live sliders) ──┬──► US2 (edit + apply button)
                              └──► US3 (assign + fine-tune)
```

US2 and US3 can proceed in parallel after US1 foundation (calibration component + facade exist).

---

## Parallel Execution Examples

### After Phase 2 completes

```text
Parallel batch A:
  T016 facade.ts
  T017 display-layout.api.ts
  T022 display-layout.service.ts
  T024 embed-density-labels.ts
  T025 facade.spec.ts
```

### US2 tests (after T028–T031)

```text
Parallel batch B:
  T033 backend integration US2
  T034 frontend specs
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 + Phase 2 (contracts + preview backend).
2. Complete Phase 3 (T016–T027).
3. **STOP and VALIDATE**: quickstart Phase 1 + Phase 4; Gate G1.
4. Demo live slider calibration on one physical kiosk.

### Incremental Delivery

1. Phase 1–2 → preview/apply API ready.
2. Phase 3 (US1) → create + calibrate (MVP).
3. Phase 4 (US2) → edit + apply to assigned displays.
4. Phase 5 (US3) → assign with fine-tune on site.
5. Phase 6 → full regression + manifest/consolidation.

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 — SDD Governance | T001–T006 (6) | — |
| 2 — Foundational backend | T007–T015 (9) | — |
| 3 — US1 Create + sliders | T016–T027 (12) | US1 |
| 4 — US2 Edit + apply | T028–T035 (8) | US2 |
| 5 — US3 Assign + fine-tune | T036–T040 (5) | US3 |
| 6 — Polish | T041–T048 (8) | — |
| **Total** | **48** | |

### Independent Test Criteria

| Story | Independent Test |
|-------|------------------|
| US1 | Create profile with sliders on one kiosk; live resize within 2 s; values persist on reload; one PUT per rest |
| US2 | Edit on test kiosk; assigned kiosks unchanged until apply; apply updates all assigned |
| US3 | Calibrar y asignar on target label; confirm applies density without separate apply button |

### Suggested MVP Scope

**Phases 1–3 only** (T001–T027): live create + calibrate workflow with debounced autosave and targeted preview.

### Format Validation

All 48 tasks use checklist format `- [x] T### [P?] [US?] Description with file path`.
