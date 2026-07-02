# ops-platform Contract

Status: active. Owns the local development and release/deployment
tooling for the FastAPI + Angular stack.

## Golden Path

- Local development runs with the root `docker-compose.yml`.
- Compose starts `postgres`, `migrate`, `backend`, and `frontend`.
- PostgreSQL is the only service with a Docker Compose healthcheck.
- The backend image and backend compose service MUST NOT define a
  Docker `HEALTHCHECK`. Runtime readiness is owned by the orchestrator
  and by explicit smoke checks against the backend health endpoint.
- Migrations run in a one-shot `migrate` container before the backend
  service starts.
- Backend images are multi-stage Python builds that build and install
  the project wheel, run as a non-root user, and expose port `8000`.
- Frontend images are parameterized multi-target builds:
  - `dev` target: Node dev server for compose development.
  - `prod` target: unprivileged nginx serving the Angular production
    build on port `8080`.
- Frontend build arguments include the Node base image, nginx base
  image, and Angular build configuration.
- The Angular dev-server proxy is environment-aware: host development
  defaults to `http://localhost:8000`, while compose sets
  `API_PROXY_TARGET=http://backend:8000`.
- GitHub release workflows cache Python, npm, and Docker Buildx layers.
- Release workflows publish both the release tag and `latest` for each
  backend/frontend image, and keep uploading the `release-tag` artifact
  consumed by the argocd bump workflow.

## Owned Files

- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `.github/workflows/release-images.yml`
- `.github/workflows/bump-app.yml`
