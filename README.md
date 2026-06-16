# Kiosk Screen

Web application for running an event kiosk display with two persistent regions:
the top 4/5 of the screen shows rotating photos, videos, or embedded web
content, and the bottom 1/5 shows client ads.

The MVP is planned as:

- `frontend`: Angular and TypeScript for the operator and display UI.
- `backend`: FastAPI, SQLAlchemy, Alembic, and PostgreSQL for API, auth, data,
  and operational events.
- `deploy`: Kubernetes-oriented deployment assets.

## What The App Does

- Signs in authorized users with basic login.
- Opens a live kiosk display for a configured event duration.
- Rotates eligible top content and ads in configured order.
- Enforces approved domains for embedded web content.
- Lets authorized users manage content, ads, clients, users, roles, and kiosk
  readiness data.

## Repository Status

The repository follows a spec-driven workflow. Design artifacts live under
`.specify/` and the feature specification task list drives implementation.

Current work is organized around the MVP plan:

- Setup and backend foundation
- Frontend foundation
- Kiosk display MVP
- Content management
- Client ads management
- Admin and readiness workflows
- Deployment and release validation

## Local Development

Expected local services:

- Python 3.12
- Node.js compatible with the selected Angular CLI
- PostgreSQL
- Docker for local database and image builds

Start the development database with:

```sh
docker compose up -d postgres
```

Expected environment variables for the backend:

- `DATABASE_URL`
- `SESSION_SECRET`
- `FRONTEND_ORIGIN`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_DISPLAY_NAME`

## Validation

The project requires tests for changed behavior. Typical validation includes:

- Backend unit and integration tests with `pytest`
- Frontend tests with Angular-compatible tooling
- OpenAPI contract validation
- Alembic migration checks

## Out Of Scope

- Billing and invoicing
- Advanced ad targeting or personalization
- Multi-tenant ownership
- Hardware control for the display device
- Speculative implementation details that are not approved in the spec and plan
