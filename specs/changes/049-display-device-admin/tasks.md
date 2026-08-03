---
description: "Task list for CHG-049 display device admin"
---

# Tasks: Administración de pantallas registradas

**Input**: Design documents from `/specs/changes/049-display-device-admin/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — `display-devices` facade + list component specs, updated `iframe-form.component.spec.ts`, backend regression `test_display_devices_api.py`, and manual `quickstart.md`.

**Organization**: SDD governance → foundational routing/facade → **US4 iframe decoupling (blocking)** → US1 (inventory) → US2 (pre-create) → US3 (rename/delete) → polish.

**Release gate**: FR-009 / SC-005 require Phase 3 (US4) complete **before** any merge that exposes create/delete on `/admin/displays` (Phases 5–6).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Display devices feature: `frontend/src/app/features/display-devices/`
- Iframe form: `frontend/src/app/features/iframes/iframe-form.component.ts`
- Contract: `specs/contracts/display-config-session/contract.md`
- Change: `specs/changes/049-display-device-admin/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T004 complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/049-display-device-admin/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md}`.
- [x] T002 Merge DISPLAY.CONFIG_SESSION section from `specs/changes/049-display-device-admin/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md` (route `/admin/displays`, nav Pantallas, lifecycle centralization, iframe matrix link-only, 30 s connection refresh).
- [x] T003 Add CHG-049 entry `status: in-progress` to `specs/manifest.yml` under `DISPLAY.CONFIG_SESSION.related_changes`.
- [x] T004 Set `status: in-progress` in `specs/changes/049-display-device-admin/spec.md` frontmatter.

**Note**: No ADR required — frontend admin UX on existing APIs per `research.md` R11.

**Checkpoint**: Contract and manifest updated; implementation may begin.

---

## Phase 2: Foundational Scaffolding (blocking)

**Purpose**: Route, navigation, facade, and list shell required by all user stories.

**⚠️ CRITICAL**: Complete before Phase 3 (US4) and Phase 4 (US1).

- [x] T005 [P] Register `/admin/displays` child route pointing to `DisplayDevicesListComponent` in `frontend/src/app/app.routes.ts`.
- [x] T006 [P] Add **Pantallas** nav item (`route: '/admin/displays'`, summary about device inventory) to Configuración group in `frontend/src/app/features/admin-shell/admin-navigation.service.ts`; add icon mapping in `ICONS` record.
- [x] T007 Implement `DisplayDevicesFacade` in `frontend/src/app/features/display-devices/display-devices.facade.ts`: signals (`devices`, `loading`, `mutating`, `error`, `empty`); `refresh()` using `forkJoin` of `DisplayDeviceApiService.list()` + `LiveKiosksApiService.listLive()`; merge `connected` by label; sort with `localeCompare('es')`; map API errors via `adaptApiError` (FR-008, same pattern as `iframe.facade.ts`).
- [x] T008 [P] Scaffold `DisplayDevicesListComponent` in `frontend/src/app/features/display-devices/display-devices-list.component.ts` using `AdminListComponent` (title «Pantallas», Spanish description, loading/error/empty states, refresh action); surface `facade.error()` with user-safe messages (no internal paths).

**Checkpoint**: Navigable empty shell at `/admin/displays`; facade loads merged rows.

---

## Phase 3: User Story 4 — Iframe decoupling (P2, blocking for lifecycle) ⚠️

**Goal**: Remove create/delete from iframe scale matrix **before** dedicated-view lifecycle ships (FR-009, SC-005).

**Independent test**: Iframe edit form has link only (no add/delete device controls); «Gestionar pantallas» targets `/admin/displays`; scale editing still works.

**Requires Phase 2** only. **Blocks Phases 5–6** (US2/US3).

- [x] T021 [US4] Remove pre-create field/button, per-row Eliminar button, `precreateDevice()`, and `deleteDevice()` from `frontend/src/app/features/iframes/iframe-form.component.ts`; add `routerLink="/admin/displays"` link «Gestionar pantallas» in scale matrix header.
- [x] T022 [US4] Remove `precreateDisplayDevice` and `deleteDisplayDevice` methods from `frontend/src/app/features/iframes/iframe.facade.ts`.
- [x] T023 [P] [US4] Update `frontend/src/app/features/iframes/iframe-form.component.spec.ts`: assert no add/delete device controls; «Gestionar pantallas» link targets `/admin/displays`; remove tests for `precreateDisplayDevice` / `deleteDisplayDevice`.

**Checkpoint**: Single lifecycle entry point enforced — iframe form is scales-only.

---

## Phase 4: User Story 1 — Consultar inventario de pantallas (P1) 🎯 MVP

**Goal**: List all display devices with label, connection status, last activity; alphabetical sort; empty state; auto-refresh connection status every ~30 s.

**Independent test**: Open `/admin/displays` with pre-created and connected devices; both appear with correct status chips; empty org shows guidance; status updates within 30 s when kiosk connects/disconnects.

**Requires Phases 2–3**.

- [x] T009 [US1] Build desktop `mat-table` in `frontend/src/app/features/display-devices/display-devices-list.component.ts` with columns: etiqueta, estado (`StatusChipComponent` conectada/desconectada), última actividad (`lastSeenAt | date:'short'` or «—»), acciones placeholder.
- [x] T010 [US1] Add compact mobile card template via `#adminListCards` in `frontend/src/app/features/display-devices/display-devices-list.component.ts` (CHG-035 pattern): label, status chip, last seen, action row; rely on `AdminListComponent` scroll for lists >20 rows (no pagination).
- [x] T011 [US1] Implement `startPolling(intervalMs = 30_000)` in `frontend/src/app/features/display-devices/display-devices.facade.ts` using `interval` + `startWith(0)` + `switchMap(() => refresh())`; call from `display-devices-list.component.ts` with `takeUntilDestroyed`.
- [x] T012 [P] [US1] Add `frontend/src/app/features/display-devices/display-devices.facade.spec.ts`: merge sets `connected` when live label matches; alphabetical sort; ignores null `displayLabel`; `fakeAsync` + `tick(30_000)` verifies second `refresh()` call updates `connected` when live kiosks change (SC-006).
- [x] T013 [P] [US1] Add `frontend/src/app/features/display-devices/display-devices-list.component.spec.ts`: renders rows, empty state copy, connected vs disconnected chips, refresh action triggers facade; 403 from API surfaces error state via `adaptApiError` (FR-008).

**Checkpoint**: US1 independently testable — read-only inventory with live status refresh.

---

## Phase 5: User Story 2 — Pre-crear pantallas (P1)

**Goal**: Inline header form to add a display device by label; validation; duplicate error handling.

**Independent test**: Create «Sala principal» from inline form; appears in list ≤2 s; duplicate shows error; empty label disables button.

**Requires Phases 3–4** (iframe decoupling + list component).

- [x] T014 [US2] Add inline create form (`mat-form-field` + «Añadir pantalla» button) in `adminListActions` slot of `frontend/src/app/features/display-devices/display-devices-list.component.ts`; disable when label empty/whitespace; `maxLength(80)`.
- [x] T015 [US2] Add `create(label)` to `frontend/src/app/features/display-devices/display-devices.facade.ts` calling `DisplayDeviceApiService.create`; on success clear form, snackbar «Pantalla añadida», `refresh()`; on 400 duplicate show snackbar with server message and retain field value; on 403 show `adaptApiError` snackbar (FR-008).
- [x] T016 [P] [US2] Extend `frontend/src/app/features/display-devices/display-devices-list.component.spec.ts`: create success adds row, duplicate shows error, submit disabled when empty.

**Checkpoint**: US2 independently testable — pre-create on dedicated view only.

---

## Phase 6: User Story 3 — Renombrar y eliminar pantallas (P1)

**Goal**: Rename via modal dialog; delete via confirmation with extra warning when connected.

**Independent test**: Rename «Sala 1» → «Sala principal»; delete disconnected device; delete connected shows warning then succeeds; cancel rename leaves label unchanged.

**Requires Phase 4** (list rows and actions column); **Phase 3** (no iframe lifecycle overlap).

- [x] T017 [P] [US3] Create `frontend/src/app/features/display-devices/display-device-rename-dialog.component.ts` (`MatDialog`, `data: { deviceId, label }`, `FormControl` validation, PATCH on Guardar).
- [x] T018 [US3] Add `rename(id, label)` and `delete(id)` to `frontend/src/app/features/display-devices/display-devices.facade.ts` wrapping `DisplayDeviceApiService.rename` / `.delete` with `mutating` signal and `refresh()` on success; 403 via `adaptApiError` (FR-008).
- [x] T019 [US3] Wire rename (open dialog) and delete (`ConfirmDialogService`) actions in `frontend/src/app/features/display-devices/display-devices-list.component.ts`; connected delete message prepends «Esta pantalla está conectada ahora mismo.» per `data-model.md`.
- [x] T020 [P] [US3] Extend `frontend/src/app/features/display-devices/display-devices-list.component.spec.ts`: rename dialog opens and updates label; **cancel/close dialog leaves label unchanged**; delete confirm for disconnected; connected delete shows warning text.

**Checkpoint**: US3 complete — full lifecycle on dedicated view.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Regression, validation, consolidation.

- [x] T024 Run `npm --prefix frontend run test -- --include='**/display-devices**' --include='**/iframe-form**'`.
- [x] T025 Run `pytest backend/tests/integration/test_display_devices_api.py` (regression — no backend changes expected).
- [x] T026 Run `npm --prefix frontend run build`.
- [x] T027 Execute manual scenarios in `specs/changes/049-display-device-admin/quickstart.md` (including §10 permissions / FR-008); record pass/fail in `specs/changes/049-display-device-admin/checklists/requirements.md` notes.
- [x] T028 Set `status: implemented` in `specs/changes/049-display-device-admin/spec.md` and update CHG-049 status in `specs/manifest.yml`.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (SDD) ──► Phase 2 (Scaffold) ──► Phase 3 (US4 iframe) ──► Phase 4 (US1) ──┬──► Phase 5 (US2)
                                                                                 └──► Phase 6 (US3)
Phase 3–6 ──► Phase 7 (Polish)
```

- **US4** (Phase 3): After Phase 2; **blocks US2/US3** (FR-009).
- **US1** (Phase 4): After Phases 2–3.
- **US2** (Phase 5): After Phases 3–4.
- **US3** (Phase 6): After Phase 4; parallel with US2 after Phase 3.

### Parallel Opportunities

| After phase | Parallel tasks |
|-------------|----------------|
| Phase 1 | — (sequential T001–T004) |
| Phase 2 | T005, T006, T008 parallel; then T007 |
| Phase 3 | T023 parallel after T021–T022 |
| Phase 4 | T012, T013 parallel after T009–T011 |
| Phase 5 | T016 parallel after T014–T015 |
| Phase 6 | T017 parallel with T018 start; T020 after T019 |
| Cross-story | US2 (Phase 5) ∥ US3 (Phase 6) after Phase 4 + Phase 3 |

---

## Implementation Strategy

### MVP First (Read-only inventory)

1. Complete Phase 1 (T001–T004)
2. Complete Phase 2 (T005–T008)
3. Complete Phase 3 (T021–T023) — **required even for MVP** (FR-009)
4. Complete Phase 4 (T009–T013)
5. **STOP and VALIDATE**: `/admin/displays` lists devices with connection status and 30 s refresh; iframe has no lifecycle controls

### Incremental Delivery

1. Phase 1 → Phase 2 → Phase 3 (iframe decoupling) → US1
2. US2 + US3 (parallel after US1)
3. Phase 7 (polish + consolidation)

---

## Task Summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| 1 | — | T001–T004 | 4 |
| 2 | — | T005–T008 | 4 |
| 3 | US4 | T021–T023 | 3 |
| 4 | US1 | T009–T013 | 5 |
| 5 | US2 | T014–T016 | 3 |
| 6 | US3 | T017–T020 | 4 |
| 7 | — | T024–T028 | 5 |
| **Total** | | **T001–T028** | **28** |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 + Phase 4 — tasks T001–T013 and T021–T023.

**Independent test criteria**:

| Story | Verify |
|-------|--------|
| US4 | Iframe scales-only; «Gestionar pantallas» link; no lifecycle buttons (SC-005, FR-009) |
| US1 | Alphabetical list; connected/disconnected chips; last seen; empty state; ≤30 s status refresh (SC-006) |
| US2 | Inline create; duplicate error; empty disabled; kiosk reuses pre-created label (SC-004) |
| US3 | Rename modal; cancel leaves label; delete confirm; connected warning (FR-006) |
