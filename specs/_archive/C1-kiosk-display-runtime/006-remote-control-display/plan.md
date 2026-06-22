# Implementation Plan: Remote Control Display

**Branch**: `008-remote-control-display` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-remote-control-display/spec.md`

**Note**: This plan stops at design and contracts. It does not authorize implementation until tasks are generated and analyzed.

## Summary

Add a hall-accessible administrator remote control mode for the kiosk display. The administrator can switch the running display content region between the existing loop and a selected existing iframe, show or hide the ads region, and rely on the running kiosk to hot-apply display configuration changes without local keyboard or manual refresh access. The technical approach adds a session-scoped display control state, extends display configuration with a 1-60 second polling interval, exposes explicit backend and UI contracts, and updates the display polling behavior so remote control and configuration updates are applied while the display is already running.

## Technical Context

**Language/Version**: TypeScript with Angular 20.3.x and TypeScript 5.8 for frontend; Python 3.12 for backend.

**Primary Dependencies**: Angular standalone components, Angular Router, Angular Reactive Forms, Angular Material, RxJS, FastAPI, Pydantic 2.x, SQLAlchemy 2.x, Alembic, PostgreSQL driver, pytest, Angular/Karma test tooling.

**Storage**: PostgreSQL remains the source of truth. Display configuration gains a persisted polling interval. Remote control state is stored as session-scoped operational data for the active display session rather than a permanent display preference.

**Testing**: Backend unit, integration, migration, and contract tests with pytest. Frontend service/facade/component tests with `npm --prefix frontend run test`. Manual two-device/two-browser smoke validation for running display plus administrator control.

**Target Platform**: Browser-based kiosk web application with separated Angular frontend and FastAPI backend.

**Project Type**: Web application with separate frontend and backend packages in one repository.

**Performance Goals**: Valid remote control changes appear on the running display within the configured 1-60 second polling interval plus normal network response time. Existing display rotation remains faithful to effective durations after hot configuration changes.

**Constraints**: One kiosk and one administrator control device in scope. Only administrators can use remote control. No arbitrary URL entry, scheduling, multi-kiosk control, or new media types. The kiosk device cannot rely on local keyboard access, manual refresh, or physical intervention for display configuration changes.

**Scale/Scope**: Single active display session per organization for this feature. Remote control affects the content region and ads visibility only. Display configuration hot-apply covers settings that affect the running display.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. Plan references `spec.md`, FR-001 through FR-025, SC-001 through SC-013, and the clarification decisions.
- **Requirement clarity**: PASS. Polling bounds and close-update resolution are clarified; no open `[NEEDS CLARIFICATION]` markers remain.
- **Plan alignment**: PASS. The plan covers only remote content mode, ads visibility, configurable polling, and hot display configuration from the approved spec.
- **Simplicity**: PASS. Session-scoped control state avoids multi-kiosk orchestration, scheduling, and a generalized command bus.
- **Contracts**: PASS. Backend and UI contracts are documented under `contracts/`.
- **Testing**: PASS. Changed behavior has backend, frontend, migration, contract, and manual smoke validation paths.
- **Security, observability, accessibility**: PASS. Administrator-only access, safe errors, operational diagnostics, and keyboard/status requirements are planned.
- **No speculative scope**: PASS. Arbitrary URLs, new media types, multiple kiosks, multiple control devices, and scheduling remain out of scope.
- **Conflict handling**: PASS. Implementation must stop if current display/session behavior cannot support the planned session-scoped control model without spec or plan update.

## Phase 0: Research

Research output is captured in [research.md](./research.md). Key decisions:

- Store remote control as active display-session operational state, initialized to loop plus ads visible when display opens.
- Persist the polling interval in display configuration with bounds of 1 to 60 seconds and a default of 3 seconds.
- Poll a combined effective display state so remote control and hot configuration changes are applied from one display refresh path.
- Restrict iframe mode to existing active eligible `embedded_web` content; do not allow arbitrary URL entry.
- Use last-valid-change-wins for close-together remote control updates.
- Preserve display as fullscreen custom UI and implement administrator controls with existing Angular Material admin patterns.

## Phase 1: Design

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/backend-contract.md](./contracts/backend-contract.md)
- [contracts/ui-contract.md](./contracts/ui-contract.md)
- [quickstart.md](./quickstart.md)

## Proposed Architecture

### Frontend

The frontend will add a remote-control feature area and extend the display feature while preserving current feature boundaries.

```text
frontend/src/app/
├── features/
│   ├── hall/
│   ├── remote-control/
│   │   ├── remote-control.api.ts
│   │   ├── remote-control.facade.ts
│   │   ├── remote-control.models.ts
│   │   └── remote-control.component.ts
│   └── display-config/
└── display/
    ├── display-api.service.ts
    ├── display-screen.component.ts
    └── display-rotation.service.ts
```

Rules:

- Remote control is reachable from hall only for administrators.
- Remote control uses Angular Material controls and existing admin feedback patterns.
- Remote control updates are immediate on selection/toggle changes and use latest-valid-change-wins semantics.
- Display remains visually independent from administration Material layout.
- Display polling owns the running effective state and restarts rotation/layout decisions when remote state or configuration changes.
- Frontend API adapters map DTOs at the boundary; components render view models and do not embed backend shape assumptions.
- RxJS polling streams must be cleaned up on destroy and must keep polling alive after recoverable errors.

### Backend

The backend will add a display-control capability within the v1 display boundary.

```text
backend/app/
├── api/v1/display/
│   ├── routes.py
│   └── schemas.py
├── application/
│   ├── display/
│   │   └── service.py
│   └── display_control/
│       └── service.py
├── domain/
│   └── display_control.py
└── repositories/models/
    ├── kiosk_configuration.py
    └── display_control_state.py
```

Rules:

- Route handlers validate authenticated boundaries and delegate behavior to application services.
- Administrator-only remote control authorization is enforced on both read and update operations for the control panel.
- The display polling read path remains available to the running display according to existing display access rules and must not allow non-admin mutation.
- Iframe selection validation lives in backend business logic and checks existing iframe content eligibility.
- Display configuration changes use the existing configuration service boundary and include Alembic migration validation.
- Application errors are typed and mapped to safe user-facing responses.
- Operational events or logs capture invalid selections, denied control attempts, and hot-apply failures.

## API And UI Contracts

The backend contract defines:

- active display control state
- iframe option eligibility
- remote control update request/response
- effective display state for polling
- configuration field `remoteControlPollingSeconds`
- safe error behavior and authorization expectations

The UI contract defines:

- hall entry point
- administrator remote control controls and states
- display behavior for loop mode, iframe mode, ads hidden, ads visible, invalid state fallback, and hot configuration changes
- manual smoke expectations

OpenAPI output remains the generated API contract for implementation validation.

## Data Model And Migration

Required data model changes:

- Add `remote_control_polling_seconds` to kiosk display configuration with default 3 and check constraint 1-60.
- Add database-backed session-scoped display control state for the active display session, tied to display session lifecycle and reset on new display open.

Migration requirements:

- Alembic migration adds the configuration field and control state storage if implemented as a table.
- Existing configuration rows receive default polling interval 3.
- Existing kiosk content, ads, users, roles, display events, and display behavior remain usable after migration.
- Migration tests validate default values and constraints.

## Security Model

- Only administrator role can access or mutate remote control state.
- The running display can read effective display state required for operation but cannot mutate remote control choices.
- Iframe mode never accepts arbitrary URLs; it references existing valid iframe content only.
- Errors must not expose internal paths, stack traces, secrets, or raw SQL details.
- Configuration and remote control inputs are validated at API and form boundaries.

## Observability

- Denied remote control access, invalid iframe selections, invalid polling intervals, and hot-apply failures should be logged or recorded through operational events.
- Display fallback activation remains observable.
- Manual validation records should capture control changes, hot configuration changes, and fallback/recovery behavior.

## Accessibility

- Remote control controls must be keyboard usable with visible focus.
- Current mode, selected iframe, ads visibility, saving state, and error state must have clear labels and status feedback.
- The display remains fullscreen and readable in loop, iframe, ads visible, ads hidden, and fallback states.

## Testing Strategy

- **Backend unit tests**: remote control state transitions, iframe eligibility validation, last-valid-change-wins behavior, polling interval validation, default display-session state.
- **Backend integration tests**: administrator access, non-admin denial, control update/read, display polling read, configuration update with polling interval, invalid iframe errors.
- **Backend contract tests**: OpenAPI and documented remote control/display contracts.
- **Migration tests**: configuration default and 1-60 constraint; control state storage if structural migration is used.
- **Frontend service/facade tests**: immediate update calls, safe errors, latest selected state, polling interval changes, recoverable polling failures.
- **Frontend component tests**: hall entry, administrator-only route behavior, mode selector, iframe selector, ads toggle, keyboard/status feedback.
- **Display regression tests**: loop mode, iframe mode, ads hidden full height, ads restored, hot timing/animation/ad count changes, fallback and Escape-to-hall.
- **Manual smoke**: two browsers/devices, one on display and one on remote control/configuration, validating mode changes and hot configuration.

## Local Development Setup

- Continue using the existing local lab startup from `README.md`.
- Apply migrations before backend startup.
- Run backend and frontend locally.
- Validate login with an administrator account.
- Open display in one browser and remote control/configuration in another.

## Risks And Assumptions

- **Risk**: Existing `open_display` creates sessions without returning a session identifier. **Mitigation**: implementation may use latest active organization display session, but must preserve one-kiosk scope and document the selected contract.
- **Risk**: Polling remote control and display configuration separately could create inconsistent render state. **Mitigation**: use one effective state payload for the running display.
- **Risk**: Hot-applying all display settings can destabilize rotation if timers are not reset consistently. **Mitigation**: centralize effective state application and cover with display regression tests.
- **Risk**: Backend in-memory state would fail across workers or restarts. **Mitigation**: use database-backed session-scoped state.
- **Assumption**: One active display session is sufficient for this feature.
- **Assumption**: Existing role and auth systems remain valid.
- **Assumption**: Existing iframe content and approved-domain rules remain the source of iframe safety.

## Project Structure

### Documentation (this feature)

```text
specs/006-remote-control-display/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── backend-contract.md
│   └── ui-contract.md
├── checklists/
│   ├── requirements.md
│   └── remote-control-readiness.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── alembic/versions/
├── app/
│   ├── api/v1/display/
│   ├── application/display/
│   ├── application/display_control/
│   ├── domain/
│   └── repositories/models/
└── tests/
    ├── contract/
    ├── integration/
    ├── migration/
    └── unit/

frontend/
├── src/app/
│   ├── features/hall/
│   ├── features/remote-control/
│   ├── features/display-config/
│   └── display/
└── src/app/**/*.{spec.ts}
```

**Structure Decision**: Use the existing two-package web application layout. Backend changes stay inside v1 display/configuration, application services, domain validation, and repository models. Frontend changes add administrator control under `features/remote-control` and keep the fullscreen display implementation under `frontend/src/app/display/` outside the Material admin shell.

## Complexity Tracking

No constitution violations or unjustified complexity are planned.

## Post-Design Constitution Check

- **Spec traceability**: PASS. Design artifacts map to the approved requirements and success criteria.
- **Requirement clarity**: PASS. Remaining implementation choices are documented as plan decisions or tasks, not requirement ambiguities.
- **Plan alignment**: PASS. No out-of-scope remote scheduling, multi-kiosk management, arbitrary URL entry, or new media type support is introduced.
- **Simplicity**: PASS. The design uses one session-scoped state and one effective display polling path.
- **Contracts**: PASS. Backend and UI contracts are documented.
- **Testing**: PASS. Validation spans unit, integration, contract, migration, frontend, display regression, and manual smoke.
- **Security, observability, accessibility**: PASS. The design includes administrator-only access, safe errors, operational diagnostics, and keyboard/status requirements.
- **No speculative scope**: PASS. Deferred behavior remains explicitly excluded.
- **Conflict handling**: PASS. Implementation must update spec/plan before departing from the selected session-scoped control model.
