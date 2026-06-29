# Quickstart: Event Branding Layout

**Date**: 2026-06-28
**Spec**: [spec.md](./spec.md)

This change extends the Event administration panel and the
kiosko branding overlay with ten new layout controls. It
requires an Alembic migration and updates the form, the
backend schema, the service, and the overlay CSS. Use this
quickstart to validate the change locally.

## Prerequisites

- Python 3.12 and the backend lab database (per `AGENTS.md`).
- Node.js 22.14.0 (use `nvm use` from the repository root).
- Angular CLI compatible with the selected Node version.
- The CHG-019 changes already landed (CHG-023 depends on
  CHG-019's overlay CSS work).

## Local validation

1. Apply the database migration:

   ```sh
   docker compose up -d postgres
   cd backend && pip install -e ".[dev]" && cd ..
   alembic -c backend/alembic.ini upgrade head
   ```

   Verify the new columns exist:

   ```sh
   docker exec -it <postgres> psql -U kiosk -d kiosk_screen \
     -c "\d event_configurations" | grep layout
   ```

   Expect two columns: `logo_layout` and `event_name_layout`,
   both nullable.

2. Start the backend:

   ```sh
   uvicorn app.main:app --reload --app-dir backend
   ```

3. Start the frontend:

   ```sh
   cd frontend
   npm install
   npm start
   ```

4. Open the Event configuration form at
   `http://localhost:4200/es-ES/admin/content` (or whatever the
   current locale prefix is) and verify:

   - Ten new layout controls are visible under the Organizer
     logo section and the Event name section.
   - The fields are pre-populated with the visual defaults
     (logo: size=6, x=0, y=0, transparency=100, borderRadius=0;
     event name: size=1.6, x=80, y=0, transparency=100,
     borderRadius=6) when the API returns NULL layout.
   - Setting `logoSize=0` or `eventNameTransparency=150`
     triggers a client-side validation error and the PUT is
     blocked.
   - Saving valid values produces a success snackbar; opening
     the form again shows the saved values.

5. Open the kiosko at `http://localhost:4200/es-ES/display` in
   a separate browser window (after `/display/open`) and
   verify:

   - The overlay renders with the saved layout within at most
     `remoteControlPollingSeconds` seconds (default 3 s).
   - Resize the browser to 1280×720, 1920×1080, and
     3840×2160; the layout values scale with the viewport
     because they are interpreted as vh / vw.
   - Rotate to portrait (Chrome DevTools → Device toolbar →
     portrait); the overlay is hidden (current behavior).
   - Return to landscape; the layout is unchanged.

6. Verify the default-look preservation regression: clear the
   layout columns in the database:

   ```sh
   docker exec -it <postgres> psql -U kiosk -d kiosk_screen \
     -c "UPDATE event_configurations SET logo_layout = NULL, event_name_layout = NULL"
   ```

   Reload the kiosko and verify the visual rendering matches
   the pre-change baseline byte-for-byte (modulo animations).

7. Verify the HTTP 400 validation:

   ```sh
   curl -X PUT http://localhost:8000/api/event-configuration \
     -H "Cookie: <session>" \
     -F 'eventName=test' \
     -F 'organizerName=org' \
     -F 'eventDurationMinutes=240' \
     -F 'logoLayout={"size": 999}'
   ```

   Expect HTTP 422 with Pydantic's validation error envelope
   that mentions `logoLayout.size` and the range `[1, 50]`.

## Headless validation

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```

All four must exit zero for the change to be considered valid.

## Rollback

The change touches the backend, the frontend, and the
database. To roll back:

```sh
alembic -c backend/alembic.ini downgrade -1
git revert <commit-sha>
docker compose up -d --build
```

The Alembic downgrade drops the two new columns; any layout
values already saved are lost.
