# Implementation Plan: Public Content API with Novelty Priority

**Branch**: `009-public-content-api` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-public-content-api/spec.md` and clarifying session 2026-06-18.

## Summary

Add a public, bearer-authenticated REST endpoint that allows external systems to upload photos and videos to a running kiosk. API keys are managed from the existing admin site. New uploads are appended to the rotation with a server-computed `displayOrder` and prioritized as a "novelty" by the running kiosk, which polls `GET /api/display/state` every 5 seconds plus a 1-second pre-transition poll to catch last-moment uploads. Concurrency is serialized per organization via a Postgres transactional advisory lock, guaranteeing contiguous, gap-free `displayOrder` values. The feature introduces one new persisted entity (`ApiKey`), one new endpoint group (`/api/public/content/...` and `/api/admin/api-keys/...`), a kiosk client-side novelty queue, and a new admin section. No existing entity changes shape. No new Python or Node dependencies are introduced.

## Technical Context

**Language/Version**: Python 3.12 (backend, existing toolchain), TypeScript with the Angular-supported version pinned in `frontend/package.json` (frontend, existing toolchain).

**Primary Dependencies**:
- Backend: FastAPI (existing), SQLAlchemy 2.x (existing), Alembic (existing), Pydantic (existing), `hashlib` + `secrets` from the standard library, `fastapi.security.HTTPBearer` (bundled with FastAPI), `fastapi.middleware.cors.CORSMiddleware` (bundled with FastAPI). No new Python packages.
- Frontend: Angular standalone components (existing), RxJS (existing), Angular Material (existing), no new npm packages.

**Storage**:
- PostgreSQL remains the source of truth (existing). The feature adds one new table `api_keys` via migration `0003_api_keys.py`. No existing table changes shape.
- Disk-backed media storage remains as implemented by `MediaStorageService` (existing). Files are written under `<MEDIA_STORAGE_PATH>/<organization_id>/<media_id>-<uuid>.<ext>`.

**Testing**:
- Backend: pytest for unit and integration tests; the existing `pytest backend/tests` invocation runs both.
- Frontend: Angular Karma + Jasmine for component, facade, and service tests; the existing `npm --prefix frontend run test` invocation.
- New test categories for this feature: backend unit tests for `ApiKeyService` and the new `ContentService.append_via_public_api`; backend integration tests for `POST /api/public/content/upload` (happy + every error path + concurrency + multi-org isolation); backend integration tests for `GET/POST/DELETE /api/admin/api-keys/...`; backend migration test for `0003_api_keys.py` (upgrade/downgrade/upgrade on a seeded DB); frontend tests for `ApiKeysFacade` and the kiosk novelty-queue state machine.

**Target Platform**:
- Backend: Linux server, runs under uvicorn (existing), deployable via the existing Docker image and Kubernetes assets.
- Frontend: browser-based web application, desktop and tablet viewports (existing constraint).

**Project Type**: Web application with separate frontend and backend packages in one repository (existing).

**Performance Goals**:
- Public upload p95 latency (server time only): ≤ 500 ms for files up to the size limit on a single uvicorn worker.
- End-to-end latency from `201` to the new item first rendered on the running kiosk: ≤ 6 s at p95 (spec SC-001).
- 20 concurrent uploads to the same organization complete in ≤ 10 s wall clock with contiguous `displayOrder` (SC-002).
- 100 concurrent uploads to the same organization complete with no errors and no `displayOrder` collisions (SC-003).
- 200 sequential uploads all appear on the running kiosk in arrival order, no drops or duplicates (SC-004).
- API key admin actions (create, list, rotate, revoke) complete in ≤ 60 s end-to-end for a human operator (SC-005).
- Polling: kiosk polls `GET /api/display/state` every 5 s; pre-transition poll fires 1 s before each transition. Polling cost is `O(1)` SQL queries per poll (existing `get_display_state` query).

**Constraints**:
- Disk-backed media is the only allowed storage; no S3, no CDN.
- Polling is the only allowed live-update mechanism; no SSE, no WebSocket, no long-polling.
- CORS is opt-in per deployment via `PUBLIC_API_CORS_ORIGINS`; default is empty (same-origin only).
- Existing error envelope (`code`, `message`, `category`, `details`) is reused for all new endpoints.
- All user-facing error messages must remain safe (no internal paths, secrets, raw session data, or stack traces) per FR-017.
- API key rotation is in-place (same `id` and `label`); the previous raw value is invalidated immediately.
- `lastUsedAt` is updated only on a successful 201 response; failed uploads do not update it.

**Scale/Scope**:
- One new persisted table (`api_keys`).
- One new endpoint group (public, 1 endpoint) and one new admin endpoint group (4 endpoints).
- One new admin section in the frontend (`/admin/api-keys`).
- Modified kiosk display component (state machine rewrite, polling pre-transition hook).
- One new Alembic migration.
- No new third-party dependencies.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan references `spec.md` (38 FRs, 10 SCs, 5 user stories, 13 clarifications) and is traceable to every FR.
- **Requirement clarity**: PASS. The 2026-06-18 clarification session resolved 5 high-impact ambiguities; no `[NEEDS CLARIFICATION]` markers remain.
- **Plan alignment**: PASS. The technical approach implements the spec without speculative features. The big-bang `005-admin-refactor` release is untouched; this feature ships on its own branch.
- **Simplicity**: PASS. No new dependencies, no new abstractions beyond what the spec requires. Reuses existing services (`MediaStorageService`, `ContentService`, `DisplayEventRepository`).
- **Contracts**: PASS. Four contract documents under `specs/009-public-content-api/contracts/` cover the public endpoint, the admin endpoints, the admin UI, and the kiosk live update.
- **Testing**: PASS. Backend unit + integration + migration tests; frontend facade + component + service tests. Manual smoke validation recorded in `quickstart.md`.
- **Security, observability, accessibility**: PASS. Least-privilege role preserved; API key hashing with `sha256` and constant-time compare; `lastUsedAt` semantics pinned; `DisplayEvent` audit trail for both content changes and key lifecycle; CORS opt-in; safe error messages; admin UI dialog traps focus and announces the raw key warning via `aria-live`.
- **No speculative scope**: PASS. Per-key scopes, key expiry, rate limiting, webhooks, public listing, public delete, encryption-at-rest, multi-region replication, and analytics are all explicitly out of scope.
- **Conflict handling**: PASS. The plan stops on conflict with the existing `005-admin-refactor` work; the spec explicitly places this feature in a separate spec folder and branch.

## Phase 0: Research

Research is captured in [research.md](./research.md). Key decisions:

- Use `fastapi.security.HTTPBearer` for the public endpoint (bundled, OpenAPI-friendly).
- Hash API keys with `hashlib.sha256`; the key has 256 bits of entropy by design, so bcrypt/argon2 are not justified.
- Store `key_prefix` plain + `key_hash`; lookup by indexed prefix, constant-time compare on the hash.
- Serialize per-organization appends with `pg_advisory_xact_lock(hashtext('content_append:' || org_id))`. Released on commit/rollback; no extra tables or rows.
- Reuse `MediaStorageService.save_upload` and add `ContentService.append_via_public_api` as a sibling of the existing `create_uploaded`.
- No new Python or Node dependencies. Standard library and existing FastAPI middleware cover all needs.

## Phase 1: Design

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/public-content-contract.md](./contracts/public-content-contract.md)
- [contracts/api-key-contract.md](./contracts/api-key-contract.md)
- [contracts/admin-ui-contract.md](./contracts/admin-ui-contract.md)
- [contracts/kiosk-live-update-contract.md](./contracts/kiosk-live-update-contract.md)
- [quickstart.md](./quickstart.md)

## Proposed Architecture

### Backend

The backend is reorganized minimally. The new code follows the existing module boundaries (capability-oriented folders under `app/api/v1/`, `app/services/`, `app/repositories/models/`).

```text
backend/app/
├── api/
│   └── v1/
│       ├── api_keys/                  # NEW
│       │   ├── routes.py
│       │   └── schemas.py
│       ├── public_content/            # NEW
│       │   ├── routes.py
│       │   └── schemas.py
│       └── router.py                 # UPDATED: include new routers
├── services/
│   ├── api_key_service.py            # NEW
│   └── content_service.py            # UPDATED: add append_via_public_api
├── repositories/
│   ├── api_keys.py                   # NEW
│   └── models/
│       └── api_key.py                # NEW
├── auth/
│   └── dependencies.py               # UPDATED: add get_api_key_principal
├── shared/
│   └── errors/
│       └── application_errors.py     # UPDATED: add typed errors for public API
└── config.py                         # UPDATED: PUBLIC_API_CORS_ORIGINS
```

Rules:

- New routes are thin: parse input, call the service, map the response. No business logic in the route handler.
- `ApiKeyService` owns key generation, hashing, verification, rotation, and revocation.
- `ContentService.append_via_public_api` owns the advisory lock, the `displayOrder = max+1` computation, the file write delegation to `MediaStorageService`, the database commit, and the display event recording.
- The advisory lock is held for the duration of the transaction only. Released automatically on commit or rollback.
- Errors raise typed `ApplicationError` subclasses; the existing `application_error_handler` produces the user-facing envelope.

### Frontend

The frontend adds a new feature folder under `src/app/features/api-keys/` and modifies the kiosk display component.

```text
frontend/src/app/
├── core/
│   ├── api/
│   │   └── api-keys.api.ts           # NEW
│   ├── routing/
│   │   └── app.routes.ts             # UPDATED: add /admin/api-keys
│   └── errors/                       # unchanged
├── shared/
│   └── contracts/
│       └── admin-contracts.ts        # UPDATED: add ApiKeyRecord type
├── features/
│   ├── api-keys/                     # NEW
│   │   ├── api-keys.api.ts
│   │   ├── api-keys.facade.ts
│   │   ├── api-keys.facade.spec.ts
│   │   ├── api-keys-list.component.ts
│   │   ├── api-keys-list.component.spec.ts
│   │   ├── api-keys-create-dialog.component.ts
│   │   ├── api-keys-create-dialog.component.spec.ts
│   │   ├── api-keys.models.ts
│   │   └── api-keys.routes.ts
│   ├── content/                      # unchanged
│   ├── users/                        # unchanged
│   └── …                             # unchanged
├── display/
│   ├── display-api.service.ts        # UPDATED: add watchState()
│   ├── display-api.service.spec.ts   # UPDATED
│   ├── display-rotation.service.ts   # UPDATED: track noveltyQueue
│   ├── display-rotation.service.spec.ts  # UPDATED
│   ├── display-screen.component.ts   # UPDATED: novelty queue state machine
│   └── display-screen.component.spec.ts  # UPDATED
└── admin/                            # unchanged (or routed via features/api-keys)
```

Rules:

- The `ApiKeysFacade` follows the same shape as `UsersFacade` (signals for state, observables for actions).
- The kiosk display component switches from a single-setTimeout loop to a state machine: `currentItemId`, `baseIndex`, `noveltyQueue`, `seenIds`, `transitionTimer`, `preTransitionPollTimer`. All state is reset on `ngOnInit` (kiosk open).
- The pre-transition poll is implemented as a second `setTimeout` scheduled at `duration - 1000ms` from the same `scheduleTransition()` call. It is cancelled and rescheduled whenever the transition is rescheduled.
- Material components are used for the admin dialogs, table, and forms (consistent with the rest of the admin).

## API Contracts

The contracts under `specs/009-public-content-api/contracts/` are authoritative for the implementation:

- [public-content-contract.md](./contracts/public-content-contract.md) — `POST /api/public/content/upload`, error envelope, validation, side effects.
- [api-key-contract.md](./contracts/api-key-contract.md) — `GET/POST/DELETE /api/admin/api-keys/...` and `POST /api/admin/api-keys/{id}/rotate`.
- [admin-ui-contract.md](./contracts/admin-ui-contract.md) — `/admin/api-keys` section UX, facade contract, accessibility.
- [kiosk-live-update-contract.md](./contracts/kiosk-live-update-contract.md) — kiosk client state machine, timing guarantees, edge cases.

OpenAPI output is generated from FastAPI and serves as the canonical machine-readable contract. The contract documents are the human-readable specification.

## Data Model And Migration

The data model is fully described in [data-model.md](./data-model.md). The new table `api_keys` is added by migration `0003_api_keys.py`:

```text
alembic/versions/0003_api_keys.py
  - create_table("api_keys", …)
  - create_index("ix_api_keys_organization_id", "api_keys", ["organization_id"])
```

No existing table changes. The migration is reversible (down drops the table and index). No data backfill is required.

## Security Model

- API key raw values are 32 bytes of `secrets.token_urlsafe(32)` output, prefixed with `ksk_live_` for human readability. Total length ≈ 47 characters.
- The raw value is shown to the admin exactly once, in a Material dialog with a copy-to-clipboard button and a warning banner. The dialog cannot be dismissed by Escape or click-outside while the raw key is on screen.
- The server stores only `sha256(raw_value)` (hex) and the prefix. The hash is compared with `hmac.compare_digest` to avoid timing attacks.
- Verification is performed before any I/O: a missing, malformed, or wrong-scheme `Authorization` header returns 401 without reading the file body.
- `lastUsedAt` is updated only on 201 responses. Failed uploads do not update it, so a `lastUsedAt` value is positive evidence of a successful upload.
- The advisory lock is keyed by `hashtext('content_append:' || organization_id)`. Different orgs do not block each other. A key collision with another lock is theoretically possible but harmless (worst case, unrelated writes to the same org are briefly serialized).
- CORS is configurable via `PUBLIC_API_CORS_ORIGINS`. Default is empty (no cross-origin browser access). When configured, the middleware allows `POST` with `Authorization` and `Content-Type`; credentials mode is NOT enabled.
- All errors use the safe envelope: no internal paths, no secrets, no raw session data, no stack traces.

## Observability

- `DisplayEvent` rows are appended on every successful public upload (`event_type='content_changed'`, `event_metadata->>'source'='public_api'`, `event_metadata->>'api_key_id'=<uuid>`) and on every admin action on a key (`event_type='api_key_changed'`, `event_metadata->>'action' in {create, rotate, revoke}`, `severity='info'|'warning'`).
- The existing `RequestIdMiddleware` adds `X-Request-Id` to every response. The new endpoints do not need a new middleware.
- Backend application errors are logged via the existing `ApplicationError.diagnostic_message` field. The handler returns only the safe user-facing message; the diagnostic is logged.
- Manual smoke validation exercises: (a) successful upload → display event recorded; (b) failed auth → no event; (c) admin rotate → audit event; (d) admin revoke → audit event with `severity=warning`.

## Accessibility

- The admin api-keys section is keyboard-navigable. The list table has proper `aria-label`s; the create/rotate dialogs trap focus; the revoke confirmation has a clear primary action.
- The "raw key reveal" panel uses `aria-live="polite"` to announce the warning to screen readers when it appears. Color is not the only signal: status uses both text and color.
- The kiosk display remains visually identical to its current state — no new UI elements are added, no toasts, no badges. The kiosk is an unattended public display; visual noise is minimized.
- Mobile phone layouts are not in scope. Desktop and tablet viewports are required, consistent with the rest of the admin.

## Testing Strategy

- **Backend unit tests**:
  - `ApiKeyService.generate_raw_key` produces a 32-byte URL-safe value, a `key_prefix` matching `ksk_live_[A-Za-z0-9_-]{8}`, and a `key_hash` of length 64 hex.
  - `ApiKeyService.verify` returns the org id for a valid active key, `None` for an unknown prefix, `None` for a hash mismatch, and `None` for an inactive key.
  - `ContentService.append_via_public_api` computes `displayOrder = max+1`, records the display event with `source=public_api`, and updates `lastUsedAt`.
  - The advisory lock is acquired before the `max+1` read and released at commit (verified via two concurrent transactions; only one acquires at a time).
- **Backend integration tests**:
  - `POST /api/public/content/upload` happy path returns 201 with the expected shape.
  - Every documented error path returns the documented `code` and `status`: 400 (`file_required`, `file_empty`, `title_required`, `title_too_long`), 401 (`missing_api_key`, `invalid_authorization_scheme`, `invalid_api_key`), 403 (`inactive_api_key`), 413 (`media_too_large`), 415 (`unsupported_media_type`).
  - 20 concurrent uploads to the same org produce `displayOrder` values `max+1..max+20` with no gaps, no duplicates, no server errors (SC-002).
  - 100 concurrent uploads to the same org complete with no errors and no `displayOrder` collisions (SC-003).
  - Concurrent uploads to two different orgs do not block each other; each org's sequence is independent and contiguous.
  - The `lastUsedAt` of the key is NOT updated on 400/401/403/413/415/500; it IS updated on 201.
  - `GET/POST/DELETE /api/admin/api-keys/...` happy + error paths; non-admins get 403; rotate on revoked key returns 409; revoke is idempotent (204 on second call).
- **Backend migration tests**:
  - `alembic upgrade head` succeeds on a fresh DB.
  - `alembic downgrade -1` then `alembic upgrade head` succeeds on a seeded DB (round-trip).
  - The new table is empty after upgrade (no data backfill needed).
- **Backend contract tests**:
  - OpenAPI generation includes all five new endpoints with the documented request/response shapes.
  - The error envelope matches the existing `ApplicationError` handler output (no leakage of internal fields).
- **Frontend unit tests**:
  - `ApiKeysFacade` exposes the correct signals; create returns `{record, rawKey}`; rotate, revoke, refresh work; errors map to `ApplicationErrorContract`.
  - `display-api.service.watchState` emits at the configured interval, with `distinctUntilChanged` filtering identical states.
  - `display-rotation.service` (or the display screen component) implements the novelty queue state machine: enqueue on new ids, dequeue on transition, drain before returning to base, handle removals, reset on open.
  - Pre-transition poll fires at `duration - 1000ms`; transition timer fires at `duration`.
- **Frontend integration / e2e**: documented as a manual smoke flow in `quickstart.md` (no Playwright in this repo; manual validation is the standard).
- **Manual smoke (recorded in `validation/final-acceptance.md`)**:
  - Login as admin → create key → copy raw → upload via curl → see item in kiosk within 6 s → rotate → previous raw returns 401 → revoke → 403.
  - 20 concurrent uploads from the shell → `display_order` is a contiguous descending sequence.
  - Open kiosk → upload while running → item appears at next transition without manual refresh.

## Local Development Setup

The local-dev workflow described in `README.md` is unchanged. The feature adds:

- One new env var: `PUBLIC_API_CORS_ORIGINS` (comma-separated list; default empty). Used only by the public endpoint.
- One new Alembic migration: `0003_api_keys.py`. Applied with the standard `alembic -c backend/alembic.ini upgrade head`.
- One new admin section: `/admin/api-keys`. Reachable after admin login.
- No new services to start, no new Docker containers.

Validation scripts (unchanged):

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

Plus, for the feature-specific smoke:

```sh
# After bringing up the stack and applying migrations:
# 1. Sign in as admin.
# 2. Create a key, copy it.
# 3. curl -F file=@x.jpg -F title=Y -H "Authorization: Bearer <key>" http://localhost:8000/api/public/content/upload
# 4. Open kiosk mode; observe the item within 6 s.
```

## CI/CD Considerations

- CI continues to run backend tests, frontend tests, frontend build, migration checks, and Docker image builds. The new tests slot in without new pipeline steps.
- The migration `0003_api_keys.py` is part of the standard `alembic upgrade head` step.
- The feature is a single, reviewable change: one new table, one new endpoint group, one new admin section, one kiosk state-machine rewrite.
- The big-bang `005-admin-refactor` is independent and unaffected; no cross-branch coordination is required.

## Risks And Assumptions

- **Risk**: A leaked API key grants upload access until revoked. **Mitigation**: Keys can be rotated or revoked from the admin UI; the admin can audit `lastUsedAt` and the `DisplayEvent` trail.
- **Risk**: Two kiosks viewing the same org each have their own novelty queue. A burst of 200 uploads to the org causes each kiosk to enqueue all 200; if one kiosk is faster than the other, the two kiosks may desynchronize. **Mitigation**: Acceptable per the spec. The novelty queue is per-session; resyncing happens automatically the next time either kiosk re-opens. Document in the spec.
- **Risk**: Polling every 5 s for a long-running kiosk puts a steady load on the DB. **Mitigation**: The existing `get_display_state` is a single SELECT with joins and availability filters; at 12 polls/min, even a small Postgres instance is unaffected. Document and monitor; cache the `KioskDisplayConfiguration` in memory if measurements show it is needed.
- **Risk**: The advisory lock could theoretically conflict with another application that uses the same lock key. **Mitigation**: The key is namespaced (`hashtext('content_append:' || org_id)`); conflict is unlikely and, in the worst case, only serializes appends for the same org. The lock is held only for the duration of the append transaction, so the impact is bounded.
- **Risk**: A large video upload (>100 MB) takes long to stream; during that time the connection is occupied. **Mitigation**: Existing `MediaStorageService.save_upload` streams in 1 MB chunks. Uvicorn workers should be sized to handle expected concurrency. Out of scope for this plan.
- **Risk**: The 1-second pre-transition poll may not complete before the transition if the request is slow. **Mitigation**: The transition uses the in-memory state, not the poll's result. If the poll is late, the transition still happens against the last known state; the polled state is applied on the next tick.
- **Assumption**: The existing `kiosk_display_configurations` schema is sufficient. The plan does not add new configuration fields.
- **Assumption**: The default poll interval of 5 s and pre-transition offset of 1 s are good for the typical kiosk hardware. If measurements show otherwise, the constants are easy to tune.

## Project Structure

### Documentation (this feature)

```text
specs/009-public-content-api/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── public-content-contract.md
    ├── api-key-contract.md
    ├── admin-ui-contract.md
    └── kiosk-live-update-contract.md
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── api_keys/        # NEW
│   │       ├── public_content/  # NEW
│   │       └── router.py        # UPDATED
│   ├── services/
│   │   ├── api_key_service.py   # NEW
│   │   └── content_service.py   # UPDATED
│   ├── repositories/
│   │   ├── api_keys.py          # NEW
│   │   └── models/
│   │       └── api_key.py       # NEW
│   ├── auth/
│   │   └── dependencies.py      # UPDATED
│   ├── shared/
│   │   └── errors/
│   │       └── application_errors.py  # UPDATED
│   └── config.py                # UPDATED
├── alembic/
│   └── versions/
│       └── 0003_api_keys.py     # NEW
└── tests/
    ├── unit/
    │   ├── test_api_key_service.py       # NEW
    │   └── test_content_service_public.py # NEW
    ├── integration/
    │   ├── test_public_content_upload.py  # NEW
    │   ├── test_public_content_concurrency.py  # NEW
    │   ├── test_admin_api_keys.py        # NEW
    │   └── test_migrations.py            # UPDATED (covers 0003)
    └── contract/
        └── test_openapi.py               # UPDATED

frontend/
├── src/
│   └── app/
│       ├── core/
│       │   ├── api/
│       │   │   └── api-keys.api.ts       # NEW
│       │   └── routing/
│       │       └── app.routes.ts         # UPDATED
│       ├── features/
│       │   └── api-keys/                 # NEW
│       └── display/
│           ├── display-api.service.ts    # UPDATED
│           └── display-screen.component.ts  # UPDATED
└── tests/  (co-located as *.spec.ts)
```

**Structure Decision**: Keep the existing two-package web application repository. Add new files under the existing `backend/app/api/v1/` capability folders and the existing `frontend/src/app/features/` feature folders. Do not introduce a separate "public" backend service. Do not create a separate admin application. The kiosk display component stays in `frontend/src/app/display/` because it is the single entry point for kiosk mode.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Advisory lock for per-org serialization | Required by FR-013 to guarantee gap-free `displayOrder` under concurrent uploads. | In-memory `asyncio.Lock` breaks under multiple uvicorn workers. `SELECT … FOR UPDATE` requires an extra row per org. Serializable isolation serializes reads, causing unrelated read contention. |
| Pre-transition poll at `duration - 1000ms` | Required by FR-026 to bound end-to-end latency to ≤ 6 s in the worst case (SC-001). | Polling faster (e.g., every 1 s) increases DB load 5x for no benefit during the steady state. A second `interval` subscription with a different cadence is harder to cancel cleanly than a one-shot `setTimeout`. |
| CORS middleware scoped to the public router | Required by FR-017A to support browser-based partners without affecting the rest of the API. | Applying CORS globally changes the behavior of every existing route and risks leaking CORS concerns to authenticated routes. Per-handler CORS hooks add code with no benefit. |

## Post-Design Constitution Check

- **Spec traceability**: PASS. Every FR is mapped to one or more sections of this plan; every SC is mapped to a test category.
- **Requirement clarity**: PASS. No unresolved clarification remains.
- **Plan alignment**: PASS. Architecture follows the spec exactly. No scope creep.
- **Simplicity**: PASS WITH JUSTIFIED COMPLEXITY. The three complexity exceptions above are the minimum required to satisfy the spec.
- **Contracts**: PASS. Four contract documents under `specs/009-public-content-api/contracts/`.
- **Testing**: PASS. Backend unit + integration + migration + contract tests; frontend facade + service + component tests; manual smoke.
- **Security, observability, accessibility**: PASS. Security (hashed keys, constant-time compare, CORS opt-in, safe errors), observability (DisplayEvent audit trail for content and key actions), accessibility (keyboard, focus trap, `aria-live`).
- **No speculative scope**: PASS. Per-key scopes, key expiry, rate limiting, webhooks, public listing, public delete, encryption-at-rest, multi-region replication, and analytics are explicitly out of scope.
- **Conflict handling**: PASS. Conflicts with the existing `005-admin-refactor` work or the existing code stop the plan; the implementation does not modify 005 and does not introduce parallel implementations of existing capabilities.
