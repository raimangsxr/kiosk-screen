# Quickstart: Administration Site Completion

## Local Startup

Use the existing local lab setup:

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

Open `http://localhost:4200` and log in as:

- Email: `admin@example.com`
- Password: `admin`

## Validation Flow

1. Open the administration site after login.
2. Confirm the dashboard shows setup status, quick actions, and persistent navigation.
3. Confirm these sections are reachable without typing URLs:
   - Content
   - Ads
   - Clients
   - Iframe/domain management
   - Display configuration
   - Readiness
   - Users and roles
4. Create or edit:
   - One uploaded image content item
   - One uploaded video content item
   - One iframe content item
   - One client
   - One uploaded image ad
   - Display rotation/default configuration
5. Confirm lists show useful status, type, order, and media/source information.
6. Open a create/edit form, change a value, then attempt to leave. Confirm the warning allows stay or discard.
7. Trigger at least one validation error and confirm the message is understandable and non-sensitive.
8. Open readiness and confirm blockers/warnings point to the section needed to resolve them.
9. Create or edit a user in Users and roles, assign one of the existing roles, and confirm the row shows active status and assigned roles.
10. Confirm save and validation feedback remains visible long enough to read, with a target of at least 5 seconds for manual review.
11. Repeat the dashboard and one editable form at 1024x768 and 1440x900 viewport sizes. Confirm navigation, labels, actions, and status messages remain readable without overlapping.

Expected outcomes:

- SC-001 through SC-003: The administrator can reach every admin section from `/admin` navigation without manual URL entry.
- SC-004 through SC-005: Content, iframe content, clients, ads, approved domains, users, and display configuration can be created or changed from visible controls.
- SC-006: Readiness states identify blockers or warnings and point to the relevant admin section.
- SC-007: Validation, save, authorization, upload, and storage failures use readable messages without internal paths or secrets.
- SC-008: Administration screens remain usable at 1024x768 and 1440x900.

## Expected Validation Commands

```sh
pytest backend/tests
npm --prefix frontend run test -- --watch=false
cd frontend && npm run build -- --progress=false
```

Build validation note: if the Angular build command exits non-zero while still
writing `frontend/dist/kiosk-screen`, keep the generated output for inspection
and capture the terminal output as an unresolved build-tooling gap before
release.
