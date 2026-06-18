# Implementation Plan: Administration Refactor

**Branch**: `007-admin-refactor` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-refactor/spec.md`

## Summary

Refactor the kiosk-screen application as one complete release covering the administration UX, frontend structure, backend modularity, user-facing contracts, application error handling, and optional persisted data redesign. The refactor preserves approved kiosk business goals while allowing visible flows, contracts, and data structures to change when documented, migrated, and fully validated. The technical approach keeps the approved stack: Angular/TypeScript frontend with Angular Material for the administration UI, FastAPI backend with SQLAlchemy/Alembic/PostgreSQL, disk-backed media storage, pytest backend validation, and Angular-compatible frontend tests.

## Technical Context

**Language/Version**: TypeScript with the Angular-supported TypeScript version already configured in `frontend/package.json`; Python 3.12 for backend runtime and tooling.

**Primary Dependencies**: Angular standalone components, Angular Router, Angular Reactive Forms, Angular HTTP client, Angular Material, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL driver, pytest, Angular test tooling.

**Storage**: PostgreSQL remains the source of truth for persisted application data. Uploaded media remains disk-backed with database metadata references. Data model redesign is allowed only with Alembic migrations and documented migration validation.

**Testing**: Backend behavior covered with pytest unit, integration, migration, and contract tests. Frontend behavior covered with Angular-compatible component/service/facade tests. Manual smoke validation required for final hall/admin/kiosk flows, migration, accessibility, user-facing errors, and kiosk regression.

**Target Platform**: Browser-based web application with separated Angular frontend and FastAPI backend, deployed through existing container/Kubernetes-oriented assets.

**Project Type**: Web application with separate frontend and backend packages in one repository.

**Performance Goals**: Hall/admin/kiosk navigation remains usable within two clicks to target sections; administration feedback appears within 5 seconds; kiosk rotation timing remains faithful to effective configuration; maintainers can locate relevant contracts and validation paths within 5 minutes.

**Constraints**: Big bang release. No speculative product features. Existing business goals must remain valid. Any changed contract, user flow, or persisted model requires documented migration or compatibility validation. Production-like database structural changes require Alembic migrations; no automatic schema creation reliance.

**Scale/Scope**: Full administration refactor covering hall, admin shell, content, ads, clients, approved domains, display configuration, readiness, users/roles, kiosk regression, frontend feature structure, backend API/schema/service/error modularity, and migration validation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan references `spec.md`, clarifications, FR-001 through FR-026, and SC-001 through SC-015.
- **Requirement clarity**: PASS. Clarification resolved scope, compatibility, data migration boundary, delivery strategy, and final acceptance gate.
- **Plan alignment**: PASS. Technical approach implements the complete refactor without adding speculative product behavior.
- **Simplicity**: PASS WITH RISK. The refactor is intentionally broad, but modular boundaries map to current product capabilities and avoid new product scope.
- **Contracts**: PASS. UI, API/error, and migration contracts are created under `contracts/`.
- **Testing**: PASS. The plan includes unit, integration, contract, migration, frontend, and manual smoke validation.
- **Security, observability, accessibility**: PASS. Role preservation, safe user-facing errors, operational records, keyboard usability, and desktop/tablet accessibility are planned.
- **No speculative scope**: PASS. Analytics, scheduling, billing, targeting, new media types, password reset, and new role types remain excluded.
- **Conflict handling**: PASS. Any implementation reality that conflicts with this plan must stop and update spec/plan before changing direction.

## Phase 0: Research

Research output is captured in [research.md](./research.md). Key decisions:

- Use Angular Material as the administration design system while keeping kiosk display custom and fullscreen.
- Use Reactive Forms for all administration create/edit workflows.
- Organize frontend by feature with shared UI/form primitives and facades for screen state.
- Modularize backend by capability and split Pydantic schemas by domain.
- Centralize application errors and map them to safe API responses.
- Permit persisted data redesign only through Alembic migrations with validation.
- Deliver as one big bang release with a strict final acceptance gate.

## Phase 1: Design

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/admin-ui-contract.md](./contracts/admin-ui-contract.md)
- [contracts/backend-contract.md](./contracts/backend-contract.md)
- [contracts/migration-contract.md](./contracts/migration-contract.md)
- [quickstart.md](./quickstart.md)

## Proposed Architecture

### Frontend

The frontend will be reorganized into capability-oriented feature areas with explicit presentation, state, form, and API boundaries.

```text
frontend/src/app/
├── core/
│   ├── auth/
│   ├── routing/
│   └── errors/
├── shared/
│   ├── ui/
│   ├── forms/
│   └── contracts/
├── features/
│   ├── hall/
│   ├── admin-shell/
│   ├── dashboard/
│   ├── content/
│   ├── ads/
│   ├── clients/
│   ├── domains/
│   ├── display-config/
│   ├── readiness/
│   └── users/
└── display/
```

Rules:

- Administration screens use Angular Material components for navigation, actions, forms, tables, dialogs, snackbars, progress, and toggles.
- Kiosk display remains visually independent from administration Material layout.
- Forms use typed Reactive Forms with shared validators and dirty-change behavior.
- Components should focus on rendering and user interaction. Feature facades own loading, saving, refresh, errors, and view-model state.
- API services are thin adapters to backend contracts and do not contain UI behavior.
- Shared UI components must be reusable across admin sections without embedding feature-specific business logic.

### Backend

The backend will be reorganized around application capabilities with explicit API, application service, domain, and infrastructure boundaries.

```text
backend/app/
├── api/
│   └── v1/
│       ├── auth/
│       ├── content/
│       ├── ads/
│       ├── clients/
│       ├── domains/
│       ├── display/
│       ├── readiness/
│       └── users/
├── application/
│   ├── content/
│   ├── ads/
│   ├── clients/
│   ├── domains/
│   ├── display_config/
│   ├── readiness/
│   └── users/
├── domain/
├── infrastructure/
│   ├── database/
│   ├── media_storage/
│   └── observability/
└── shared/
    ├── errors/
    └── contracts/
```

Rules:

- FastAPI route handlers validate boundaries, delegate to application services, and map responses.
- Business behavior lives outside route handlers.
- Pydantic schemas are grouped by capability and separated into request, response, and error contracts.
- SQLAlchemy remains the only database access layer.
- Every structural database change includes an Alembic migration.
- Application errors are typed and centrally mapped to safe API error responses.
- Existing operational events remain available or are migrated with documented compatibility.

## API Contracts

The refactor may change visible contracts, but all changes must be documented. The plan uses `contracts/backend-contract.md` as the canonical planning contract for:

- preserved business goals
- changed endpoint groups or payloads
- error envelope
- authorization expectations
- migration/compatibility notes
- contract validation requirements

OpenAPI output remains the generated API contract for implementation validation.

## Data Model And Migration

The refactor may redesign persisted data structures. Any data redesign must:

- preserve kiosk content, ads, clients, approved domains, users, roles, display configuration, media references, and operational records
- use Alembic migrations
- include migration validation tests
- include a documented compatibility note
- avoid requiring administrators to recreate records

If planning discovers no structural data change is necessary, the implementation must explicitly record that no migration is required beyond compatibility validation.

## Security Model

- Preserve least-privilege role behavior for administrator, content manager, advertising manager, event operator, and display viewer capabilities.
- Do not broaden access during frontend route or backend API reorganization.
- Validate all user input at API boundaries and form boundaries.
- Do not expose secrets, internal paths, raw session data, or stack traces in user-facing errors.
- Preserve authenticated access for hall, admin, kiosk display, media, and API calls.

## Observability

- Centralized errors must preserve safe user feedback and maintainable diagnostics.
- Backend application failures that affect setup, display operation, uploads, migration, or administration must be logged or recorded through operational events.
- Final validation records must include build/test/smoke/migration/accessibility/error/kiosk regression status.

## Accessibility

- Administration navigation, forms, dialogs, tables, and actions must be keyboard usable.
- Focus states, labels, validation messages, loading states, and error states must be visible and semantically clear.
- Administration layouts must remain readable at 1024x768 and 1440x900.
- Kiosk display must preserve fullscreen readability and Escape-to-hall behavior.

## Testing Strategy

- **Frontend unit/component tests**: shared UI, admin shell, hall, forms, lists, dialogs, dirty-change behavior, error states, and kiosk Escape regression.
- **Frontend facade/service tests**: loading, saving, refresh, validation, error mapping, last-save-wins behavior, and API contract adapters.
- **Backend unit tests**: domain rules, application services, typed errors, migration helpers, and service-level behavior.
- **Backend integration tests**: API authorization, validation, uploads, content/ad/client/domain/display/users/readiness behavior.
- **Contract tests**: OpenAPI generation, user-facing backend contract, error envelope, migration compatibility notes, and UI contract expectations.
- **Migration tests**: existing fixture data migrates and remains usable.
- **Manual smoke**: login, hall, admin setup, kiosk mode, Escape-to-hall, display rotation, upload failure, validation failure, dependency conflict, desktop/tablet accessibility checks.

## Local Development Setup

- Continue using the existing local lab startup from `README.md`.
- Apply migrations before backend startup.
- Run backend and frontend locally.
- Validate login with `admin@example.com` / `admin`.
- Start from hall, test admin, then kiosk mode.

## CI/CD Considerations

- CI must run backend tests, frontend tests, frontend build, migration checks, and Docker image builds.
- Release validation must include a recorded final acceptance gate because this is a big bang delivery.
- Existing Kubernetes and ArgoCD-oriented deployment assets remain the deployment baseline unless plan follow-up explicitly changes them.
- DockerHub release workflow remains the image publication path unless a later approved plan changes it.

## Risks And Assumptions

- **Risk**: Big bang delivery can hide regressions until late. **Mitigation**: strict final acceptance gate and broad automated coverage before completion.
- **Risk**: Redesigning contracts and data together can create migration gaps. **Mitigation**: explicit backend and migration contracts plus migration validation.
- **Risk**: Angular Material adoption could become superficial if old component responsibilities remain. **Mitigation**: require separation of presentation, forms, facades, and API adapters.
- **Risk**: Backend modularization could introduce unnecessary abstraction. **Mitigation**: module boundaries must map to existing product capabilities.
- **Risk**: Kiosk display behavior could regress while admin is refactored. **Mitigation**: kiosk regression and Escape-to-hall checks are part of final acceptance.
- **Assumption**: Existing business behavior remains valid unless explicitly documented as changed.
- **Assumption**: Existing deployment target and local lab workflow remain valid.
- **Assumption**: Existing uploaded files and media references are available during migration validation.

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-refactor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-ui-contract.md
│   ├── backend-contract.md
│   └── migration-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── shared/
├── alembic/
└── tests/
    ├── contract/
    ├── integration/
    ├── migration/
    └── unit/

frontend/
├── src/
│   └── app/
│       ├── core/
│       ├── shared/
│       ├── features/
│       └── display/
└── tests/
```

**Structure Decision**: Keep the existing two-package web application repository while reorganizing internals by capability. Do not create a separate admin application or a separate backend service.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Big bang release | Clarified requirement for one complete release after full refactor | Incremental production releases conflict with the clarified delivery strategy |
| Possible persisted data redesign | Clarified requirement permits redesigned persisted structures with complete migration | Keeping current data model may prevent the requested complete backend refactor if model boundaries remain coupled |
| Angular Material dependency | Required to create a consistent administration design system | Custom CSS has already produced inconsistent admin UX and would not satisfy the requested refactor quality |

## Post-Design Constitution Check

- **Spec traceability**: PASS. Design artifacts map to FR-001 through FR-026 and SC-001 through SC-015.
- **Requirement clarity**: PASS. No unresolved clarification remains.
- **Plan alignment**: PASS. Architecture follows clarified full refactor scope.
- **Simplicity**: PASS WITH JUSTIFIED COMPLEXITY. Complexity exceptions are recorded above.
- **Contracts**: PASS. UI, backend, and migration contracts are documented.
- **Testing**: PASS. Automated and manual validation paths are defined.
- **Security, observability, accessibility**: PASS. Security, diagnostics, and accessibility are planned explicitly.
- **No speculative scope**: PASS. New product features remain out of scope.
- **Conflict handling**: PASS. Contract or migration conflicts require spec/plan update before implementation.
