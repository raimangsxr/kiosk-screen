---
description: "Task list for CHG-052 device QR login"
---

# Tasks: Activación de pantalla con código y QR

**Input**: Design documents from `specs/changes/052-device-qr-login/`  
**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/contract-deltas.md`, `quickstart.md`

**Tests**: Mandatory per TQ-002 — backend unit/integration + frontend specs for changed behavior; manual quickstart for SC-001, SC-004, SC-006.

## Format reference

```text
- [ ] T001 [P] [US1] Description with exact file path
```

---

## Phase 1: SDD Governance & Context

**Purpose**: Contract-first gate before code changes.

- [X] T001 Read `specs/manifest.yml` and `specs/changes/052-device-qr-login/context-pack.md`; confirm affected contracts `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION`; verify `backend/app/api/auth.py` routes mount via `backend/app/api/v1/auth/routes.py` → `api_router` → `/api` in `backend/app/main.py` (no separate mount needed)
- [X] T002 Merge `specs/changes/052-device-qr-login/contracts/contract-deltas.md` into `specs/contracts/auth-rbac/contract.md` (device-activation endpoints, code policy, login coexistence, rate limit)
- [X] T003 Merge display delta into `specs/contracts/display-config-session/contract.md` (activation → `/display`, supersede, label timing)
- [X] T004 Add CHG-052 entry to `specs/manifest.yml` (`status: draft`, `modifies: [AUTH.RBAC, DISPLAY.CONFIG_SESSION]`)
- [X] T005 Create `docs/adr/0014-device-activation-flow.md` (Redis pairing, RFC 8628 poll cookie issuance, threat model for 6-letter codes)
- [X] T006 [P] Add `qrcode` dependency to `frontend/package.json` and lockfile for client-side QR generation on login

**Checkpoint**: Contracts and ADR updated — implementation may begin.

---

## Phase 2: Foundational — Backend device activation (blocking)

**Goal**: Redis store + service + API routes for start/authorize/poll.  
**Independent test**: Unit tests pass for code generation, authorize RBAC, poll states without frontend.

### Tests

- [X] T007 [P] Create `backend/tests/unit/test_device_activation.py` — userCode format A–Z×6; start returns deviceCode; authorize requires `can_open_display`; poll pending → authorized sets cookie; expired/invalid/not-found; single-use consume; rememberMe forwarded; inactive user rejected on authorize (FR-015)

### Implementation

- [X] T008 Implement Redis store in `backend/app/auth/device_activation_store.py` — keys `device_activation:user:{code}` and `device_activation:device:{uuid}`; TTL 900 s; atomic authorize (pending → authorized)
- [X] T009 Implement `ActivationRateLimiter` in `backend/app/auth/session_store.py` (10 failures / 15 min / IP; mirror `LoginRateLimiter` API)
- [X] T010 Implement business logic in `backend/app/auth/device_activation_service.py` — `start()`, `authorize()`, `poll()`; `secrets` userCode generation; `can_open_display` check; `issue_user_session` on successful poll
- [X] T011 Add Pydantic schemas in `backend/app/api/schemas.py` — `DeviceActivationStartResponse`, `DeviceActivationAuthorizeRequest`, `DeviceActivationPollRequest`, poll status union
- [X] T012 Register routes in `backend/app/api/auth.py` — `POST /device-activation/start`, `/authorize`, `/poll`; wire rate limiter on authorize failures; error envelope codes (`activation_expired`, `activation_not_found`, `activation_forbidden`)
- [X] T013 ~~Mount routes in `main.py`~~ **N/A** — confirmed in T001: new routes in `auth.py` are picked up by existing v1 router; no `main.py` change required

**Checkpoint G1**: `pytest backend/tests/unit/test_device_activation.py -v` green.

---

## Phase 3: User Story 1 — Activar quiosco desde móvil (P1)

**Goal**: QR + código en `/login`; móvil autoriza; quiosco recibe sesión y va a `/display` sin hall (FR-001–FR-005, FR-013, FR-014).  
**Independent test**: Integration test start → authorize → poll → `GET /auth/me` on kiosk client; manual quickstart § happy path.

### Tests

- [X] T014 [P] [US1] Create `backend/tests/integration/test_device_activation_flow.py` — full happy path with TestClient + cookie jar; poll interval respected; session cookie valid for `/api/auth/me`
- [X] T015 [P] [US1] Create `frontend/src/app/core/auth/device-activation.service.spec.ts` — start stores deviceCode; poll loop stops on authorized; calls `AuthService` hydrate; navigates to `/display`; on network error retries poll; on reconnect after expiry calls `start()` again (edge case C6)
- [X] T016 [P] [US1] Create `frontend/src/app/auth/activate.component.spec.ts` — pre-fills `?code=` query; shows login when unauthenticated; authorize success shows confirmation (no router navigate)

### Implementation

- [X] T017 [US1] Implement `frontend/src/app/core/auth/device-activation.service.ts` — `start()`, `poll(deviceCode)`, QR data URL via `qrcode`; 2 s interval; cleanup on destroy; retry on transient network errors; `start()` refresh after expiry on reconnect
- [X] T018 [US1] Create `frontend/src/app/auth/activate.component.ts` — code input, inline login (reuse `AuthService.login` with rememberMe), confirm → `authorize(userCode)`, success view «Pantalla activada» (FR-018); mobile-responsive layout and a11y labels (FR-017)
- [X] T019 [US1] Add `/activate` route in `frontend/src/app/app.routes.ts` (no `sessionGuard`; public navigation)
- [X] T020 [US1] Refactor `frontend/src/app/auth/login.component.ts` — default tab `activation` with QR + userCode + waiting state (FR-009 copy: «Activa desde tu móvil»); secondary toggle to credentials; start poll on init when unauthenticated; stop poll on tab switch or destroy (client `abandoned`)
- [X] T021 [US1] On poll `authorized` in `frontend/src/app/auth/login.component.ts` — hydrate auth, `router.navigateByUrl('/display')` (skip hall)
- [X] T022 [US1] Verify `frontend/src/app/display/display-screen.component.ts` still calls `openDisplay()` on init so activation path supersedes sessions (no duplicate open logic in activation service)
- [X] T043 [P] [US1] Extend `frontend/src/app/auth/login.component.spec.ts` — FR-009: waiting state shows userCode, QR, and mobile activation hint with `aria-live` or equivalent accessible status region

**Checkpoint G2/G3**: Integration test green; manual quickstart happy path (QR) passes.

---

## Phase 4: User Story 4 — Errores y seguridad (P1)

**Goal**: Códigos expirados/usados, permisos, rate limit, concurrencia (FR-008, FR-011, FR-012, FR-016).  
**Independent test**: Unit/integration tests for each failure mode; quickstart § expiry, permission denied, rate limit.

### Tests

- [X] T023 [P] [US4] Extend `backend/tests/unit/test_device_activation.py` — expired code on authorize; reused code; concurrent authorize (first wins); rate limit 429 after 10 failures
- [X] T024 [P] [US4] Extend `backend/tests/integration/test_device_activation_flow.py` — user without `event_operator`/`administrator` gets 403; poll stays pending until authorize; deactivated user login succeeds on mobile but authorize returns 403/401 without kiosk session (FR-015)
- [X] T025 [P] [US4] Extend `frontend/src/app/auth/activate.component.spec.ts` — displays server error messages for expired/invalid/forbidden codes

### Implementation

- [X] T026 [US4] Implement expiry rotation in `frontend/src/app/core/auth/device-activation.service.ts` — on poll `expired` or local countdown, call `start()` again and refresh QR in `frontend/src/app/auth/login.component.ts`
- [X] T027 [US4] Add user-facing Spanish error copy in `frontend/src/app/auth/activate.component.ts` and waiting/error states in `frontend/src/app/auth/login.component.ts` (no internal paths in messages)
- [X] T028 [US4] Harden `backend/app/auth/device_activation_service.py` — normalize userCode (trim, uppercase); generic error text on authorize to avoid code enumeration; reject authorize when authorizing user becomes inactive before poll (FR-015)
- [ ] T045 [US4] Extend `frontend/src/app/core/auth/device-activation.service.spec.ts` and `device-activation.service.ts` — simulate offline poll failure then online recovery; expired code triggers automatic `start()` and QR refresh (edge case C6)

**Checkpoint G4**: Rate limit + expiry tests green.

---

## Phase 5: User Story 2 — Activación manual sin QR (P2)

**Goal**: `/activate` sin escanear; validación formato código (FR-003, US2 acceptance).  
**Independent test**: Manual quickstart § manual code entry; component test for invalid format client-side.

### Tests

- [X] T029 [P] [US2] Extend `frontend/src/app/auth/activate.component.spec.ts` — rejects &lt;6 chars, lowercase, digits before submit; accepts valid 6-letter code

### Implementation

- [X] T030 [US2] Add client-side validators and uppercase normalization in `frontend/src/app/auth/activate.component.ts` aligned with `^[A-Z]{6}$`
- [X] T031 [US2] Ensure QR encodes `/activate?code={userCode}` in `frontend/src/app/core/auth/device-activation.service.ts` (same origin URL builder)

**Checkpoint**: Manual code path matches QR path end-to-end.

---

## Phase 6: User Story 3 — Login clásico en quiosco (P2)

**Goal**: Credenciales secundarias; redirect a `/hall` sin cambios (FR-006, FR-007, SC-005).  
**Independent test**: `login.component.spec.ts` credential submit navigates to `/hall`; activation tab not shown after login.

### Tests

- [X] T032 [P] [US3] Extend `frontend/src/app/auth/login.component.spec.ts` — default view is activation tab; toggle shows credentials; successful credential login navigates to `/hall` (not `/display`)

### Implementation

- [X] T033 [US3] Ensure credential `submit()` in `frontend/src/app/auth/login.component.ts` unchanged destination `/hall`; stop device-activation poll when switching to credentials or on successful credential login
- [X] T034 [US3] Confirm `frontend/src/app/auth/session.guard.ts` and `authRootGuard` behavior unchanged for authenticated users hitting `/login`

**Checkpoint**: SC-005 auth regression suite green.

---

## Phase 7: User Story 5 — Confirmación en móvil (P2) — verification only

**Goal**: Confirm FR-018 (success screen, no redirect). Implementation is in T016/T018; this phase adds regression tests and polish only (issue D1).

**Independent test**: `activate.component.spec.ts` no `Router.navigate` after success.

### Tests

- [X] T035 [P] [US5] Extend `frontend/src/app/auth/activate.component.spec.ts` — assert no navigation to `/hall`, `/admin`, or `/display` after success; success message visible

### Implementation

- [X] T036 [US5] Polish success template in `frontend/src/app/auth/activate.component.ts` — static confirmation copy, optional dismiss only (no auto-redirect)
- [ ] T044 [P] [US5] Extend `frontend/src/app/auth/activate.component.spec.ts` — FR-017 smoke: form controls have associated labels; primary button meets min touch target in template (use harness or DOM assertion)

**Checkpoint**: US5 acceptance scenarios pass in spec.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Supersede integration, full regression, documentation closure.

- [ ] T037 Extend `backend/tests/integration/test_device_activation_flow.py` — after activation poll, `POST /display/open` supersedes prior operator session (session_ended semantics) per clarification Q2
- [ ] T046 Execute SC-006 soak per `specs/changes/052-device-qr-login/quickstart.md` § SC-006 — 8 h lab rotation or accelerated TTL proxy; confirm no orphan cross-kiosk pairing
- [ ] T047 Execute SC-001 / SC-004 acceptance protocol per `quickstart.md` § Acceptance metrics — timed E2E (≥5 operators for SC-004); record results
- [X] T038 [P] Run narrow tests: `pytest backend/tests/unit/test_device_activation.py backend/tests/integration/test_device_activation_flow.py -v` and `npm --prefix frontend run test -- --include='**/device-activation**' --include='**/activate.component**' --include='**/login.component**'`
- [X] T039 Run broader validation: `pytest backend/tests` and `npm --prefix frontend run test` and `npm --prefix frontend run build`
- [ ] T040 Execute remaining manual scenarios in `specs/changes/052-device-qr-login/quickstart.md` (happy path, expiry, supersede, permission denied, credential regression, network recovery); record pass/fail in `specs/changes/052-device-qr-login/checklists/requirements.md` Notes
- [ ] T041 Update `specs/changes/052-device-qr-login/spec.md` status to `implemented` and `specs/manifest.yml` CHG-052 status when all gates pass

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T006) ──blocks──► Phase 2 (T007–T013)
                                      │
                                      ▼
                               Phase 3 US1 (T014–T022) ◄── MVP
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              Phase 4 US4       Phase 5 US2       Phase 6 US3
              (T023–T028)       (T029–T031)       (T032–T034)
                    │                 │                 │
                    └────────┬────────┴────────┬────────┘
                             ▼                 ▼
                       Phase 7 US5        Phase 8 Polish
                       (T035–T036,       (T037–T041,
                        T044)             T046–T047)
```

| Story | Depends on | Can parallelize after |
|-------|------------|------------------------|
| US1 | Phase 2 complete | — (MVP core) |
| US4 | US1 backend + activate component | T022 |
| US2 | US1 activate component | T018 |
| US3 | US1 login refactor | T020 |
| US5 | US1 activate component | T018 |

---

## Parallel Execution Examples

### After Phase 2 (backend ready)

```text
Parallel: T014 (integration test skeleton) + T017 (device-activation.service.ts)
Parallel: T015 + T016 (frontend spec files)
```

### After US1 implementation (T022)

```text
Parallel: T023–T025 (US4 tests) + T029 (US2 test) + T032 (US3 test)
Parallel: T026–T028 (US4 impl) + T030–T031 (US2 impl) + T033–T034 (US3 impl)
```

---

## Implementation Strategy

### MVP (deployable increment)

**Phase 1 + Phase 2 + Phase 3 (US1)** — T001–T022: end-to-end QR activation with integration test. Delivers primary venue workflow.

### Incremental delivery

1. Governance + backend (T001–T013)
2. US1 happy path (T014–T022) — **MVP**
3. US4 hardening (T023–T028)
4. US2, US3, US5 polish (T029–T036) — can ship as fast follow
5. Validation gate (T037–T041, T046–T047)

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 SDD Governance | T001–T006 (6) | — |
| 2 Foundational backend | T007–T013 (7) | — |
| 3 US1 | T014–T022, T043 (10) | P1 |
| 4 US4 | T023–T028, T045 (7) | P1 |
| 5 US2 | T029–T031 (3) | P2 |
| 6 US3 | T032–T034 (3) | P2 |
| 7 US5 | T035–T036, T044 (3) | P2 (verify) |
| 8 Polish | T037–T041, T046–T047 (7) | — |
| **Total** | **46 tasks** (T013 N/A) | |

### Independent test criteria

| Story | How to verify alone |
|-------|---------------------|
| US1 | `test_device_activation_flow.py` happy path + quickstart QR § |
| US4 | Unit tests T023 + quickstart expiry/permission/rate-limit/inactive § |
| US2 | `activate.component.spec.ts` format + quickstart manual code § |
| US3 | `login.component.spec.ts` hall redirect + quickstart credentials § |
| US5 | `activate.component.spec.ts` no redirect after success |

### Parallel opportunities

- **15 tasks** marked `[P]` can run in parallel within their phase once prerequisites complete (T006, T007, T014–T016, T023–T025, T029, T032, T035, T038, T043–T045).
- Backend (Phase 2) and frontend service scaffolding (T017) can overlap after T012 lands.

---

## Notes

- Do not read `specs/archive/**` unless justified.
- `deviceCode` must never appear in kiosk UI (research R4).
- Session supersede is delegated to existing `open_display` — do not duplicate in device-activation service.
- Spanish UI strings only (project convention).
- Post-analyze remediation (2026-08-06): C1–C6, I1, I2, U1, D1, A1 addressed in spec/tasks/quickstart.
