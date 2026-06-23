# Kiosk Screen

Web application for running an event kiosk display with two
persistent regions: the top 4/5 of the screen shows rotating
photos, videos, or embedded web content, and the bottom 1/5
shows client ads.

The MVP is planned as:

- `frontend`: Angular and TypeScript for the operator and display
  UI.
- `backend`: FastAPI, SQLAlchemy, Alembic, and PostgreSQL for API,
  auth, data, and operational events.
- `deploy`: Kubernetes-oriented deployment assets.

## What the app does

- Signs in authorized users with basic login.
- Opens a live kiosk display for a configured event duration.
- Rotates eligible top content and ads in configured order.
- Lets authorized users manage content, ads, iframes, users,
  roles, the event branding, the kiosk configuration, and the
  setup check.

## Repository status

The repository follows GitHub Spec Kit (SDD) for the
`fastapi + angular` kiosk application. Each feature is documented
as a flat `specs/NNN-<slug>/` directory with `spec.md`, `plan.md`,
`tasks.md`, and `checklist.md`. There are no `_archive` or
`_capabilities` subdirectories; closed features stay in their
original spec dir, with the `## Superseded by` block listing the
amending specs.

The active feature is `specs/014-display-screen-runtime/` (per
`.specify/feature.json`); the other 13 specs are present for
context. New features open as `specs/015-<slug>/` and run the
full Spec Kit flow: `/speckit.specify` → `/speckit.clarify` →
`/speckit.checklist` → `/speckit.plan` → `/speckit.tasks` →
`/speckit.analyze` → `/speckit.implement`.

## Spec inventory

1. `001-foundation-auth-and-rbac` — `Role` enum, the six role
   sets, session-cookie auth, bootstrap admin.
2. `002-kiosk-display-config-and-session` — kiosk configuration
   knobs, `operator_sessions` lifecycle, polling cadence, open
   kiosk.
3. `003-admin-media-uploads` — `media_file_references`,
   extension-based auto-detect, MIME / size allow lists, logo
   validation.
4. `004-api-keys-and-public-content-upload` — `api_keys`,
   admin CRUD, public bearer-auth upload.
5. `005-display-control-state` — `display_control_states`,
   three content modes, four navigation commands, ads toggle,
   fullscreen, auto-fallback.
6. `006-preconfigured-iframes-and-video-end` — `iframes`,
   CRUD, `video_end_delay_seconds`, auto-revert on deletion.
7. `007-content-rotation-modes` — `is_fixed`,
   `recurring_every_x_iterations`, fixed mode, pause / resume,
   empty-queue debounce.
8. `008-event-branding` — `event_configurations`, public
   branding endpoint, kiosk overlay.
9. `009-content-and-ads-admin` — content and ad CRUD, drag-drop
   reorder, upload, auto-detect.
10. `010-users-and-roles-admin` — user CRUD, role assignment,
    "last administrator" guard.
11. `011-readiness-setup-check` — `evaluate_readiness(...)`,
    `/readiness`, dashboard panel, "Open kiosk" gate.
12. `012-display-events-audit-log` — `display_events`, secret
    sanitizer, unified 22-string `event_type` catalog.
13. `013-admin-shell-and-navigation` — Material 3 shell,
    sidenav, hall, dashboard, dirty-form guard.
14. `014-display-screen-runtime` — kiosk Angular component,
    `KioskRotationController`, `DisplayRotationService`,
    fullscreen, cross-tab sync, empty-queue POST.

## Conventions

- One branch per feature, named `NNN-<slug>` to match the spec
  directory.
- One merge PR per feature.
- `## Supersedes` and `## Superseded by` blocks at the bottom
  of each `spec.md` document cross-spec amendments; the amended
  spec's `## Superseded by` block grows as amendments land.
- A new `event_type` string MUST be added to the unified catalog
  in `012-display-events-audit-log/spec.md` before the producer
  emits it.

## Local lab environment

Prerequisites:

- Python 3.12
- Node.js compatible with the selected Angular CLI
- Docker or OrbStack
- PostgreSQL client tools are optional, but useful for debugging

The repository pins the local Node version in `.nvmrc`
(currently `22.14.0`). Use `nvm use` from the repository root to
switch automatically before running any frontend command.

The local lab PostgreSQL container is exposed on host port
`15432`. This avoids conflicts with a native PostgreSQL server
that may already be listening on `localhost:5432`.

Use three terminals from the repository root.

### 1. Database

```sh
docker compose up -d postgres
docker compose ps
```

If PostgreSQL was already running from an older checkout that
exposed host port `5432`, recreate the container so the `15432`
mapping is applied:

```sh
docker compose down
docker compose up -d postgres
```

Expected database settings:

- Host: `localhost`
- Port: `15432`
- Database: `kiosk_screen`
- User: `kiosk`
- Password: `kiosk`

Optional connectivity check:

```sh
docker compose exec postgres psql -U kiosk -d kiosk_screen -c "select current_user, current_database();"
```

### 2. Backend

```sh
cd backend
pip install -e ".[dev]"
cd ..
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

The backend listens on `http://localhost:8000`. Development
defaults are already configured for:

- `DATABASE_URL=postgresql+psycopg://kiosk:kiosk@localhost:15432/kiosk_screen`
- `SESSION_SECRET=development-only-session-secret`
- `FRONTEND_ORIGIN=http://localhost:4200`
- `BOOTSTRAP_ADMIN_EMAIL=admin@example.com`
- `BOOTSTRAP_ADMIN_PASSWORD=admin`
- `BOOTSTRAP_ADMIN_DISPLAY_NAME=Administrator`
- `MEDIA_STORAGE_PATH=<repo>/var/media`
- `IMAGE_UPLOAD_MAX_BYTES=26214400`
- `VIDEO_UPLOAD_MAX_BYTES=524288000`

If your shell exports `DATABASE_URL`, make sure it uses port
`15432`, or unset it before starting the backend:

```sh
unset DATABASE_URL
```

Uploaded media is stored on disk. For local development, either
use the default `var/media` directory or set an explicit path
before starting the backend:

```sh
mkdir -p var/media
export MEDIA_STORAGE_PATH="$(pwd)/var/media"
```

### 3. Frontend

```sh
cd frontend
npm install
npm start
```

The frontend listens on `http://localhost:4200`. The development
server proxies `/api` requests to `http://localhost:8000`, so
keep the backend running while using the UI.

Default MVP login:

- Email: `admin@example.com`
- Password: `admin`

Open the app at `http://localhost:4200`.

### Admin workflow

After login, open `/admin`. The administration shell provides
persistent navigation to:

- `/admin/content` for display content
- `/admin/ads` for ad entries
- `/admin/iframes` for preconfigured iframes
- `/admin/event` for the event branding
- `/admin/configuration` for kiosk timing, animation, inline
  ads, and enabled state
- `/admin/readiness` for the setup check
- `/admin/remote-control` for live event control
- `/admin/users` for users, active status, and role assignment
- `/admin/api-keys` for public API keys

Create and edit forms warn before losing unsaved changes. Save
and validation messages are intentionally user-facing and should
not expose internal paths, storage locations, or secrets.

Useful local checks:

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```

Frontend test scripts:

- `npm --prefix frontend run test`: headless, single run. Use
  for day-to-day validation; does not open a browser window.
- `npm --prefix frontend run test:watch`: headed (`Chrome`) with
  autoWatch. Use for TDD; opens a real browser window.
- `npm --prefix frontend run test:ci`: headless, single run, with
  code coverage. Use for pipelines; writes reports to
  `frontend/coverage/kiosk-screen/`.

Note: `pytest backend/tests/integration` must be run from the
repository root. `backend/tests/integration/test_migrations.py`
references `backend/alembic/...` with a path literal, so running
it from inside `backend/` raises a `FileNotFoundError` and
reports a false negative.

If `npm --prefix frontend run build` exits non-zero but writes
`frontend/dist/kiosk-screen`, inspect the generated files and
keep the terminal output with the validation record. The
application tests and typechecks should still be run separately.

### PostgreSQL role troubleshooting

If Alembic fails with:

```text
FATAL:  no existe el rol "kiosk"
```

the Docker volume was probably initialized before this project
defined the `kiosk` database role. PostgreSQL only applies
`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` when the
data directory is first created. This can also happen when
another local PostgreSQL server is already listening on
`localhost:5432`. The lab compose file exposes PostgreSQL on
`localhost:15432` to avoid that conflict.

For a disposable local lab database, recreate the database
volume and port binding:

```sh
docker compose down -v
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
```

This deletes local PostgreSQL data for this compose project.

To keep the existing volume, create the expected role and
database manually from an existing PostgreSQL superuser. Replace
`<existing-superuser>` with a role that already exists in that
volume. A fresh database created by this compose file uses
`kiosk`; older reused volumes may use a different role and may
not have a `postgres` role.

```sh
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "CREATE ROLE kiosk WITH LOGIN PASSWORD 'kiosk';"
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "CREATE DATABASE kiosk_screen OWNER kiosk;"
alembic -c backend/alembic.ini upgrade head
```

If `kiosk_screen` already exists, change its owner instead of
creating it:

```sh
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "ALTER DATABASE kiosk_screen OWNER TO kiosk;"
```

## Validation

The project requires tests for changed behavior. Typical
validation includes:

- Backend unit and integration tests with `pytest`
- Frontend tests with Angular-compatible tooling
- OpenAPI contract validation
- Alembic migration checks

For each spec, run the narrowest relevant tests first (unit
specs that exercise the changed domain logic, then integration
specs that exercise the API surface, then frontend specs). Do
not run the full suite unless the change risk justifies it.

## Out of scope

- Billing and invoicing
- Advanced ad targeting or personalization
- Multi-tenant ownership
- Hardware control for the display device
- Speculative implementation details that are not approved in
  the spec and plan
