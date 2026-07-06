# Context Pack: CHG-031 Auth Session Hardening

## Task classification

- Type: security / platform (Fase 1)
- Affected contracts: `AUTH.RBAC`
- Requires contract update: yes
- Current status: draft

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/031-auth-session-hardening/spec.md`
- `specs/contracts/auth-rbac/contract.md`
- `backend/app/api/auth.py`
- `backend/app/auth/dependencies.py`
- `backend/app/config.py`

## Optional context

- `docs/adr/` — create `0004-session-persistence.md` during plan

## Code entrypoints

- `backend/app/main.py`
- `backend/app/api/auth.py`
- `backend/app/auth/service.py`
- `backend/app/auth/dependencies.py`
- `backend/app/services/bootstrap_service.py`

## Tests

- `pytest backend/tests -k auth`

## Constraints

- Document one-time re-login after upgrade from in-memory sessions.
- Production startup must fail on default secrets.
