# Implementation Plan: Content Rotation Modes

**Branch**: `007-content-rotation-modes` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0012_content_rotation_modes`.

## Summary

Persist `is_fixed` / `recurring_every_x_iterations` on
`top_content_items`, persist `selected_fixed_content_id` on
`display_control_states`, widen the `contentMode` CHECK to
include `fixed`, accept `pause` and `resume` in
`navigationCommand`, and build the kiosk controller behaviour
(pin, restart video, cursor preservation, pause / resume, empty
debounce, `POST /api/display/rotation-event`).

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17,
  RxJS.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/content.py` — add
  `is_fixed`, `recurring_every_x_iterations`, CHECK
  `ck_top_content_not_fixed_and_recurring`.
- `backend/app/repositories/models/display_control_state.py` —
  add `selected_fixed_content_id`, CHECK
  `ck_display_control_fixed_has_target`.
- `backend/app/api/display.py:261` — `POST /api/display/rotation-event`
  accepting the kiosk events (already exists; this spec adds
  the doc and the contract).
- `backend/app/application/display_control/service.py` —
  validate `is_fixed=true` on PUT; emit
  `display_control_fixed_changed`,
  `display_control_paused` / `resumed`,
  `content_rotation_empty`.
- `backend/app/services/content_service.py` — admin upload
  validates `is_fixed` XOR `recurring_every_x_iterations`.
  Public upload silently ignores both (per spec 004).

### Frontend

- `frontend/src/app/display/kiosk-rotation.controller.ts` —
  signal-based single-timer controller; pause / resume, fixed
  mode, cursor preservation, empty-queue debounce.
- `frontend/src/app/display/display-rotation.service.ts` —
  novelty-queue state machine.
- `frontend/src/app/features/content/content-form.component.ts` —
  "Fijo" checkbox + "Recurrente cada N" number input with
  mutual-exclusion hint (consumed in spec 009).

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/repositories/models/`, `app/api/display.py`, or
  `app/application/display_control/service.py`, or a frontend
  file in `app/display/`.
- **Requirement clarity**: 10 FRs, 4 SCs.
- **Plan alignment**: the cursor preservation and the kiosk
  pause behaviour are part of the runtime; spec 014 owns the
  cross-cutting runtime machinery.
- **Simplicity**: no new dependencies; `uuid4` and `setTimeout`
  are in stdlib / browser.
- **Contracts**: `RotationEventRequest` is documented in
  `app/api/schemas.py:199`.
- **Testing**: integration tests for the migrations, the
  mutual-exclusion validator, the kiosk behaviour (Karma).
- **Security**: `POST /api/display/rotation-event` requires a
  session cookie (kiosk uses the operator session token).
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces
  `display_control_paused`, `display_control_resumed`,
  `display_control_fixed_changed`, and
  `content_rotation_empty` to the audit log; spec 012 covers
  the full contract.

## Project Structure

```
specs/007-content-rotation-modes/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Multi-recurring ordering UI (round-robin is server-side only
  via `recurringEveryXIterations`).
- Persisting the pause flag in the backend.
- A new navigation command (e.g. `shuffle`).
