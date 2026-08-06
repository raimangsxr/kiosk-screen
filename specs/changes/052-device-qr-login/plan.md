# Implementation Plan: Activación de pantalla con código y QR

**Branch**: `052-device-qr-login` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/052-device-qr-login/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-052 entry to add at implementation gate)
- Active contracts read: `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION`
- Change specs read: `spec.md`, clarifications session 2026-08-06
- Context pack read or created: `context-pack.md`
- ADRs read: `ADR-0008` (session persistence); new `ADR-0014` planned
- Code entrypoints verified:
  - `backend/app/api/auth.py`
  - `backend/app/auth/session_service.py`
  - `backend/app/auth/session_store.py`
  - `backend/app/domain/roles.py`
  - `backend/app/services/display_service.py`
  - `backend/app/api/display.py` (`open_display_route`)
  - `frontend/src/app/auth/login.component.ts`
  - `frontend/src/app/app.routes.ts`
  - `frontend/src/app/core/auth/auth.service.ts`
  - `frontend/src/app/display/display-screen.component.ts`
- Tests identified:
  - `backend/tests/unit/test_device_activation.py` (new)
  - `backend/tests/integration/test_device_activation_flow.py` (new)
  - `frontend/src/app/core/auth/device-activation.service.spec.ts` (new)
  - `frontend/src/app/auth/activate.component.spec.ts` (new)
  - `frontend/src/app/auth/login.component.spec.ts` (extend)
- Archived or consolidated specs read: none

## Summary

Add Netflix/DAZN-style device activation so kiosk operators authenticate from a
mobile phone instead of typing on the venue screen. The kiosk shows a 6-letter
code and QR on `/login` (default view); the operator scans or opens `/activate`,
logs in on mobile if needed, and authorizes. The kiosk polls until it receives
an HttpOnly session cookie, then navigates directly to `/display` (skipping
`/hall`) and runs `open_display` with existing session-supersede semantics.

Technical approach: **OAuth 2.0 Device Authorization Grant** (RFC 8628) adapted —
Redis-backed pairing state (15 min TTL), separate `userCode` (human) and
`deviceCode` (poll token), session issued on successful poll.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12+ (FastAPI), TypeScript / Angular 20 |
| **Primary dependencies** | FastAPI, SQLAlchemy, Redis, Angular signals, `qrcode` (new) |
| **Storage** | Redis for pairing (TTL 900 s); PostgreSQL `user_auth_sessions` unchanged |
| **Testing** | pytest (unit + integration), Angular specs |
| **Target** | Kiosk `/login` + mobile `/activate` (P0); credential login regression (P2) |
| **Performance goals** | SC-001: mobile confirm → kiosk `/display` in <30 s (95 %); poll latency ≤10 s |
| **Constraints** | HttpOnly cookies; no SSO; Spanish UI; `can_open_display` RBAC |
| **Scale** | 1–20 kiosks/org; codes rotate every 15 min; 26⁶ userCode space |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass — `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION` |
| Manifest update planned | pass — add CHG-052 before implementation |
| Context pack present | pass — `context-pack.md` |
| Contract update before implementation | yes — `contracts/contract-deltas.md` |
| Tests for changed behavior | pass — unit + integration per TQ-002 |
| Security / error exposure | pass — rate limit, opaque deviceCode, generic errors |
| Observability / audit | pass — optional display_event deferred; structured logs on authorize |
| No unjustified archive reads | pass |
| Durable rationale in ADR | pass — `ADR-0014` at implementation |

## Project Structure

### Documentation for this change

```text
specs/changes/052-device-qr-login/
├── spec.md
├── context-pack.md
├── plan.md                         ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contract-deltas.md
├── checklists/requirements.md
└── tasks.md                        ← /speckit-tasks
```

### Source code (planned)

```text
backend/app/auth/
├── device_activation_service.py      # start, authorize, poll, code generation
├── device_activation_store.py        # Redis CRUD + atomic authorize
└── session_store.py                  # + ActivationRateLimiter

backend/app/api/
├── auth.py                           # mount device-activation routes
└── schemas.py                        # request/response models

frontend/src/app/auth/
├── login.component.ts                # default activation tab + QR
├── login.component.spec.ts
└── activate.component.ts             # mobile /activate flow

frontend/src/app/core/auth/
├── device-activation.service.ts      # start, poll, QR generation
└── device-activation.service.spec.ts

frontend/src/app/app.routes.ts          # + /activate route

docs/adr/
└── 0014-device-activation-flow.md
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md). Resolved:

- RFC 8628 device flow with poll-based cookie issuance
- Redis pairing store (15 min TTL); no PG migration
- 2 s poll interval; `userCode` vs `deviceCode` separation
- `can_open_display` for authorize permission
- Activation rate limiter (10 / 15 min / IP)
- `qrcode` npm for client-side QR
- Post-activate: navigate `/display` + existing `open_display` supersede

## Phase 1: Design & Contracts

Completed artifacts:

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| Contract deltas | [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
| Context pack | [context-pack.md](./context-pack.md) |

### Active contract updates (before implementation)

Merge `contracts/contract-deltas.md` into:

1. `specs/contracts/auth-rbac/contract.md`
2. `specs/contracts/display-config-session/contract.md`

Add CHG-052 to `specs/manifest.yml`. Create `docs/adr/0014-device-activation-flow.md`.

### API surface (summary)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/device-activation/start` | No | Kiosk creates pairing |
| POST | `/api/auth/device-activation/authorize` | Yes | Mobile approves `userCode` |
| POST | `/api/auth/device-activation/poll` | No | Kiosk waits / receives cookie |

### Implementation phases vs user stories

| Phase | User stories | Key deliverable |
|-------|--------------|-----------------|
| 1 | US1, US4 | Backend device-activation service + Redis store + tests |
| 2 | US1, US2, US5 | `ActivateComponent`, `/activate` route, mobile success UI |
| 3 | US1, US3 | Login redesign (QR default, credentials toggle), poll + redirect `/display` |
| 4 | US4 | Expiry rotation, rate limit, error messages, concurrent authorize |
| 5 | All | Contract merge, ADR-0014, manifest, quickstart validation |

## Phase 2: Task Planning Approach

Tasks in `/speckit-tasks` will map phases 1–5. Suggested grouping:

1. **P0 backend** — store, service, routes, unit tests
2. **P0 mobile UI** — `ActivateComponent` + authorize flow + success screen
3. **P0 kiosk UI** — login tabs, QR, `DeviceActivationService` poll loop
4. **P1 hardening** — expiry rotation, rate limit, integration test e2e
5. **Gate** — contract verification, ADR, manifest, manual quickstart (SC-001–SC-005)

### Test strategy

1. **Unit (backend)** — userCode format; TTL expiry; authorize requires role;
   poll pending/authorized/expired; single-use; rate limit; concurrent authorize
   (first wins).
2. **Integration** — full start → authorize → poll → cookie → `GET /auth/me`;
   invalid code; expired code; supersede via subsequent `open_display`.
3. **Unit (frontend)** — poll stops on authorized; QR regenerates on new code;
   activate pre-fills query param; login default tab is activation.
4. **Component** — login shows QR by default; credentials toggle works;
   activate success view no redirect.
5. **Manual** — [quickstart.md](./quickstart.md): happy path, expiry, supersede,
   permission denied, credential login regression.

### Phase gates

| Gate | Criterion |
|------|-----------|
| G1 → Phase 2 | Backend unit tests green; start/authorize/poll contract stable |
| G2 → Phase 3 | Mobile activate e2e in integration test |
| G3 → Phase 4 | Kiosk poll → `/display` in integration + component specs |
| G4 → Phase 5 | Rate limit + expiry tests green |
| G5 → Done | Contracts merged; quickstart P1 flows pass; SC-005 regression suite green |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Redis pairing store (new domain) | Multi-pod safe ephemeral state with TTL | In-memory breaks load-balanced deploys |
| Separate deviceCode from userCode | FR-016; code visible on public screen | Single code enables poll brute-force |
| New npm `qrcode` dependency | FR-001 QR on kiosk without backend image endpoint | ASCII-only violates UX spec |

## Estimated effort

| Phase | Estimate |
|-------|----------|
| 1 (backend) | 1.5–2 days |
| 2–3 (frontend flows) | 1.5–2 days |
| 4 (hardening + tests) | 1 day |
| 5 (contracts + ADR + QA) | 0.5 day |
| **Total** | **~4–5 days** |
