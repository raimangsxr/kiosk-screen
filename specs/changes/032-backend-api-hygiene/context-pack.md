# Context Pack: CHG-032 Backend API Hygiene

## Task classification

- Type: backend correctness (Fase 3)
- Affected contracts: `DISPLAY.CONFIG_SESSION`, `DISPLAY.CONTROL`, `AUTH.RBAC`, `READINESS.SETUP`
- Requires contract update: yes
- Current status: draft

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/032-backend-api-hygiene/spec.md`
- `specs/contracts/display-config-session/contract.md`
- `specs/contracts/display-control/contract.md`
- `specs/contracts/readiness-setup/contract.md`

## Code entrypoints

- `backend/app/services/display_service.py`
- `backend/app/application/display_control/service.py`
- `backend/app/main.py` (exception handlers, logging)
- `backend/app/shared/errors/application_errors.py`
- `backend/app/api/health.py`
- `backend/app/services/admin_service.py`

## Tests

- `pytest backend/tests/integration/test_remote_control_api.py`
- `pytest backend/tests/integration/test_admin_users.py` (add if missing)

## Constraints

- GET `/display/state` must not commit transactions.
- Error envelope must match frontend `api-error-adapter` expectations.
