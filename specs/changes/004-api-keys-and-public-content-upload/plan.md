# Implementation Plan: API Keys and Public Content Upload

**Branch**: `004-api-keys-and-public-content-upload` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0003_api_keys`.

## Summary

Persist `api_keys`, expose the five admin endpoints, expose the
public content upload endpoint with bearer auth, wire the
`api_key_changed` audit events, and build the API keys admin UI.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI, pydantic v2,
  hashlib (sha256), secrets; Angular 17, Material 3.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/api_key.py` — `ApiKey`.
- `backend/app/repositories/api_keys.py` — `ApiKeyRepository`
  (org-scoped, `get_by_id`, `list_for_organization`).
- `backend/app/services/api_key_service.py` — `generate_raw_key`
  (32 bytes, prefix `ksk_live_` + 8 chars), `verify`,
  `create`, `rotate`, `revoke`, `delete`.
- `backend/app/domain/display_events.py:55` —
  `create_api_key_event(...)` with the action whitelist
  (`create`, `rotate`, `revoke`, `delete`).
- `backend/app/api/v1/api_keys/routes.py` — the five admin
  endpoints.
- `backend/app/api/v1/api_keys/schemas.py` —
  `ApiKeyRecordSchema`, `ApiKeyWithRawSecretSchema`,
  `CreateApiKeyRequest`.
- `backend/app/api/v1/public_content/routes.py` —
  `POST /api/public/content/upload`.
- `backend/app/api/v1/public_content/schemas.py` —
  `parse_public_upload` (typed errors).

### Frontend

- `frontend/src/app/features/api-keys/api-keys-list.component.ts`
  — Material list, actions.
- `frontend/src/app/features/api-keys/api-keys-create-dialog.component.ts`
  — modal reveal panel.
- `frontend/src/app/features/api-keys/api-keys.facade.ts`.
- `frontend/src/app/core/api/api-keys.api.ts` — HTTP client.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `api/v1/api_keys/` or `api/v1/public_content/`.
- **Requirement clarity**: 10 FRs, 3 SCs.
- **Plan alignment**: bearer auth is the only cross-spec surface.
- **Simplicity**: no new dependencies; `hashlib` + `secrets` are
  in the stdlib.
- **Contracts**: `ApiKeyRecordSchema`,
  `ApiKeyWithRawSecretSchema`, `ContentItemSchema` are documented
  in `api/v1/.../schemas.py`.
- **Testing**: integration tests for create, rotate, revoke
  (idempotent), delete (revoked-only), public upload happy +
  error matrix.
- **Security**: raw key is generated server-side, returned once,
  never logged; sha256 hash stored; prefix and hash format
  enforced by CHECK constraints.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces
  `api_key_changed` to the audit log; spec 012 covers the full
  contract.

## Project Structure

```
specs/changes/004-api-keys-and-public-content-upload/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Per-key rate limits (future spec).
- Per-key scope restrictions (e.g. read-only).
- OAuth / JWT in lieu of bearer.
- Key rotation policies (mandatory every N days).
