# Implementation Plan: Display Control State

**Branch**: `005-display-control-state` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migrations**: `0004_display_control_state` (base table) +
`0009_remote_control_navigation` (navigation columns) +
`0010_remote_control_fullscreen` (fullscreen flag).

## Summary

Persist `display_control_states`, expose the four remote control
endpoints, drive the auto-fallback when the fixed target
disappears, and build the remote control Angular page.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI, pydantic v2;
  Angular 17, RxJS.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/display_control_state.py` —
  `DisplayControlState` with the two CHECK constraints and the
  unique `display_session_id`.
- `backend/app/application/display_control/service.py` —
  `DisplayControlService` with `latest_active_session`,
  `ensure_default_state`, `update_state`, `issue_navigation_command`,
  `selected_iframe`, `selected_fixed_content`,
  `record_rotation_event`, `_auto_fallback_fixed`.
- `backend/app/api/display.py:184-258` — the four remote control
  endpoints; cookie-or-operator-token auth.
- `backend/app/domain/display_events.py:32` —
  `create_display_event(...)` generic factory.

### Frontend

- `frontend/src/app/features/remote-control/remote-control.component.ts`
  — Material page (mode radio, iframe / fixed selector, navigation
  buttons, ads toggle, fullscreen button).
- `frontend/src/app/features/remote-control/remote-control.facade.ts`
  — signal-based store, optimistic updates.
- `frontend/src/app/features/remote-control/remote-control.api.ts` —
  HTTP client.
- `frontend/src/app/features/remote-control/remote-control.models.ts`
  — `RemoteControlContentMode`, `RemoteControlNavigationCommand`.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/application/display_control/service.py` or
  `app/api/display.py`, or a frontend file in
  `features/remote-control/`.
- **Requirement clarity**: 10 FRs, 3 SCs.
- **Plan alignment**: the remote control state is a single
  cross-capability surface owned by this spec; the four
  navigation commands are mirrored on the kiosk side in spec 014.
- **Simplicity**: no new dependencies.
- **Contracts**: `RemoteControlStateSchema`,
  `RemoteControlNavigationRequest`,
  `RemoteControlIframeOptionsSchema` are documented in
  `app/api/schemas.py`.
- **Testing**: integration tests for the four endpoints, the
  mode validation, the auto-fallback, and the access-denied path.
- **Security**: `REMOTE_CONTROL_ROLES` is the single source of
  truth; the helper `ensure_remote_control_admin` records the
  warning event before raising 403.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces
  `remote_control_invalid_iframe`,
  `remote_control_ads_visibility_changed`,
  `remote_control_fullscreen_changed`,
  `remote_control_navigation_changed`,
  `remote_control_access_denied`, and
  `display_control_fixed_changed` to the audit log; spec 012
  covers the full contract.

## Project Structure

```
specs/changes/005-display-control-state/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- WebSocket / SSE push of state changes.
- Multi-operator write coordination (last-write-wins).
- Persistent pause flag in the backend (pause is local to the
  kiosk controller).
