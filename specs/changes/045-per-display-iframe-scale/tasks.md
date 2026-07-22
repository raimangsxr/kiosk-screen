---
description: "Task list for CHG-045 per-display iframe scale"
---

# Tasks: Per-Display Iframe Scale

**Input**: Design documents from `/specs/changes/045-per-display-iframe-scale/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — resolver unit, display-scales/devices integration, iframe admin specs, display-screen runtime specs, and manual quickstart.

**Organization**: SDD governance → foundational DB + resolver → US1 kiosk runtime (MVP) → US2 default fallback → US3 admin iframe UX → polish & consolidation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US3 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Backend resolver: `backend/app/application/iframe_scale_resolver.py`
- Iframe runtime: `backend/app/application/iframe_runtime.py`
- Display devices: `backend/app/services/display_device_service.py`, `backend/app/api/display_devices.py`
- Iframe API: `backend/app/api/iframes.py`
- Stream register: `backend/app/api/display_stream.py`
- Frontend iframes: `frontend/src/app/features/iframes/`
- Frontend display: `frontend/src/app/display/`
- Contracts: `specs/contracts/{iframes-video-end,display-runtime,display-config-session}/contract.md`
- Change: `specs/changes/045-per-display-iframe-scale/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas and accept ADR before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T007 complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/045-per-display-iframe-scale/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md}`.
- [x] T002 Merge IFRAMES.VIDEO_END section from `specs/changes/045-per-display-iframe-scale/contracts/contract-deltas.md` into `specs/contracts/iframes-video-end/contract.md` (remove per-kiosk non-goal; add override APIs).
- [x] T003 [P] Merge DISPLAY.RUNTIME section from `specs/changes/045-per-display-iframe-scale/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md`.
- [x] T004 [P] Merge DISPLAY.CONFIG_SESSION section from `specs/changes/045-per-display-iframe-scale/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md`.
- [x] T005 Create `docs/adr/0013-per-display-iframe-scale.md` documenting client-side scale resolution and `iframe_scale_updated` SSE (supersedes ADR-0012 per-kiosk non-goal).
- [x] T006 Add CHG-045 entry `status: in-progress` to `specs/manifest.yml` with `related_changes` on `IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, and `DISPLAY.CONFIG_SESSION`.
- [x] T007 Set `status: in-progress` in `specs/changes/045-per-display-iframe-scale/spec.md` frontmatter.

---

## Phase 2: Foundational — Data model & resolver (blocking)

**Purpose**: Shared persistence and effective-scale resolution for all user stories.

**Independent Test**: `pytest backend/tests/unit/test_iframe_scale_resolver.py -v` passes; `alembic upgrade head` applies `0024`.

**Gate G0** (exit Phase 2): Resolver returns override when row exists, else iframe default (`source: override | default`).

- [x] T008 Create Alembic migration `backend/alembic/versions/0024_per_display_iframe_scale.py` adding `display_devices`, `iframe_display_scale_overrides`, and `kiosk_connections.display_device_id` per `specs/changes/045-per-display-iframe-scale/data-model.md`.
- [x] T009 [P] Create `backend/app/repositories/models/display_device.py` SQLAlchemy model for `display_devices`.
- [x] T010 [P] Create `backend/app/repositories/models/iframe_display_scale_override.py` SQLAlchemy model for `iframe_display_scale_overrides`.
- [x] T011 [P] Add `display_device_id` FK to `backend/app/repositories/models/kiosk_connection.py`; export new models in `backend/app/repositories/models/__init__.py`.
- [x] T012 Create `backend/app/repositories/display_devices.py` with list/upsert-by-label/get-by-id for organization scope.
- [x] T013 Create `backend/app/repositories/iframe_display_scale_overrides.py` with get/list/batch-upsert/clear-by-iframe helpers.
- [x] T014 Implement `backend/app/application/iframe_scale_resolver.py` with `resolve_effective_scale(display_device_id, iframe)` returning `scaleX`, `scaleY`, and `source` per `data-model.md`.
- [x] T015 Implement `backend/app/services/display_device_service.py` with manual create, rename label, delete (cascade), and upsert-on-register by `(organization_id, label)`.
- [x] T016 [P] Create `backend/tests/unit/test_iframe_scale_resolver.py` covering override present, absent (default), bounds validation, and iframe-delete cascade fixtures.
- [x] T017 Add Pydantic schemas in `backend/app/api/schemas.py` and mappers in `backend/app/api/mappers.py` for `DisplayScaleEntry`, `DisplayDeviceSchema`, and batch override input.
- [x] T018 Extend `backend/app/api/display_stream.py` `register_kiosk` to reject empty/missing `label` with `422`; upsert `display_devices` from non-empty `label`, link `kiosk_connections.display_device_id`, and return `displayDeviceId` in `KioskRegisterResponse`.
- [x] T019 Create `backend/app/api/display_devices.py` with `GET/POST/PATCH/DELETE /api/admin/display-devices` (`content_manager` RBAC) and register router in `backend/app/api/v1/router.py`.
- [x] T020 Run `alembic upgrade head` and `pytest backend/tests/unit/test_iframe_scale_resolver.py -v` in local lab.

---

## Phase 3: User Story 1 — Configure scale per physical display (Priority: P1) 🎯 MVP

**Goal**: Three kiosks with distinct labels render the same iframe at different `scaleX`/`scaleY` within 5s of saving override (SC-001).

**Independent Test**: Open three `/display` clients; save distinct overrides via `PUT /iframes/{id}/display-scales` (API); each kiosk CSS scale vars differ; reload restores values. Admin matrix UI validated in US3 (T046).

**Gate G1** (exit Phase 3): Connected kiosk applies per-display override on `show_iframe` and live-updates on `iframe_scale_updated`.

- [x] T021 [US1] Add `PUT /iframes/{iframe_id}/display-scales` batch upsert/clear endpoint in `backend/app/api/iframes.py` per `data-model.md`.
- [x] T022 [US1] Extend `backend/app/services/iframe_service.py` with `list_display_scales` (join live kiosk registry for `connected` flag), `batch_save_display_scales` (last-write-wins), and org-scoped validation (0.1–5.0).
- [x] T023 [US1] Implement `emit_iframe_scale_updated` in `backend/app/application/iframe_runtime.py`; call after override save when active iframe matches; emit to operator session SSE hub.
- [x] T024 [US1] Add `GET /api/display/iframe-scales/me` kiosk endpoint in `backend/app/api/display_stream.py` returning override map for resolved `displayDeviceId`.
- [x] T025 [P] [US1] Create `backend/tests/integration/test_iframe_display_scales_api.py` with tests: batch save overrides, clear row, org isolation, concurrent last-write-wins, active-iframe SSE side effect, and register-without-label `422`.
- [x] T026 [P] [US1] Create `frontend/src/app/display/iframe-scale.service.ts` to fetch/cache overrides from register + `GET /api/display/iframe-scales/me` and expose `resolveScale(iframeId, defaultScaleX, defaultScaleY)`.
- [x] T027 [US1] Extend `frontend/src/app/display/display-stream.models.ts` with `IframeScaleUpdatedPayload` and `displayDeviceId` on `KioskRegisterResponse`.
- [x] T028 [US1] Extend `frontend/src/app/display/display-stream.service.ts` to store `displayDeviceId` from register and handle `iframe_scale_updated` events.
- [x] T029 [US1] Update `frontend/src/app/display/display-screen.component.ts` and `frontend/src/app/display/display-viewer.controller.ts` to apply resolved effective scale via `IframeScaleService` on `show_iframe`, `iframe_scale_updated`, snapshot, and SSE-degraded polling paths.
- [x] T030 [P] [US1] Extend `frontend/src/app/display/display-screen.component.spec.ts` and `frontend/src/app/display/display-viewer.controller.spec.ts` asserting distinct `--iframe-scale-x/y` per mocked override map including snapshot payload.
- [x] T031 [US1] Manual validation per `specs/changes/045-per-display-iframe-scale/quickstart.md` section 2a (API-driven overrides, ≤5s timing); record pass in `specs/changes/045-per-display-iframe-scale/checklists/requirements.md` notes.

---

## Phase 4: User Story 2 — Use iframe default when no display override (Priority: P2)

**Goal**: Displays without override rows use iframe default; default updates propagate to non-overridden displays (SC-002, SC-003, FR-009).

**Independent Test**: One display with override, one without; change iframe default; only non-overridden display updates on live refresh.

- [x] T032 [US2] Ensure `backend/app/services/iframe_service.py` `delete` cascades `iframe_display_scale_overrides` via FK or explicit cleanup (FR-011).
- [x] T033 [US2] Verify `backend/app/application/iframe_runtime.py` `refresh_active_iframe_display` re-emits `show_iframe` on iframe default scale `PUT`; document that kiosks without override pick up new defaults client-side.
- [x] T034 [P] [US2] Extend `backend/tests/integration/test_iframe_display_scales_api.py` with scenarios: no override row → effective default; iframe default `PUT` + no override; iframe delete removes override rows.
- [x] T035 [P] [US2] Extend `backend/tests/unit/test_iframe_scale_resolver.py` with multi-display independence cases (same iframe, different devices).
- [x] T036 [US2] Manual validation per `specs/changes/045-per-display-iframe-scale/quickstart.md` section 6; record pass in checklist notes.

---

## Phase 5: User Story 3 — See and manage scale from iframe admin (Priority: P3)

**Goal**: Iframe list shows every known display with effective scale and source; edit-form matrix saves/clears overrides (SC-004, FR-007a, FR-010).

**Independent Test**: Iframe list shows Pantalla A/B with `override`/`default` chips; matrix edit updates list and connected kiosk.

- [x] T037 [US3] Extend `GET /iframes` and `GET /iframes/{id}` in `backend/app/api/iframes.py` to include `displayScales[]` on each iframe via `iframe_service.list_display_scales`.
- [x] T038 [US3] Create `frontend/src/app/core/api/display-device.api.ts` for `GET/POST/PATCH/DELETE /api/admin/display-devices`.
- [x] T039 [US3] Extend `frontend/src/app/core/api/iframe.api.ts` with `DisplayScaleEntry`, `putDisplayScales(iframeId, items)`, and list response types.
- [x] T040 [US3] Extend `frontend/src/app/features/iframes/iframe.facade.ts` to load/save display scale matrix and refresh list summaries.
- [x] T041 [US3] Add per-display scale summary column/section to `frontend/src/app/features/iframes/iframe-list.component.ts` (label, effective scale, source chip in Spanish).
- [x] T042 [US3] Add per-display scale matrix to `frontend/src/app/features/iframes/iframe-form.component.ts` with pre-filled defaults, per-row clear (restablecer), and batch save via `putDisplayScales`.
- [x] T043 [US3] Add manual display pre-create affordance in iframe form or minimal admin action calling `display-device.api.ts` `POST` (FR-007c).
- [x] T044 [P] [US3] Create `backend/tests/integration/test_display_devices_api.py` covering create, rename (overrides preserved), delete cascade, and org isolation.
- [x] T045 [P] [US3] Extend `frontend/src/app/features/iframes/iframe-form.component.spec.ts` for matrix save, clear row, and default pre-fill behavior.
- [x] T046 [US3] Manual validation per `specs/changes/045-per-display-iframe-scale/quickstart.md` sections 2b, 3–5 (matrix UI, disconnect-during-edit note); record pass in checklist notes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full validation, consolidation, and SDD closure.

- [x] T047 [P] Run `pytest backend/tests -k "iframe_scale or display_device or display_scales"` and fix failures.
- [x] T048 [P] Run `npm --prefix frontend run test` and fix failures in iframe/display specs.
- [x] T049 Run `npm --prefix frontend run build`.
- [x] T050 Verify FR-013: no scale calibration UI added under `frontend/src/app/display/` beyond admin-driven resolution.
- [x] T051 Reconcile active contracts in `specs/contracts/{iframes-video-end,display-runtime,display-config-session}/contract.md` with implementation deltas; update `specs/changes/045-per-display-iframe-scale/context-pack.md` entrypoints if paths changed.
- [x] T052 Set `status: implemented` in `specs/changes/045-per-display-iframe-scale/spec.md` and update CHG-045 `status: implemented` in `specs/manifest.yml`.
- [x] T053 Record final validation evidence in `specs/changes/045-per-display-iframe-scale/checklists/requirements.md` and `quickstart.md` notes.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T007)
    ↓
Phase 2 (T008–T020) — G0
    ↓
Phase 3 US1 (T021–T031) — G1 / MVP 🎯
    ↓
Phase 4 US2 (T032–T036) — depends on US1 APIs + resolver
    ↓
Phase 5 US3 (T037–T046) — depends on T021–T022 (display-scales API); list UI can start after T037
    ↓
Phase 6 (T047–T053)
```

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 (P1) | Phase 2 complete | T020 |
| US2 (P2) | US1 runtime path | T031 |
| US3 (P3) | display-scales API (T021–T022), device API (T019) | T022 |

### Parallel Opportunities

**Phase 1**: T003 ∥ T004 (distinct contract files)

**Phase 2**: T009 ∥ T010 ∥ T011 (models); T016 after T014

**Phase 3**: T025 ∥ T026 (backend integration ∥ frontend service); T030 after T029

**Phase 4**: T034 ∥ T035

**Phase 5**: T044 ∥ T045; T041 ∥ T042 after T039–T040

**Phase 6**: T047 ∥ T048

### Parallel Example: User Story 1

```bash
# After T022 completes:
Task T025: backend/tests/integration/test_iframe_display_scales_api.py
Task T026: frontend/src/app/display/iframe-scale.service.ts

# After T029 completes:
Task T030: frontend/src/app/display/display-screen.component.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2 → Phase 3 (T001–T031).
2. **STOP and VALIDATE**: three-kiosk distinct scale test via API (`quickstart.md` §2a, ≤5s).
3. Admin matrix polish ships in US3 (T042–T046).

### Incremental Delivery

1. Phase 1–2 → foundation ready
2. US1 → kiosk runtime works (MVP)
3. US2 → default fallback guarantees backward compatibility
4. US3 → full admin UX (list + matrix + device pre-create)
5. Phase 6 → ship

---

## Notes

- Do not reintroduce CHG-042 embed density (`embed_app_height_px`, `bull:config`, layout profiles).
- Matrix UX: pre-filled defaults are placeholders; only explicit saves create override rows (`research.md` R6).
- Kiosk resolves scale client-side; `show_iframe` payload keeps iframe defaults (`research.md` R3).
- US1 MVP validates overrides via API (`quickstart.md` §2a); matrix UI validates in US3 (`quickstart.md` §2b).
- Analysis remediation (2026-07-22): issues I1–G2 resolved across spec, tasks, quickstart, data-model, contracts, research, context-pack, plan.
- Total tasks: **53** (T001–T053).
