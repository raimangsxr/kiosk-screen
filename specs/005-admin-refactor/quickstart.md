# Quickstart: Administration Refactor Validation

## Local Lab Startup

Use the existing local lab setup from `README.md`:

```sh
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

In another terminal:

```sh
cd frontend
npm start
```

Open `http://localhost:4200` and sign in with the configured local admin account.

## Refactor Smoke Flow

1. Sign in and confirm the app opens the hall.
2. From the hall, enter administration.
3. Confirm administration navigation reaches dashboard, content, ads, clients, approved domains, display configuration, readiness, and users.
4. From administration, use the visible kiosk action to enter kiosk mode.
5. Press Escape in kiosk mode and confirm the app returns to the hall.
6. Re-enter administration and complete one create/edit workflow for:
   - content
   - ad
   - client
   - approved domain
   - display configuration
   - user and role assignment
7. Confirm validation errors are clear and safe.
8. Confirm delete/deactivate dependency conflicts are clear and safe.
9. Confirm readiness directs the administrator to resolving sections.
10. Confirm administration remains readable and keyboard usable at 1024x768 and 1440x900.

## Migration Validation

If the implementation includes persisted data redesign:

1. Start with representative existing data.
2. Apply migrations.
3. Confirm content, ads, clients, domains, users, roles, display configuration, media references, and operational records remain usable.
4. Confirm kiosk mode still rotates migrated content and ads using effective settings.
5. Record migration validation results.

If no persisted data redesign is implemented, record that no structural data migration was required and run compatibility validation against existing data.

## Expected Validation Commands

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build -- --progress=false
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```

Frontend test scripts (all run against `frontend/karma.conf.js`):

- `npm --prefix frontend run test`: headless (`ChromeHeadlessNoSandbox`),
  single run. Default local validation command.
- `npm --prefix frontend run test:watch`: headed `Chrome` with autoWatch for
  TDD.
- `npm --prefix frontend run test:ci`: headless + code coverage, suitable for
  pipelines. Reports land in `frontend/coverage/kiosk-screen/`.

Note: `pytest backend/tests/integration` must be run from the repository root.
`backend/tests/integration/test_migrations.py` references `backend/alembic/...`
with a path literal, so running it from inside `backend/` raises a
`FileNotFoundError` and reports a false negative. The unit, contract, and
migration suites do not have this constraint and can be run from `backend/`
because they are added to `pythonpath` by `pyproject.toml`.

## Final Acceptance Gate

The refactor is not complete until these are recorded as passed or explicitly approved as exceptions:

- backend tests
- frontend tests
- frontend build
- backend and frontend image builds
- migration or compatibility validation
- hall/admin/kiosk smoke validation
- kiosk rotation regression
- Escape-to-hall regression
- accessibility checks at 1024x768 and 1440x900
- safe user-facing error validation
