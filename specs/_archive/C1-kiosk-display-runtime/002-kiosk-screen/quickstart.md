# Quickstart: Kiosk Screen Content and Ads

This quickstart describes the expected local development workflow for the MVP.
It is planning documentation only; implementation tasks will create the actual
commands and files.

## Prerequisites

- Node.js version supported by the selected Angular CLI.
- Python 3.12.
- PostgreSQL.
- Docker for container image builds.
- Kubernetes tooling for deployment validation when deployment assets exist.

## Local Services

1. Start PostgreSQL locally.
2. Create a development database for the backend.
3. Set backend environment variables:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `FRONTEND_ORIGIN`
   - initial administrator bootstrap values
4. Run Alembic migrations to create or update the schema.

Production-like flows must not rely on automatic schema creation.

## Backend Workflow

Expected backend workflow after implementation:

1. Install backend dependencies.
2. Run database migrations with Alembic.
3. Start the FastAPI development server.
4. Open the generated OpenAPI document.
5. Run backend tests with pytest.

The backend exposes only FastAPI APIs and accesses PostgreSQL only through
SQLAlchemy-managed patterns.

## Frontend Workflow

Expected frontend workflow after implementation:

1. Install frontend dependencies.
2. Configure the frontend API base URL for the local backend.
3. Start the Angular development server.
4. Log in with a seeded administrator or event operator.
5. Use management screens to create:
   - one approved embedded domain,
   - one top content item,
   - one client,
   - one ad item,
   - one configured event duration.
6. Review readiness.
7. Open the kiosk display route and verify the 4:1 screen split.
8. Run Angular-compatible tests.

## Contract Validation

- Treat `contracts/openapi.yaml` as the planning contract.
- Backend implementation must publish an equivalent OpenAPI contract.
- Frontend API services must use request/response shapes that match the
  backend OpenAPI contract.
- Contract or integration tests MUST cover authentication, readiness,
  display state, content management, ad management, approved domains, and
  authorization failures.

## Deployment Workflow

Expected deployment workflow after implementation:

1. Create a GitHub release.
2. GitHub Actions builds frontend and backend images.
3. GitHub Actions uploads images to Docker Hub with release-based tags.
4. Kubernetes manifests or Helm/Kustomize assets reference release image tags.
5. Database migrations run as an explicit deployment step or job.
6. The existing ArgoCD app-of-apps setup syncs the application resources.

No ArgoCD project requirement is introduced by this MVP plan.

## Smoke Validation

Before considering the feature ready:

- A user with event-operator or administrator role can sign in.
- The live display cannot open without authentication and event duration.
- Readiness reports missing active top content, missing active ads, invalid
  embedded domains, invalid order, and unavailable sources.
- Active top content and ads rotate in configured order.
- The display preserves the 4/5 top and 1/5 bottom layout.
- Unauthorized users cannot change content, ads, domains, users, or display
  configuration.
- Backend and frontend tests pass.
- OpenAPI contract validation passes.
