# Kiosk Screen Backend

FastAPI backend for kiosk display APIs, authentication, persistence, and operational events.

## Local PostgreSQL

Start the development database from the repository root:

```sh
docker compose up -d postgres
```

Default local settings:

- Database: `kiosk_screen`
- User: `kiosk`
- Password: `kiosk`
- Host port: `5432`

Set `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_DISPLAY_NAME` before running the backend.

## Development

```sh
pip install -e ".[dev]"
uvicorn app.main:app --reload --app-dir backend
```

## Tests

```sh
pytest backend/tests
```

## Migrations

```sh
alembic -c backend/alembic.ini upgrade head
```

