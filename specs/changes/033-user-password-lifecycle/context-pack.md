# Context Pack: CHG-033 User Password Lifecycle

## Task classification

- Type: admin security (Fase 5)
- Affected contracts: `AUTH.RBAC`, `USERS.ROLES.ADMIN`
- Requires contract update: yes
- Current status: draft

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/033-user-password-lifecycle/spec.md`
- `specs/contracts/auth-rbac/contract.md`
- `specs/contracts/users-roles-admin/contract.md`

## Code entrypoints

- `backend/app/services/admin_service.py`
- `backend/app/api/v1/users/`
- `frontend/src/app/features/users/user-form.component.ts`

## Tests

- `pytest backend/tests -k user`
- `frontend/src/app/features/users/**/*.spec.ts`

## Constraints

- Remove hardcoded `change-me` entirely.
- Password hashes never in API responses.
