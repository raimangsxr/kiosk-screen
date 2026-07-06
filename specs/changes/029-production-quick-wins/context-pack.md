# Context Pack: CHG-029 Production Quick Wins

## Task classification

- Type: incremental hardening (Fase 0 of master improvement plan)
- Affected contracts: `PUBLIC_CONTENT.API_KEYS`, `DISPLAY.RUNTIME`, `DISPLAY.EVENTS.AUDIT`, `AUTH.RBAC`, `OPS.PLATFORM`
- Requires contract update: yes
- Current status: draft

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/changes/029-production-quick-wins/spec.md`
- `specs/contracts/public-content-api-keys/contract.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/display-events-audit/contract.md`

## Optional context

Read only if the task touches the area:

- `specs/contracts/auth-rbac/contract.md` (session interceptor)
- `specs/contracts/ops-platform/contract.md` (Node pin)
- `specs/changes/021-kiosk-runtime-refactor/spec.md` (polling refactor is out of scope)

## Do not read by default

- `specs/archive/**`
- Consolidated change specs unless referenced by a contract
- Other in-progress changes (019, 024, 025–028) unless task overlaps

## Code entrypoints

### Backend

- `backend/app/api/v1/router.py` — duplicate public content router
- `backend/app/main.py` — `/api/public` mount

### Frontend

- `frontend/src/app/display/display-fingerprint.ts`
- `frontend/src/app/core/api/display.api.ts` — `equalByDisplayFingerprint`
- `frontend/src/app/display/kiosk-rotation.controller.ts` — queue fingerprint
- `frontend/src/app/display/display-screen.component.ts` — `rotationEventSink`, `hiddenLogoUrl`
- `frontend/src/app/core/auth/auth-expired.interceptor.ts`
- `frontend/src/app/features/admin-shell/admin-shell.component.ts`

### Toolchain

- Repository root `.nvmrc` (to create)
- `README.md`, `.github/workflows/release-images.yml`

## Tests

- `pytest backend/tests` — add public upload path regression
- `npm --prefix frontend run test` — fingerprint, display screen, interceptor
- Narrow first:
  - `frontend/src/app/display/display-fingerprint.spec.ts`
  - `frontend/src/app/display/display-screen.component.spec.ts`
  - `backend/tests/integration/test_public_content*.py`

## Implementation constraints

- No behavior change to CHG-021 polling service integration (deferred to CHG-030).
- Fingerprint extensions must not reset rotation timers when only immaterial fields differ.
- Removing duplicate router must not break documented Postman public upload collection path.
