---
id: CHG-026
type: change
status: in-progress
modifies:
  - OPS.PLATFORM
  - OPS.CI
depends_on:
  - CHG-025
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Cross-repo platform standardization

## Goal

Align `kiosk-screen`, `amrn-bull`, and `amrn-escalabirras-dual` on one
FastAPI + Angular operating model for local development, image builds,
and release workflows.

## Requirements

- `docker-compose.yml` must provide a full local stack:
  `postgres`, `migrate`, `backend`, and `frontend`.
- Backend migrations must run out-of-band in a one-shot service, not in
  the backend image entrypoint.
- Backend Dockerfiles must be multi-stage wheel builds, run as non-root,
  and must not contain Docker `HEALTHCHECK`.
- Compose must not define a backend service healthcheck.
- Frontend Dockerfiles must expose a `dev` target for compose and a
  `prod` target for nginx runtime.
- Frontend Dockerfiles must be parameterized through build args for the
  Node image, nginx image, and Angular build configuration.
- Compose must set the Angular dev-server proxy target to the backend
  service DNS name (`http://backend:8000`) so browser calls to `/api/*`
  do not try to reach `localhost` inside the frontend container.
- GitHub release workflows must use setup caches for Python and npm,
  Docker Buildx cache for backend and frontend images, and push both
  release-tagged and `latest` images.
- Release workflows must preserve the `release-tag` artifact used by
  the argocd bump workflow.

## Validation

- `docker compose config` succeeds.
- Workflow YAML parses.
- Existing backend/frontend tests and builds remain the broader
  validation path.
