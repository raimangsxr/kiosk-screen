# Implementation Plan: Readiness and Setup Check

**Branch**: `011-readiness-setup-check` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: none (derived view).

## Summary

Implement `evaluate_readiness(...)` in `domain/readiness.py`,
expose `GET /readiness`, surface the result on the dashboard and
the hall page, and disable "Open kiosk" while `ready=false`.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/domain/readiness.py` — `ReadinessInput`,
  `ReadinessResult`, `evaluate_readiness(...)`.
- `backend/app/services/readiness_service.py` — builds the
  `ReadinessInput` from the active config, the event
  configuration, and the counts of active content / ads.
- `backend/app/api/readiness.py` — `GET /readiness`.

### Frontend

- `frontend/src/app/features/readiness/readiness.component.ts` —
  status panel.
- `frontend/src/app/features/readiness/readiness.facade.ts`.
- `frontend/src/app/features/dashboard/dashboard.component.ts` —
  embeds the readiness summary.
- `frontend/src/app/features/hall/hall.component.ts` — disables
  the "Open kiosk" button when `ready=false`.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/domain/readiness.py`, `app/api/readiness.py`, or a
  frontend file in `features/readiness/`, `features/dashboard/`,
  `features/hall/`.
- **Requirement clarity**: 5 FRs, 3 SCs.
- **Plan alignment**: cross-spec surface limited to the
  "open is blocked" UX; the underlying open logic stays in spec
  002.
- **Simplicity**: no new dependencies; pure domain function.
- **Contracts**: `ReadinessReportSchema` is documented in
  `app/api/schemas.py`.
- **Testing**: unit tests for `evaluate_readiness(...)` covering
  every blocker and warning path.
- **Security**: `GET /readiness` requires a session cookie (any
  logged-in user).
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: no audit events; this spec is read-only
  on the underlying state.

## Project Structure

```
specs/changes/011-readiness-setup-check/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Live, in-browser validation of the readiness on every form
  change (this is a snapshot, not a real-time check).
- A "force open" admin override (out of MVP).
