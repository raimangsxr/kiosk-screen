# Implementation Plan: Preconfigured Iframes and Video End Delay

**Branch**: `006-preconfigured-iframes-and-video-end` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0008_preconfigured_iframes_and_video_end` (revision
id `0008_iframes_video_end`).

## Summary

Persist `iframes`, expose the iframe CRUD, tune
`video_end_delay_seconds`, build the iframe admin page, and wire
the auto-revert path.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/iframe.py` — `Iframe`.
- `backend/app/services/iframe_service.py` — `list`, `create`,
  `get`, `update`, `delete` (records `remote_control_iframe_deleted`
  on the kiosk when applicable).
- `backend/app/api/iframes.py` — the five CRUD endpoints.
- `backend/app/repositories/models/kiosk_configuration.py` —
  `video_end_delay_seconds` (CHECK 0..30, default 2).

### Frontend

- `frontend/src/app/features/iframes/iframe-list.component.ts` —
  Material list with the URL display.
- `frontend/src/app/features/iframes/iframe-form.component.ts` —
  create / edit form.
- `frontend/src/app/features/iframes/iframe.facade.ts` — signal
  store.
- `frontend/src/app/core/api/iframe.api.ts` — HTTP client.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `services/iframe_service.py` or `api/iframes.py`, or a frontend
  file in `features/iframes/`.
- **Requirement clarity**: 7 FRs, 3 SCs.
- **Plan alignment**: the auto-revert path is the only
  cross-spec surface; it lands in the next `GET /display/state`
  and depends on the state machinery in spec 005.
- **Simplicity**: no new dependencies.
- **Contracts**: `IframeSchema`, `IframeListResponse`,
  `IframeRequest` are documented in `api/schemas.py`.
- **Testing**: integration tests for CRUD, duplicate URL, and
  the auto-revert path.
- **Security**: all endpoints gated by `CONTENT_MANAGEMENT_ROLES`.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces
  `remote_control_iframe_deleted` to the audit log; spec 012
  covers the full contract.

## Project Structure

```
specs/006-preconfigured-iframes-and-video-end/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Per-item video end delay.
- Iframe URL domain whitelist (the browser's iframe sandbox
  already isolates the content; per-org domain allow lists are a
  future spec).
