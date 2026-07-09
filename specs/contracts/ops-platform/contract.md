# ops-platform Contract

Status: active. Owns the local development and release/deployment
tooling for the FastAPI + Angular stack.

## Golden Path

- The repository root `.nvmrc` pins Node.js **24**. Local setup docs and the release CI workflow (`release-images.yml`) use the same major version. Contributors run `nvm use` from the repository root before frontend commands.
- Local development runs with the root `docker-compose.yml`.
- Compose starts `postgres`, `redis`, `migrate`, `backend`, and `frontend`.
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
- Pull requests and pushes to `main` run `.github/workflows/ci.yml`:
  the default backend suite (`pytest -m "not postgres"`, in-memory SQLite
  and fakeredis — no Postgres service), Postgres-specific integration tests
  (`pytest -m postgres`) against a GitHub Actions `postgres:16-alpine` service
  container with migrations applied, frontend unit tests, production build,
  and Docker image builds without registry push.
- PR CI complements `release-images.yml` and `bump-app.yml` (CHG-025/026);
  it does not replace release publishing.
- Frontend production Docker builds accept `APP_VERSION` (default `dev`). The build
  runs `scripts/write-app-version.mjs` to generate `src/app/core/app-version.ts`
  before `ng build`. Release workflow passes `github.event.release.tag_name` as
  `APP_VERSION` (CHG-037).
- The Angular frontend is a production PWA (CHG-038): `ngsw-config.json`,
  `manifest.webmanifest`, icon set, service worker enabled outside dev mode,
  dynamic branding icon/title from event config, and an update banner when a new
  service worker version is available.
- **Redis (CHG-041)**: `redis:7-alpine` in compose for orchestrator hot state and SSE pub/sub fan-out across backend replicas. Production deployments require Redis for multi-replica SSE. Reverse proxies must disable buffering for `text/event-stream` and use extended `proxy_read_timeout` for long-lived SSE connections.
- CI may run orchestrator integration tests with a Redis service container (`@pytest.mark.redis`).

## Owned Files

- `.nvmrc`
- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/scripts/write-app-version.mjs`
- `frontend/ngsw-config.json`
- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/**`
- `frontend/src/app/core/pwa/**`
- `.github/workflows/release-images.yml`
- `.github/workflows/bump-app.yml`
- `.github/workflows/ci.yml`
