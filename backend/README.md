# Kiosk Screen Backend

FastAPI backend for kiosk display APIs, authentication, persistence, and operational events.

## Local PostgreSQL

Start the development database from the repository root:

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

Default local settings:

- Database: `kiosk_screen`
- User: `kiosk`
- Password: `kiosk`
- Host port: `15432`

The default local `DATABASE_URL` is:

```text
postgresql+psycopg://kiosk:kiosk@localhost:15432/kiosk_screen
```

If your shell exports another `DATABASE_URL`, update it to port `15432` or unset
it before running the backend.

## Media Storage

Uploaded images and videos are stored on disk and referenced from PostgreSQL.
For local development, create a writable media directory before starting the
backend:

```sh
mkdir -p var/media
export MEDIA_STORAGE_PATH="$(pwd)/var/media"
```

Related settings:

- `MEDIA_STORAGE_PATH`: directory where uploaded files are written.
- `IMAGE_UPLOAD_MAX_BYTES`: default `26214400`.
- `VIDEO_UPLOAD_MAX_BYTES`: default `524288000`.
- `ROTATION_ANIMATIONS`: default `none,fade,slide`.

Apply Alembic migrations before using media upload APIs so database references
and rotation columns exist:

```sh
alembic -c backend/alembic.ini upgrade head
```

## Development

Run from the repository root:

```sh
cd backend
pip install -e ".[dev]"
cd ..
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

OpenAPI can be exported with:

```sh
cd backend
kiosk-openapi
```

## Tests

```sh
pytest backend/tests
```

## Migrations

```sh
alembic -c backend/alembic.ini upgrade head
```
