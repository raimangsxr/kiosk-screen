# Implementation Plan: Kiosk Display Configuration and Session

**Branch**: `002-kiosk-display-config-and-session` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migrations**: `0001_initial_kiosk_schema` (partial:
`kiosk_display_configurations`, `operator_sessions`) +
`0003_remote_control_polling` (adds `remote_control_polling_seconds`).

## Summary

Persist the kiosk layout knobs and the polling cadence; expose the
operator session lifecycle; expose the kiosk configuration admin
form; wire the polling loop on the kiosk Angular component.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI, pydantic v2;
  Angular 17, RxJS.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.
- **Target Platform**: Linux server + Chromium kiosk browser.

## Architecture

### Backend

- `backend/app/repositories/models/kiosk_configuration.py` —
  `KioskDisplayConfiguration` with eight CHECK constraints
  (region ratio, durations, animations, polling, video end delay).
- `backend/app/repositories/models/operator_session.py` —
  `OperatorSession` (`valid_until`, `ended_at`).
- `backend/app/services/display_service.py` — `open_display`,
  `get_display_state`, `record_fallback_activation` (records
  `fallback_activated`), `DisplayState` dataclass.
- `backend/app/services/admin_service.py` — `get_configuration`,
  `update_configuration` (records `configuration_changed`).
- `backend/app/api/display.py` — `/display/open`, `/display/state`.
- `backend/app/api/configuration.py` — `/display/configuration`.

### Frontend

- `frontend/src/app/core/api/display.api.ts` — `openDisplay`,
  `getState`, `watchState` (timer + dedupe).
- `frontend/src/app/features/display-config/display-config.component.ts`
  — Material form bound to the configuration schema.
- `frontend/src/app/features/display-config/display-config.facade.ts`
  — signal-based store.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `backend/app/api/display.py`, `backend/app/api/configuration.py`,
  or a frontend file in `features/display-config/`.
- **Requirement clarity**: 9 FRs, 3 SCs; no
  `NEEDS CLARIFICATION`.
- **Plan alignment**: covers the layout / session / polling slice
  end-to-end; cross-spec surfaces limited to the
  `DisplayStateSchema`.
- **Simplicity**: no new dependencies; backend already uses
  `pydantic`, `fastapi`, `sqlalchemy`.
- **Contracts**: `DisplayStateSchema` and
  `KioskConfigurationSchema` are the only contracts; documented in
  `backend/app/api/schemas.py`.
- **Testing**: integration tests for open / state / configuration
  endpoints; frontend Karma spec for the configuration form.
- **Security**: open is gated by `DISPLAY_OPEN_ROLES`; PUT
  configuration is gated by `CONFIGURATION_MANAGEMENT_ROLES`.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec carries the
  `display_state_calculation_failed` event type which is part of
  the unified audit log contract in spec 012.

## Project Structure

```
specs/002-kiosk-display-config-and-session/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Multi-kiosk configurations.
- Per-region independent configuration (ratio is fixed 4fr/1fr).
- Polling-based vs push (WebSocket / SSE) delivery; polling is the
  only contract today.
