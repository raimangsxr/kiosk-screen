---
description: "Task list for CHG-042 per-display iframe layout profiles"
---

# Tasks: Per-Display Iframe Layout Profiles

**Input**: Design documents from `/specs/changes/042-per-display-iframe-layout/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/{embed-density-protocol,contract-deltas,sibling-app-deltas}.md`, `docs/adr/0010-per-display-iframe-embed-density.md`

**Tests**: Mandatory per TQ-002 — resolver unit, layout API integration, display/admin specs, and joint E2E gate (TQ-004).

**Organization**: SDD governance → foundational DB + resolver → US1 core density (MVP) → US2 admin profiles → US3 on-display tuning → sibling joint gate → polish & consolidation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US3 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Backend layout: `backend/app/application/display_layout/`
- Layout API: `backend/app/api/display_layout.py`
- Stream register: `backend/app/api/display_stream.py`
- Frontend display: `frontend/src/app/display/`
- Admin layout: `frontend/src/app/features/display-layout/`
- Contracts: `specs/contracts/{display-runtime,display-config-session}/contract.md`
- Sibling: `../amrn-bull/`, `../amrn-escalabirras-dual/`
- Change: `specs/changes/042-per-display-iframe-layout/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas and accept ADR before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T006 complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/042-per-display-iframe-layout/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/embed-density-protocol.md,contracts/contract-deltas.md,contracts/sibling-app-deltas.md}`.
- [x] T002 Merge DISPLAY.RUNTIME section from `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md`.
- [x] T003 [P] Merge DISPLAY.CONFIG_SESSION section from `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md`.
- [x] T004 [P] Merge IFRAMES / iframe admin section (`embed_app_family`) from `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md` into `specs/contracts/iframes-video-end/contract.md` (or active iframe contract path in manifest).
- [x] T005 [P] Merge operations dashboard density visibility note from `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md` into `specs/changes/040-admin-operations-dashboard/contracts/dashboard-ui-behavior.md` or active dashboard contract if consolidated.
- [x] T006 Set `status: Accepted` in `docs/adr/0010-per-display-iframe-embed-density.md`; set `status: in-progress` in `specs/changes/042-per-display-iframe-layout/spec.md` frontmatter; add CHG-042 entry `status: in-progress` to `specs/manifest.yml` with `related_changes` on `DISPLAY.RUNTIME` and `DISPLAY.CONFIG_SESSION`.

---

## Phase 2: Foundational — Data model & resolver (blocking)

**Purpose**: Shared persistence and density resolution for all user stories.

**Independent Test**: `pytest backend/tests/unit/test_embed_density_resolver.py -v` passes; migration applies cleanly.

**Gate G0** (exit Phase 2): Resolver returns correct precedence (`local_override` > `profile` > `org_default` > `fallback`) for fixture devices.

- [x] T007 Create Alembic migration `backend/alembic/versions/0016_display_layout_profiles.py` adding `display_layout_profiles`, `display_devices`, `kiosk_display_configurations.embed_density_defaults`, `iframes.embed_app_family`, `kiosk_connections.display_device_id` per `specs/changes/042-per-display-iframe-layout/data-model.md`.
- [x] T008 [P] Create `backend/app/repositories/models/display_layout_profile.py` SQLAlchemy model for `display_layout_profiles`.
- [x] T009 [P] Create `backend/app/repositories/models/display_device.py` SQLAlchemy model for `display_devices`.
- [x] T010 [P] Add `embed_app_family` column mapping to `backend/app/repositories/models/iframe.py`.
- [x] T011 [P] Add `embed_density_defaults` JSONB to `backend/app/repositories/models/kiosk_configuration.py` with default map in bootstrap.
- [x] T012 [P] Add `display_device_id` FK to `backend/app/repositories/models/kiosk_connection.py`; export models in `backend/app/repositories/models/__init__.py`.
- [x] T013 Add `EMBED_APP_FAMILY_HOSTS` settings and `EmbedAppFamily` enum in `backend/app/config.py` (or `backend/app/domain/embed_layout.py`).
- [x] T014 Implement `backend/app/application/display_layout/resolver.py` with `detect_family()`, `resolve_effective_density()`, and clamp 300–1200 per `data-model.md`.
- [x] T015 Implement `backend/app/application/display_layout/service.py` with upsert device by label, get/update overrides, and profile assignment helpers.
- [x] T016 [P] Create `backend/tests/unit/test_embed_density_resolver.py` covering precedence chain, host detection, iframe override, unknown family, and bounds.
- [x] T017 Add Pydantic schemas and mappers in `backend/app/api/schemas.py` and `backend/app/api/mappers.py` for layout profiles, devices, and effective density responses.
- [x] T018 Extend `backend/app/api/display_stream.py` `register_kiosk` to upsert `display_devices` from `label`, link `kiosk_connections.display_device_id`, and include layout summary in `KioskRegisterResponse`.
- [x] T019 Run `pytest backend/tests/unit/test_embed_density_resolver.py -v` and `alembic upgrade head` in local lab.

---

## Phase 3: User Story 1 — Calibrate each hall display independently (Priority: P1) 🎯 MVP

**Goal**: Three kiosks keep distinct embed densities across reload and iframe re-entry (SC-001).

**Independent Test**: Open three `/display` clients with different labels; iframe URLs contain distinct `embed_app_height_px`; reload restores values.

**Gate G1** (exit Phase 3): Single kiosk shows bull iframe at calibrated density; global bull admin slider does not change it (requires T028–T029).

- [x] T020 [US1] Create `backend/app/api/display_layout.py` with `GET /api/display/layout/me` for authenticated kiosk (resolve device by label / connection).
- [x] T021 [US1] Register `display_layout` router in `backend/app/api/v1/router.py` (or `backend/app/main.py` router module).
- [x] T022 [P] [US1] Create `frontend/src/app/display/display-layout.models.ts` with types for effective density, source, and family.
- [x] T023 [US1] Create `frontend/src/app/display/display-layout.service.ts` for label storage (`kiosk_display_label`), layout cache (`kiosk_layout_cache:v1`), `GET /api/display/layout/me`, and cache refresh.
- [x] T024 [P] [US1] Create `frontend/src/app/display/display-layout.service.spec.ts` for cache read/write and API mapping.
- [x] T025 [US1] Extend `frontend/src/app/display/display-stream.service.ts` to send `label` from `DisplayLayoutService` on `POST /api/display/kiosk/register`.
- [x] T026 [US1] Add display label claim flow (modal on first `/display` open) in `frontend/src/app/display/display-screen.component.ts` with Spanish copy.
- [x] T027 [US1] Implement `buildIframeUrl(baseUrl, effectivePx, source)` in `frontend/src/app/display/display-layout.service.ts` appending `embed_app_height_px` per `contracts/embed-density-protocol.md`.
- [x] T028 [US1] Extend `frontend/src/app/display/display-screen.component.ts` to use augmented iframe URL in iframe mode and send `bull:config` postMessage on iframe `load` and when layout cache updates.
- [x] T029 [P] [US1] Extend `frontend/src/app/display/display-screen.component.spec.ts` asserting iframe `src` contains `embed_app_height_px` and hidden panel absent by default.
- [x] T030 [US1] Create `backend/tests/integration/test_display_layout_api.py` with tests: register with label creates `display_devices`; `GET /layout/me` returns org default for new device.
- [x] T031 [P] [US1] Implement embed override in `../amrn-bull/frontend/src/app/services/event-config.service.ts` (and `tournament.component.ts` effective height) per `contracts/sibling-app-deltas.md`.
- [x] T032 [P] [US1] Implement embed override in `../amrn-escalabirras-dual/frontend/src/app/services/event-config.service.ts` (and `main-view.component.ts`) per `contracts/sibling-app-deltas.md`.
- [x] T033 [P] [US1] Add sibling unit tests in `../amrn-bull/frontend` and `../amrn-escalabirras-dual/frontend` for query param + `bull:config` precedence over SSE `event_config`.
- [x] T034 [US1] Merge embed override sections into `../amrn-bull/specs/contracts/app-core/contract.md` and `../amrn-escalabirras-dual/specs/contracts/frontend-angular/contract.md`.
- [x] T035 [US1] Manual validation per `specs/changes/042-per-display-iframe-layout/quickstart.md` Phase 1 (three browsers, distinct densities); record pass in `specs/changes/042-per-display-iframe-layout/checklists/requirements.md` notes.

---

## Phase 4: User Story 2 — Manage named layout profiles from admin (Priority: P2)

**Goal**: Content manager creates profiles, assigns to labels/kiosks; operations view shows density source (SC-003, SC-005).

**Independent Test**: Two profiles assigned to two labels; each kiosk matches profile on first iframe load without manual slider.

- [x] T036 [US2] Extend `backend/app/api/display_layout.py` with admin CRUD: `GET/POST /api/admin/display-layout/profiles`, `PUT/DELETE .../{id}` (`content_manager` RBAC).
- [x] T037 [US2] Add `GET /api/admin/display-layout/devices`, `PATCH .../devices/{id}`, `PATCH .../kiosks/{kioskId}/profile`, `GET .../live` per `data-model.md`.
- [x] T038 [US2] Emit SSE `layout_updated` from `backend/app/application/display_orchestrator/sse_hub.py` (or layout service hook) when profile assignment or org defaults change; document in `specs/changes/042-per-display-iframe-layout/contracts/embed-density-protocol.md` if payload tweaks needed.
- [x] T039 [US2] Handle `layout_updated` in `frontend/src/app/display/display-stream.service.ts` and refresh density via `DisplayLayoutService` + `bull:config` without full page reload.
- [x] T040 [US2] Add `embed_density_defaults` editor to `frontend/src/app/features/display-config/display-config.component.ts` and wire PUT in `frontend/src/app/core/api/display.api.ts`.
- [x] T041 [P] [US2] Add optional `embed_app_family` field to iframe admin form in `frontend/src/app/features/iframes/iframe-form.component.ts` and backend iframe schemas.
- [x] T042 [US2] Create `frontend/src/app/features/display-layout/` module with profile list/form components and device assignment UI (routes in `frontend/src/app/app.routes.ts`, nav entry in `frontend/src/app/features/admin-shell/admin-navigation.service.ts`).
- [x] T043 [US2] Extend `frontend/src/app/features/dashboard/dashboard.facade.ts` and `operations-hero.component.ts` (or new column) to show connected kiosk display label, effective density, and source chip per SC-005.
- [x] T044 [P] [US2] Extend `backend/tests/integration/test_display_layout_api.py` with profile CRUD, assign to device, and live endpoint tests.
- [x] T045 [P] [US2] Add `frontend/src/app/features/display-layout/display-layout-profile.component.spec.ts` and dashboard facade spec updates for density source display.
- [x] T046 [US2] Manual validation per `quickstart.md` Phase 2; record pass in checklist notes.

---

## Phase 5: User Story 3 — Local on-display fine tuning (Priority: P2)

**Goal**: Hidden operator control adjusts one kiosk only; persists as local override; reset restores profile/default (SC-002).

**Independent Test**: Nudge density on one kiosk via hidden panel; other kiosks and admin profile unchanged; bull global slider does not override.

- [x] T047 [US3] Add `PATCH /api/display/layout/me/overrides` and `POST /api/display/layout/me/reset` in `backend/app/api/display_layout.py` persisting `display_devices.local_overrides`.
- [x] T048 [US3] Create hidden density panel UI (slider, guardar, restablecer) in `frontend/src/app/display/display-density-panel.component.ts`; trigger via long-press top-left 3 s or `Ctrl+Shift+D` in `frontend/src/app/display/display-screen.component.ts`.
- [x] T049 [US3] Wire panel save to `DisplayLayoutService.patchLocalOverride()` and apply via iframe URL refresh or `bull:config` only (avoid full `/display` reload when possible).
- [x] T050 [P] [US3] Extend `frontend/src/app/display/display-screen.component.spec.ts` asserting panel hidden until gesture; save calls PATCH.
- [x] T051 [US3] Extend `backend/tests/integration/test_display_layout_api.py` for override PATCH, reset, and precedence `local_override` over profile.
- [x] T052 [US3] Manual validation per `quickstart.md` Phase 3 (global bull admin slider does not clobber calibrated kiosk); record pass in checklist notes.

---

## Phase 6: Polish — Joint E2E gate & consolidation

**Purpose**: TQ-004 joint acceptance, audit optional, contract consolidation.

**Gate G3**: SC-006 E2E passes for bull + escalabirras across three aspect ratios.

- [x] T053 [P] Emit optional `display_layout_calibrated` and `display_layout_reset` audit events from `backend/app/application/display_layout/service.py` per `contracts/contract-deltas.md`.
- [x] T054 [P] Add OpenAPI assertions for new layout paths in `backend/tests/contract/test_display_layout_openapi.py`.
- [x] T055 Run `pytest backend/tests/unit/test_embed_density_resolver.py backend/tests/integration/test_display_layout_api.py -v` and `npm --prefix frontend run test -- --include='**/display-layout**' --include='**/display-screen**'`.
- [x] T056 Run `npm --prefix frontend run build` and `docker build -f backend/Dockerfile backend`.
- [x] T057 Execute full manual E2E per `specs/changes/042-per-display-iframe-layout/quickstart.md` Phase 4 (bull + escalabirras × 16:9, 21:9, 4:3); record SC-006 sign-off in checklist notes.
- [x] T058 Consolidate accepted behavior from `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md` into active contracts (final pass) and set CHG-042 `status: implemented` in `specs/changes/042-per-display-iframe-layout/spec.md` and `specs/manifest.yml`.
- [x] T059 Update `specs/changes/042-per-display-iframe-layout/context-pack.md` with final code paths and test commands post-implementation.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T006) → Phase 2 (T007–T019) → Phase 3 US1 (T020–T035)
  → Phase 4 US2 (T036–T046) → Phase 5 US3 (T047–T052) → Phase 6 (T053–T059)
```

- **US2** depends on US1 (`DisplayLayoutService`, register label, iframe URL injection).
- **US3** depends on US1 backend overrides API surface; can start after T020–T023.
- **Sibling tasks T031–T034** block G1 exit for US1 (TQ-004).

### User story completion order

| Story | Depends on | Gate |
|-------|------------|------|
| US1 (P1) | Phase 2 | G1 — per-kiosk density + sibling override |
| US2 (P2) | US1 | Profile assign visible in dashboard |
| US3 (P2) | US1 | Hidden panel + SC-002 |
| Polish | US1–US3 | G3 — joint E2E SC-006 |

---

## Parallel execution examples

### Phase 2 (after T007 migration started)

```text
Parallel: T008, T009, T010, T011 (models) → T014, T016 (resolver + tests)
```

### Phase 3 US1

```text
Parallel: T022 + T024 (frontend models/specs) while T020–T021 (backend API)
Parallel: T031 + T032 (sibling repos) after T027 protocol is stable
```

### Phase 4 US2

```text
Parallel: T041 (iframe family field) + T042 (admin module scaffold)
Parallel: T044 + T045 (tests) after T036–T037 APIs land
```

---

## Implementation strategy

### MVP (User Story 1 only)

1. Complete Phase 1–2 (contracts + DB + resolver).
2. Complete Phase 3 through T035 (kiosk-screen + sibling embed override).
3. **STOP and validate** G1 / SC-001 before admin profile UI (US2).

### Incremental delivery

1. Phase 1–2 → resolver tested.
2. US1 → multi-screen calibration works end-to-end with bull.
3. US2 → repeatable event setup via profiles.
4. US3 → on-site fine tuning without admin login.
5. Phase 6 → production gate with escalabirras + aspect ratio matrix.

---

## Task summary

| Phase | Task IDs | Count |
|-------|----------|-------|
| SDD Governance | T001–T006 | 6 |
| Foundational | T007–T019 | 13 |
| US1 (P1) | T020–T035 | 16 |
| US2 (P2) | T036–T046 | 11 |
| US3 (P2) | T047–T052 | 6 |
| Polish | T053–T059 | 7 |
| **Total** | **T001–T059** | **59** |

**Suggested MVP scope**: Phase 1 + Phase 2 + Phase 3 (T001–T035).

**Parallel opportunities**: 18 tasks marked `[P]`.

**Format validation**: All 59 tasks use `- [ ]`, sequential IDs, story labels on US phases, and explicit file paths.
