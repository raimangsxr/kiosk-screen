# Implementation Plan: Display Events Audit Log

**Branch**: `012-display-events-audit-log` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0001_initial_kiosk_schema` (partial: `display_events`).

## Summary

Persist `display_events`, centralise event creation in
`domain/display_events.py`, expose `GET /events`, and document the
unified 22-string catalog.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/display_event.py` —
  `DisplayEvent` with the JSON metadata column.
- `backend/app/repositories/events.py` —
  `DisplayEventRepository.record(...)` (insert-only).
- `backend/app/domain/display_events.py` — `SECRET_KEYS`,
  `DisplayEventRecord`, `sanitize_metadata(...)`,
  `create_display_event(...)`,
  `create_api_key_event(...)`.
- `backend/app/api/events.py` — `GET /events` (most recent 50).

### Frontend

- `frontend/src/app/core/api/events.api.ts` (if a UI page is
  added; otherwise the events page is the admin's
  `/admin/events`).

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/repositories/models/display_event.py`,
  `app/repositories/events.py`, `app/domain/display_events.py`,
  or `app/api/events.py`.
- **Requirement clarity**: 5 FRs, 3 SCs.
- **Plan alignment**: the catalog is the cross-spec surface; no
  other spec adds event types without updating the catalog.
- **Simplicity**: no new dependencies; the JSON column is
  supported by SQLAlchemy and the driver.
- **Contracts**: `DisplayEventSchema` is documented in
  `app/api/schemas.py`; the catalog is the single source of
  truth.
- **Testing**: unit tests for `sanitize_metadata(...)` (parametrized
  over the secret keys); integration tests for the endpoint and
  the catalog-driven event recording.
- **Security**: `SECRET_KEYS` is a hard-coded set; the helper
  strips any value, no matter the source.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec supersedes the obsolete
  contract in 019 (already deleted by the refactoring).

## Project Structure

```
specs/changes/012-display-events-audit-log/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Event log pagination (future spec).
- Event log search / filter UI.
- Long-term archival / cold storage.
