# Implementation Plan: Production Quick Wins

**Branch**: `029-production-quick-wins` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/029-production-quick-wins/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-029 registered)
- Active contracts read: `PUBLIC_CONTENT.API_KEYS`, `DISPLAY.RUNTIME`, `DISPLAY.EVENTS.AUDIT`, `AUTH.RBAC`, `OPS.PLATFORM`
- Change specs read: `specs/changes/029-production-quick-wins/spec.md`, `context-pack.md`
- ADRs read: `docs/adr/0001-token-aware-sdd-governance.md` (governance only)
- Code entrypoints verified:
  - `backend/app/api/v1/router.py`, `backend/app/main.py`
  - `frontend/src/app/display/display-fingerprint.ts`
  - `frontend/src/app/core/api/display.api.ts`
  - `frontend/src/app/display/kiosk-rotation.controller.ts`
  - `frontend/src/app/display/display-screen.component.ts`
  - `frontend/src/app/core/auth/auth-expired.interceptor.ts`
  - `frontend/src/app/features/admin-shell/admin-shell.component.ts`
  - `backend/app/api/display.py` (`POST /display/rotation-event`)
- Tests identified: `display-fingerprint.spec.ts`, `display-screen.component.spec.ts`, `kiosk-rotation.controller.spec.ts`, `test_public_content*.py`, new router regression test
- Archived/consolidated specs read: none

## Summary

CHG-029 delivers six low-risk hardening fixes across backend routing,
display fingerprinting, audit wiring, minor frontend reliability, and
toolchain alignment. No new dependencies. Polling resilience (CHG-030)
and session persistence (CHG-031) are explicitly out of scope.

Technical approach:

1. **Backend**: Remove duplicate `public_content_router` from `api_v1_router`; public upload remains at `/api/public/content/upload` via `main.py` mount.
2. **Fingerprint**: Extend `sameTopContentState`, `equalByDisplayFingerprint`, and `_queueItemFingerprint` with media source, `mediaFile.mediaUrl`, `effectiveDurationSeconds`, and `selectedIframe.url`.
3. **Audit**: Wire `rotationEventSink` in `display-screen` to `POST /api/display/rotation-event` via new `DisplayApiService.postRotationEvent()`.
4. **Logo**: Reset `hiddenLogoUrl` when `organizerLogoUrl` changes (effect on branding signal).
5. **Auth interceptor**: Treat 403 like 401 on protected routes (exclude login and intentional public routes).
6. **Admin shell**: `takeUntilDestroyed` on router events subscription.
7. **Toolchain**: Add `.nvmrc` with `24` (matches release CI); align README.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12 (backend), TypeScript / Angular 20 (frontend) |
| **Dependencies** | FastAPI, RxJS — no new packages |
| **Storage** | No schema changes |
| **Testing** | pytest integration + Karma/Jasmine unit/component |
| **Target** | Chromium kiosk + admin shell |
| **Performance** | Fingerprint compare O(n) per poll — unchanged complexity, ~4 extra string compares per item |
| **Constraints** | Contract updates before code; CHG-021 polling integration deferred |
| **Scope** | ~12 files touched, 0 migrations |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass |
| Manifest update planned | pass (CHG-029 entry exists) |
| Context pack present | pass |
| Contract update before implementation | yes — 5 contracts |
| Tests for changed behavior | pass — mapped per user story |
| Security / error exposure | pass — no new secrets; interceptor tightens session handling |
| Observability / audit | pass — empty-queue events wired |
| No unjustified archive reads | pass |

## Project Structure

### Documentation for this change

```text
specs/changes/029-production-quick-wins/
├── spec.md
├── context-pack.md
├── plan.md              ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md             ← /speckit-tasks
```

### Source code touched

```text
backend/
  app/api/v1/router.py                    # remove duplicate router
  tests/integration/test_public_content_router_regression.py  # new

frontend/
  src/app/display/display-fingerprint.ts
  src/app/display/display-fingerprint.spec.ts
  src/app/core/api/display.api.ts
  src/app/display/kiosk-rotation.controller.ts
  src/app/display/kiosk-rotation.controller.spec.ts
  src/app/display/display-screen.component.ts
  src/app/display/display-screen.component.spec.ts
  src/app/core/auth/auth-expired.interceptor.ts
  src/app/core/auth/auth-expired.interceptor.spec.ts  # new or extend
  src/app/features/admin-shell/admin-shell.component.ts

root/
  .nvmrc                                  # new
  README.md                               # Node version line
```

### Active contract updates (before implementation)

| Contract | Change |
|----------|--------|
| `PUBLIC_CONTENT.API_KEYS` | Document sole public path `/api/public/content/upload`; v1 router must not register public upload |
| `DISPLAY.RUNTIME` | Document extended fingerprint fields; rotation-event sink wired |
| `DISPLAY.EVENTS.AUDIT` | Kiosk posts `content_rotation_empty` via `/api/display/rotation-event` |
| `AUTH.RBAC` | 401 and 403 on protected API clear session |
| `OPS.PLATFORM` | `.nvmrc` + README + release CI Node 24 alignment |

## Phase 0: Outline & Research

See [research.md](./research.md). All clarifications resolved:

- Node pin → **24** (matches `release-images.yml`, Angular 20 compatible)
- Public path canonical → **`POST /api/public/content/upload`**
- Rotation event → existing **`POST /api/display/rotation-event`**
- Fingerprint media fields → `sourceReference`, `mediaFile?.mediaUrl`, `effectiveDurationSeconds`
- Iframe URL → `selectedIframe?.url` in `equalByDisplayFingerprint`

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) and [quickstart.md](./quickstart.md).

### Implementation sequence (recommended PR order)

| Step | User story | Work |
|------|------------|------|
| 1 | US-1 | Remove `api_v1_router.include_router(public_content_router)` + regression test |
| 2 | US-2 | Fingerprint fields + tests |
| 3 | US-3 | `postRotationEvent()` + sink wiring + test |
| 4 | US-4a–c | Logo reset, interceptor 403, admin-shell cleanup |
| 5 | US-5 | `.nvmrc`, README |
| 6 | — | Update 5 active contracts |

### Test strategy

| Area | Test |
|------|------|
| Public router | `POST /api/content/upload` with Bearer key → 401/404; `POST /api/public/content/upload` → 201 |
| Fingerprint | Same id, different `sourceReference` / `mediaUrl` → `sameTopContentState` false |
| Iframe URL | Same id, different `url` → fingerprint false |
| Timer preserve | Controller spec: media-only change on current item preserves timer when RC unchanged |
| Rotation event | Component or controller spec: sink calls API; integration optional |
| Interceptor | 403 on `/api/users` clears session |
| Admin shell | Destroy component → no further router callback (spy) |

## Phase 2: Task Planning Approach

`/speckit-tasks` will emit tasks grouped by user story (US-1..US-5) with contract-update task first (TQ-001). Each task links to FR/TQ ids from spec.md.

Estimated effort: **2–3 dev-days** single developer.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Touch 5 contracts for small change | Constitution IV — behavior/docs change | Single mega-contract would break manifest ownership |
| Fingerprint in 3 places | Poll distinct, equal compare, controller timer guard must stay aligned | Single function import already shared for poll; controller needs parallel fields in `_queueItemFingerprint` |

## Post-implementation

1. Run narrow tests then full `pytest backend/tests` + `npm --prefix frontend run test`
2. Set CHG-029 status → `implemented` then `consolidated` after acceptance
3. Unblocks CHG-030 (`depends_on: CHG-029`)
