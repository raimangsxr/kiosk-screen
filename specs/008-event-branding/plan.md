# Implementation Plan: Event Branding

**Branch**: `008-event-branding` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0011_event_branding`.

## Summary

Persist `event_configurations`, expose the two admin endpoints
and the public `event-branding` endpoint, build the event
configuration admin form, and render the overlay on the kiosk.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/event_configuration.py` —
  `EventConfiguration`.
- `backend/app/services/event_configuration_service.py` —
  `get_or_create`, `update` (records
  `event_configuration_changed`).
- `backend/app/api/event_configuration.py` — `GET` and
  `PUT /event-configuration` (multipart).
- `backend/app/api/event_branding.py` — public `GET
  /event-branding`.

### Frontend

- `frontend/src/app/features/event-config/event-config.component.ts`
  — Material form with the four fields and the logo upload.
- `frontend/src/app/features/event-config/event-config.facade.ts`.
- `frontend/src/app/core/api/event-branding.api.ts` — public
  client.
- `frontend/src/app/core/event-branding.service.ts` — signal-based
  store, stale-while-error.
- The overlay is rendered by
  `frontend/src/app/display/display-screen.component.ts` (per
  spec 014).

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/api/event_configuration.py`, `app/api/event_branding.py`,
  or a frontend file in `features/event-config/` /
  `core/event-branding.service.ts`.
- **Requirement clarity**: 8 FRs, 3 SCs.
- **Plan alignment**: the overlay's iframe-hiding behaviour is
  cross-spec; this spec owns the public endpoint and the admin
  form, spec 014 owns the kiosk-side rendering.
- **Simplicity**: no new dependencies.
- **Contracts**: `EventConfigurationSchema`,
  `EventBrandingSchema` are documented in `app/api/schemas.py`.
- **Testing**: integration tests for the two admin endpoints and
  the public endpoint; frontend Karma spec for the form and the
  kiosk overlay.
- **Security**: admin endpoints gated by
  `CONFIGURATION_MANAGEMENT_ROLES`; public endpoint is unauth by
  design.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces
  `event_configuration_changed` to the audit log; spec 012
  covers the full contract.

## Project Structure

```
specs/008-event-branding/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Multi-tenant event identity (per-event switching).
- Per-event theming (colors / fonts).
- Logo cropping / EXIF strip.
