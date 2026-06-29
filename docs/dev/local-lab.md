# Local Lab Environment

Prerequisites:

- Python 3.12
- Node.js compatible with the selected Angular CLI
- Docker or OrbStack
- PostgreSQL client tools are optional, but useful for debugging

The repository pins the local Node version in `.nvmrc` (currently `22.14.0`).
Use `nvm use` from the repository root to switch automatically before running
any frontend command.

The local lab PostgreSQL container is exposed on host port `15432`. This avoids
conflicts with a native PostgreSQL server that may already be listening on
`localhost:5432`.

Use three terminals from the repository root.

### 1. Database

```sh
docker compose up -d postgres
docker compose ps
```

If PostgreSQL was already running from an older checkout that exposed host port
`5432`, recreate the container so the `15432` mapping is applied:

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

The backend listens on `http://localhost:8000`. Development defaults are already
configured for:

- `DATABASE_URL=postgresql+psycopg://kiosk:kiosk@localhost:15432/kiosk_screen`
- `SESSION_SECRET=development-only-session-secret`
- `FRONTEND_ORIGIN=http://localhost:4200`
- `BOOTSTRAP_ADMIN_EMAIL=admin@example.com`
- `BOOTSTRAP_ADMIN_PASSWORD=admin`
- `BOOTSTRAP_ADMIN_DISPLAY_NAME=Administrator`
- `MEDIA_STORAGE_PATH=<repo>/var/media`
- `IMAGE_UPLOAD_MAX_BYTES=26214400`
- `VIDEO_UPLOAD_MAX_BYTES=524288000`

If your shell exports `DATABASE_URL`, make sure it uses port `15432`, or unset it
before starting the backend:

```sh
unset DATABASE_URL
```

Uploaded media is stored on disk. For local development, either use the default
`var/media` directory or set an explicit path before starting the backend:

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

The frontend listens on `http://localhost:4200`. The development server proxies
`/api` requests to `http://localhost:8000`, so keep the backend running while
using the UI.

Default MVP login:

- Email: `admin@example.com`
- Password: `admin`

Open the app at `http://localhost:4200`.

### Admin Workflow

After login, open `/admin`. The administration shell provides persistent
navigation to:

- `/admin/content` for display content and iframe entries
- `/admin/ads` for ad image entries
- `/admin/clients` for client records
- `/admin/domains` for approved iframe domains
- `/admin/configuration` for kiosk timing, animation, inline ads, and enabled
  state
- `/admin/readiness` for the setup check (preflight blockers and warnings)
- `/admin/users` for users, active status, and existing role assignment

Create and edit forms warn before losing unsaved changes. Save and validation
messages are intentionally user-facing and should not expose internal paths,
storage locations, or secrets.

Useful local checks:

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```

Frontend test scripts:

- `npm --prefix frontend run test`: headless, single run. Use for day-to-day
  validation; does not open a browser window.
- `npm --prefix frontend run test:watch`: headed (`Chrome`) with autoWatch.
  Use for TDD; opens a real browser window.
- `npm --prefix frontend run test:ci`: headless, single run, with code
  coverage. Use for pipelines; writes reports to
  `frontend/coverage/kiosk-screen/`.

Note: `pytest backend/tests/integration` must be run from the repository root.
`backend/tests/integration/test_migrations.py` references `backend/alembic/...`
with a path literal, so running it from inside `backend/` raises a
`FileNotFoundError` and reports a false negative.

If `npm --prefix frontend run build` exits non-zero but writes
`frontend/dist/kiosk-screen`, inspect the generated files and keep the terminal
output with the validation record. The application tests and typechecks should
still be run separately.

### PostgreSQL Role Troubleshooting

If Alembic fails with:

```text
FATAL:  no existe el rol "kiosk"
```

the Docker volume was probably initialized before this project defined the
`kiosk` database role. PostgreSQL only applies `POSTGRES_USER`,
`POSTGRES_PASSWORD`, and `POSTGRES_DB` when the data directory is first created.
This can also happen when another local PostgreSQL server is already listening
on `localhost:5432`. The lab compose file exposes PostgreSQL on
`localhost:15432` to avoid that conflict.

For a disposable local lab database, recreate the database volume and port
binding:

```sh
docker compose down -v
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
```

This deletes local PostgreSQL data for this compose project.

To keep the existing volume, create the expected role and database manually from
an existing PostgreSQL superuser. Replace `<existing-superuser>` with a role that
already exists in that volume. A fresh database created by this compose file uses
`kiosk`; older reused volumes may use a different role and may not have a
`postgres` role.

```sh
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "CREATE ROLE kiosk WITH LOGIN PASSWORD 'kiosk';"
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "CREATE DATABASE kiosk_screen OWNER kiosk;"
alembic -c backend/alembic.ini upgrade head
```

If `kiosk_screen` already exists, change its owner instead of creating it:

```sh
docker compose exec postgres psql -U <existing-superuser> -d postgres -c "ALTER DATABASE kiosk_screen OWNER TO kiosk;"
```

### Smoke test: locale switching

The frontend ships two Angular bundles, one per supported locale, served by
nginx under `/es-ES/` and `/en-US/` (see `specs/contracts/i18n-locale/contract.md`
and CHG-022). After rebuilding the Docker image, exercise the switch end to
end:

1. Build and run the image:

   ```sh
   docker build -f frontend/Dockerfile frontend -t kiosk-frontend:dev
   docker run --rm -p 8080:8080 kiosk-frontend:dev
   ```

2. Open `http://localhost:8080/`. nginx returns `302` to `/es-ES/` (or
   `/en-US/` if the browser sends `Accept-Language: en*`). The login screen
   renders in the matching language.

3. Confirm both bundles exist inside the container:

   ```sh
   docker exec <container> sh -c 'ls /usr/share/nginx/html/es-ES /usr/share/nginx/html/en-US'
   # Both directories must contain an index.html.
   ```

4. Inspect the `<base href>` of each bundle:

   ```sh
   docker exec <container> sh -c 'grep "<base" /usr/share/nginx/html/es-ES/index.html'
   docker exec <container> sh -c 'grep "<base" /usr/share/nginx/html/en-US/index.html'
   # Expected: <base href="/es-ES/">  and  <base href="/en-US/">
   ```

5. From the user menu, pick the other locale. The browser navigates to the
   matching prefix (e.g. `/es-ES/hall` → `/en-US/hall`) and the UI strings
   are immediately in the new language. Reload the page and confirm the new
   locale is preserved.

6. Sign in at `/es-ES/admin`, switch to English, and confirm the browser
   lands on `/en-US/admin` without redirecting through `/login`. The auth
   cookie is scoped at path `/` so it is sent on both prefixes.

