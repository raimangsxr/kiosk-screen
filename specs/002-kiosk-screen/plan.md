# Implementation Plan: Kiosk Screen Content and Ads

**Branch**: `002-kiosk-screen` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-kiosk-screen/spec.md`

## Summary

Build a small web application for operating a large-screen kiosk with a fixed
top content region and bottom client-ad region. The MVP uses Angular with
TypeScript for the frontend, Python with FastAPI for backend APIs, SQLAlchemy
and Alembic for PostgreSQL persistence, OpenAPI for contracts, basic login for
operator access, and Kubernetes-oriented container deployment. The design keeps
UI concerns in Angular, application/domain logic in backend services, and
database access inside SQLAlchemy-managed repositories and unit-of-work
boundaries.

## Technical Context

**Language/Version**: TypeScript with Angular-supported TypeScript version;
Python 3.12 for backend runtime and tooling

**Primary Dependencies**: Angular standalone components, Angular Router,
Angular HTTP client, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL
driver, pytest, Angular-compatible test runner, container tooling

**Storage**: PostgreSQL is the source of truth for persisted data; structural
changes are managed only through Alembic migrations

**Testing**: pytest for backend unit, service, and API tests; Angular-compatible
unit/component tests for frontend behavior; contract or integration tests for
OpenAPI-backed frontend/backend interactions

**Target Platform**: Web browser for operators and kiosk display; FastAPI
backend running in containers; Kubernetes deployment target; CI builds images
on GitHub release creation and uploads to Docker Hub; CD handled by existing
ArgoCD app-of-apps setup

**Project Type**: Web application with separate frontend and backend packages
in one repository

**Performance Goals**: Kiosk display opens and shows eligible content within
30 seconds; content/ad rotation remains visually stable; readiness issues are
visible to administrators within 1 minute; management item creation flows stay
under 2 minutes per item

**Constraints**: MVP remains single-organization and single-kiosk; basic login
only; no alternate frontend or backend framework; no direct database access
outside SQLAlchemy-managed patterns; no automatic schema creation in
production-like flows; every schema change has an Alembic migration

**Scale/Scope**: First release supports one owning organization, one kiosk
display configuration, role-based management, approved embedded domains,
configured-order content/ad rotation, readiness review, and operational events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan maps directly to user stories US1-US4,
  functional requirements FR-001 through FR-028, and success criteria SC-001
  through SC-011.
- **Requirement clarity**: PASS. Clarifications have resolved display access,
  embedded domain approval, rotation rules, session duration, and data
  ownership. No planning blockers remain.
- **Plan alignment**: PASS. Technical choices follow the user-approved
  direction and stay within the MVP boundaries from the spec.
- **Simplicity**: PASS. The architecture uses one Angular app, one FastAPI app,
  one PostgreSQL database, and explicit service/repository boundaries without
  speculative multi-tenant or ad-tech features.
- **Contracts**: PASS. Backend APIs are documented through OpenAPI and the
  frontend must integrate against that contract.
- **Testing**: PASS. Backend, frontend, and API contract/integration test
  coverage are planned for changed behavior and external boundaries.
- **Security, observability, accessibility**: PASS. Basic login, role-based
  authorization, approved iframe domains, audit/operational events, and
  management accessibility requirements are included.
- **No speculative scope**: PASS. Billing, advanced ad targeting, multi-tenant
  ownership, client self-service, and hardware control remain out of scope.
- **Conflict handling**: PASS. If implementation reality conflicts with this
  plan or the approved spec, work stops until the conflict is documented and
  the spec or plan is amended.

## Proposed Architecture

The application is split into three layers:

1. **Angular frontend**: Operator, content manager, advertising manager, and
   administrator screens plus the full-screen kiosk display route. Standalone
   components own presentation and interaction state. Angular services own API
   communication. Domain/application decisions are kept out of components.
2. **FastAPI backend**: OpenAPI-documented API boundary, request validation,
   authentication, authorization, application services, SQLAlchemy repositories,
   Alembic migrations, and operational event recording.
3. **PostgreSQL persistence**: Durable source of truth for organization,
   users, roles, kiosk configuration, content, ads, clients, approved domains,
   availability windows, and display events.

Frontend/backend communication happens only through FastAPI APIs that are
documented in `contracts/openapi.yaml`. The backend owns validation at API
boundaries and database invariants. The frontend treats OpenAPI as the source
for request/response shape and status-code expectations.

## Main Modules

### Frontend

- **Display module**: Full-screen kiosk route with 4/5 top region and 1/5 ad
  region, deterministic rotation, fallback states, and no management controls.
- **Auth module**: Login, current user/session state, route guards, and logout.
- **Content module**: Main content management for photos, videos, and approved
  embedded content sources.
- **Ads module**: Client and ad management for the bottom region.
- **Readiness module**: Readiness summary, blocking issues, and current display
  state for authorized users.
- **Admin module**: User role assignments, approved embedded domains, and kiosk
  configuration.
- **Shared application services**: API clients, DTO mapping, error presentation,
  and cross-cutting UI state.

### Backend

- **api**: FastAPI routers, request/response schemas, OpenAPI metadata, and
  dependency wiring.
- **auth**: Basic login, password verification, session handling, current-user
  resolution, and role checks.
- **domain**: Application-level entities, state rules, rotation eligibility,
  readiness evaluation, and authorization decisions.
- **services**: Use-case orchestration for content, ads, readiness, display,
  approved domains, and users.
- **repositories**: SQLAlchemy-managed persistence access only.
- **migrations**: Alembic migration history for every schema change.
- **observability**: Structured application logs and display/content/ad event
  recording.

## API Contracts

The MVP exposes FastAPI endpoints documented through OpenAPI in
`contracts/openapi.yaml`.

Primary contract groups:

- **Authentication**: login, logout, current user.
- **Kiosk display**: read display configuration, open live display, read current
  display state, list eligible top content and ads.
- **Top content**: CRUD, activation/deactivation, ordering, duration, and
  availability.
- **Ads and clients**: client CRUD, ad CRUD, activation/deactivation, ordering,
  duration, and availability.
- **Approved embedded domains**: administrator-managed allowlist for iframe
  sources.
- **Readiness**: report whether the display is ready and list blocking issues.
- **Users and roles**: administrator-managed users and role assignments for the
  single organization.
- **Operational events**: append system-generated events and list recent events
  for authorized diagnostics.

Validation happens at API boundaries with request schemas and domain rules.
Frontend requests must respect OpenAPI request shapes, response shapes, and
error responses.

## Data Model

The first release uses a single-organization model. Data entities and fields are
defined in [data-model.md](./data-model.md). PostgreSQL stores durable state,
and Alembic manages schema structure. SQLAlchemy repositories are the only
database access path in application code.

Core entities:

- Organization
- User
- RoleAssignment
- KioskDisplayConfiguration
- TopContentItem
- Client
- ClientAdItem
- ApprovedEmbeddedDomain
- DisplayEvent
- OperatorSession

## Security Model

- Basic login for MVP with authenticated sessions.
- Session cookies use secure cookie settings, logout invalidation, and
  cross-site request protection appropriate to the deployed frontend/backend
  origin model.
- Opening the live kiosk display requires an authorized Event Operator or
  Administrator.
- Operator sessions for live display remain valid for the configured event
  duration.
- Role checks separate display operation, top-content management, ad
  management, administration, and display viewing.
- Embedded web content is allowed only from administrator-approved domains.
- Management controls, internal diagnostics, secrets, and private details never
  appear on the public kiosk display route.
- API boundary validation rejects unauthorized actions, unapproved embedded
  domains, invalid ordering/duration, and invalid availability windows.
- Secrets are provided through runtime environment configuration and never
  hardcoded.

## Observability

- Backend logs use structured fields for request ID, user ID when available,
  role, action, entity type, entity ID, and outcome.
- DisplayEvent records cover login/open-display events, content/ad changes,
  domain approval changes, readiness warnings, load failures, and fallback
  activations.
- Readiness diagnostics expose missing active content, missing active ads,
  invalid media/source references, unapproved embedded domains, invalid
  ordering, missing event duration, and authorization issues.
- Kubernetes deployment MUST expose health and readiness endpoints for the
  backend.

## Testing Strategy

- **Backend unit tests**: domain services, readiness rules, rotation
  eligibility, authorization checks, approved-domain validation, and session
  duration behavior.
- **Backend API tests**: FastAPI route behavior for auth, permissions,
  validation failures, CRUD workflows, readiness, display state, and OpenAPI
  contract expectations.
- **Database tests**: SQLAlchemy models, constraints, migrations, and repository
  behavior against PostgreSQL-compatible test infrastructure.
- **Frontend tests**: Angular standalone components, route guards, API service
  behavior, kiosk layout state, management form validation, error/fallback
  states, and accessibility-relevant UI states.
- **Contract/integration tests**: frontend/backend DTO compatibility against
  OpenAPI and end-to-end smoke coverage for login, readiness, content/ad setup,
  and opening the display.

Tests are mandatory for changed behavior. If implementation reality makes a
planned test type infeasible, work stops until the plan is amended.

## Local Development Setup

Local development MUST support:

- PostgreSQL service for persistence.
- FastAPI backend with environment variables for database URL, session secret,
  allowed frontend origin, and initial administrator bootstrap.
- Angular frontend configured to call the local backend API.
- Alembic commands for migration creation and upgrade.
- Backend test command using pytest.
- Frontend test command using Angular-compatible tooling.
- OpenAPI generation or validation command from the FastAPI application.

No production-like flow may rely on automatic schema creation; local setup may
run Alembic migrations to create the schema.

## CI/CD Considerations

- GitHub Actions workflow triggers on GitHub release creation.
- CI installs frontend and backend dependencies, runs lint/type checks where
  configured, runs backend pytest, runs frontend tests, validates migrations,
  and builds container images.
- CI builds and uploads images to Docker Hub using release metadata for tags.
- Kubernetes manifests or Helm/Kustomize assets MUST be prepared for the
  existing ArgoCD app-of-apps flow, but no ArgoCD project requirement is added
  in this MVP plan.
- Runtime configuration uses Kubernetes secrets/config maps for database URL,
  session secret, initial admin bootstrap, and frontend/backend URLs.
- Database migrations are run as an explicit deployment step or job, not through
  automatic app startup schema creation.

## Risks and Assumptions

- **Risk**: Basic login can become a security weak point if password handling or
  session duration is underspecified. **Mitigation**: keep login minimal but
  require password hashing, secure session secrets, role checks, and tests for
  unauthorized paths.
- **Risk**: Iframe sources may fail due to external site policies. **Mitigation**:
  approved-domain management, readiness diagnostics, and fallback display
  behavior.
- **Risk**: Event display reliability depends on content availability.
  **Mitigation**: readiness checks, deterministic rotation, fallback states, and
  display-event recording.
- **Risk**: Kubernetes deployment details may vary with the existing ArgoCD
  app-of-apps setup. **Mitigation**: keep generated deployment assets
  environment-neutral and document integration assumptions.
- **Assumption**: The first release serves one organization and one kiosk
  display configuration.
- **Assumption**: Media/source references point to externally available or
  locally managed assets defined during implementation planning tasks.
- **Assumption**: Docker Hub credentials and Kubernetes cluster configuration
  are provided outside the application source.

## Project Structure

### Documentation (this feature)

```text
specs/002-kiosk-screen/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   ├── requirements.md
│   └── spec-validation.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── alembic/
├── app/
│   ├── api/
│   ├── auth/
│   ├── domain/
│   ├── repositories/
│   ├── services/
│   └── observability/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── ads/
│   │   ├── auth/
│   │   ├── content/
│   │   ├── display/
│   │   ├── readiness/
│   │   └── shared/
│   └── environments/
└── tests/

deploy/
├── kubernetes/
└── ci/
```

**Structure Decision**: Use a repository-root split between `frontend/`,
`backend/`, and `deploy/`. This keeps Angular UI work, FastAPI application
logic, and deployment assets separate while allowing a single feature task list
to coordinate contracts and integration.

## Post-Design Constitution Check

- **Spec traceability**: PASS. `research.md`, `data-model.md`,
  `contracts/openapi.yaml`, and `quickstart.md` each map back to the approved
  specification and this plan.
- **Requirement clarity**: PASS. No unresolved clarification markers remain.
- **Plan alignment**: PASS. Design artifacts preserve the approved Angular,
  FastAPI, SQLAlchemy, Alembic, PostgreSQL, OpenAPI, Kubernetes, GitHub Actions,
  Docker Hub, and ArgoCD direction.
- **Simplicity**: PASS. MVP remains one frontend, one backend, one database, one
  organization, and one kiosk configuration.
- **Contracts**: PASS. `contracts/openapi.yaml` defines the API boundary for
  frontend/backend integration.
- **Testing**: PASS. Test strategy covers backend, frontend, database,
  contract, and smoke validation.
- **Security, observability, accessibility**: PASS. Security model,
  display-event observability, and accessibility requirements are reflected in
  the plan and design artifacts.
- **No speculative scope**: PASS. Deferred product areas remain out of scope.
- **Conflict handling**: PASS. Implementation must stop if the approved spec or
  plan conflicts with implementation reality.

## Complexity Tracking

No constitution violations or complexity exceptions are required for the MVP.
