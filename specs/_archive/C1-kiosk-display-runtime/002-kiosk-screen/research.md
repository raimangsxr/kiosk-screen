# Research: Kiosk Screen Content and Ads

## Decision: Angular frontend with standalone components

**Rationale**: The user explicitly selected Angular and TypeScript. Standalone
components keep the MVP small, reduce module boilerplate, and fit a route-based
application with separate display, management, readiness, and admin surfaces.

**Alternatives considered**: Angular NgModules were rejected as the default
because the user prefers standalone components unless project structure requires
modules. Other frontend frameworks are out of scope.

## Decision: FastAPI backend with OpenAPI contracts

**Rationale**: The user explicitly selected Python with FastAPI and required
backend APIs to be exposed through FastAPI and documented through OpenAPI.
FastAPI naturally publishes OpenAPI from request and response schemas, which
supports frontend/backend contract validation.

**Alternatives considered**: Other Python web frameworks were rejected because
they are not approved. Direct frontend database access was rejected because all
persistence must go through backend API and SQLAlchemy-managed patterns.

## Decision: SQLAlchemy 2.x and Alembic for PostgreSQL persistence

**Rationale**: PostgreSQL is the source of truth, SQLAlchemy is the required ORM
and data access layer, and Alembic is required for every structural schema
change. This supports explicit migrations, testable repositories, and controlled
deployment.

**Alternatives considered**: Automatic schema creation is rejected for
production-like flows. Raw SQL outside managed SQLAlchemy patterns is rejected
by technical direction.

## Decision: Basic login with role-based authorization

**Rationale**: The spec requires operator login before opening the kiosk display
and separate permissions for display operation, top-content management,
ad management, and administration. Basic login keeps MVP scope small while
supporting authorization and audit requirements.

**Alternatives considered**: OAuth/SSO is not selected for MVP because it is not
required by the spec and would expand delivery scope. Public or unlisted display
access was rejected during clarification.

## Decision: Deterministic configured-order rotation

**Rationale**: The clarified spec requires active top content and ads to rotate
in configured order using per-item or default durations. Deterministic order
makes readiness, preview, and acceptance tests predictable.

**Alternatives considered**: Random rotation and exposure-balancing ad logic
were rejected because they add complexity and are not needed for the MVP.

## Decision: Approved-domain allowlist for embedded content

**Rationale**: Embedded web content can fail or expose unsafe pages. The spec
requires only administrator-approved domains for embedded top content, which
keeps iframe use useful while lowering display and security risk.

**Alternatives considered**: Allowing any URL was rejected for security and
event-screen reliability. Disabling embedded content was rejected because iframe
content is part of the product idea.

## Decision: Containerized Kubernetes deployment with release-triggered CI

**Rationale**: The user selected Kubernetes, GitHub Actions triggered by GitHub
release creation, Docker Hub image publishing, and ArgoCD app-of-apps CD. The
plan defines image build and deployment artifact expectations without adding
ArgoCD project requirements.

**Alternatives considered**: Non-container deployment and non-Kubernetes targets
are out of scope. ArgoCD project setup is deferred because the user stated there
are no project requirements at this point.

## Decision: Test strategy split by boundary

**Rationale**: The constitution requires tests for changed behavior. Backend
behavior uses pytest; frontend behavior uses Angular-compatible tests; API
behavior gets contract or integration tests where relevant.

**Alternatives considered**: Manual-only validation is rejected except for any
future item that cannot be automated and is explicitly documented with rationale.
