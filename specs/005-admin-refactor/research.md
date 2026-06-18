# Research: Administration Refactor

## Decision: Use Angular Material As The Admin Design System

**Rationale**: The current administration UI relies on global custom CSS and inline templates, producing inconsistent controls, feedback, and layout. Angular Material gives a coherent baseline for navigation, forms, tables, buttons, dialogs, snackbars, progress indicators, and accessibility semantics while staying inside the Angular stack.

**Alternatives considered**:

- Keep custom CSS: rejected because it preserves the inconsistency that motivated the refactor.
- Introduce a different UI framework: rejected because the frontend stack is Angular and the project should not add another frontend framework.

## Decision: Keep Kiosk Display Separate From The Admin Design System

**Rationale**: Kiosk mode is a fullscreen runtime display, not an administration workflow. Applying administration components to kiosk mode risks visual regression and unnecessary runtime weight. Kiosk display should keep a focused fullscreen layout while preserving Escape-to-hall behavior and rotation rules.

**Alternatives considered**:

- Apply Material globally including kiosk display: rejected because kiosk mode has a distinct visual and operational purpose.
- Split kiosk into a separate app: rejected for now because a separate application would add deployment and routing complexity without a current product need.

## Decision: Use Typed Reactive Forms For Administration Forms

**Rationale**: Administration forms need consistent validation, dirty-change tracking, upload state, save feedback, and testability. Reactive Forms support typed form models, reusable validators, and predictable tests better than template-driven forms for this refactor.

**Alternatives considered**:

- Keep template-driven forms: rejected because current forms duplicate validation and state handling.
- Introduce a third-party form library: rejected because current requirements can be met with Angular-native form patterns.

## Decision: Organize Frontend By Feature With Shared UI, Forms, Contracts, And Facades

**Rationale**: Current components mix presentation, state, API calls, validation, navigation, and error mapping. Feature folders plus facades create discoverable boundaries for each administration capability and support the maintainability success criteria.

**Alternatives considered**:

- Keep the current flat feature folders: rejected because it does not separate screen state and UI contracts clearly enough.
- Build a global store first: rejected because the current scope does not require cross-application state complexity.

## Decision: Modularize Backend By Capability

**Rationale**: Current backend services and schemas are grouped broadly, especially administration behavior. Capability modules make API contracts, schemas, services, repositories, errors, and tests easier to locate and validate.

**Alternatives considered**:

- Keep central `schemas.py` and broad services: rejected because the full refactor explicitly targets backend maintainability.
- Split into multiple services: rejected because a single deployable backend remains simpler and sufficient.

## Decision: Centralize Application Errors

**Rationale**: User-facing errors must be safe and consistent, while maintainers need diagnostic signals. Typed application errors mapped centrally to API responses reduce repeated route-level exception mapping and make error behavior testable.

**Alternatives considered**:

- Continue raising generic Python exceptions and mapping per route: rejected because it duplicates behavior and risks inconsistent responses.
- Return error objects from services: rejected because exception-based control fits the existing FastAPI flow better and keeps service success paths clearer.

## Decision: Permit Data Redesign Only With Alembic Migration And Validation

**Rationale**: Clarification permits persisted data redesign. PostgreSQL remains the source of truth, and existing records must remain usable. Every structural change must use Alembic and include migration tests with representative fixture data.

**Alternatives considered**:

- Forbid data redesign: rejected by clarification.
- Allow manual data scripts without migrations: rejected because it would violate repeatable deployment and validation requirements.

## Decision: Big Bang Release Requires Strong Final Acceptance Gate

**Rationale**: Clarification requires one complete release. This increases integration risk, so completion must be blocked by automated tests, build, manual smoke, migration validation, accessibility checks, user-facing error checks, and kiosk regression.

**Alternatives considered**:

- Incremental production releases: rejected by clarification.
- Automated tests only: rejected because the refactor includes UX, migration, and kiosk display behavior that need manual smoke evidence.
