# Quickstart: Display Responsive Runtime

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

This feature is a presentation-only refactor of the kiosk display
component. There is no new build, run, or deploy step. Use this
quickstart to validate the change locally.

## Prerequisites

- Python 3.12 and the backend lab database (per `AGENTS.md`).
- Node.js 22.14.0 (use `nvm use` from the repository root).
- Angular CLI compatible with the selected Node version.

## Local validation

1. Start the backend (per `AGENTS.md`):

   ```sh
   docker compose up -d postgres
   cd backend && pip install -e ".[dev]" && cd ..
   alembic -c backend/alembic.ini upgrade head
   uvicorn app.main:app --reload --app-dir backend
   ```

2. Start the frontend:

   ```sh
   cd frontend
   npm install
   npm start
   ```

3. Open the kiosk at `http://localhost:4200/display` (after
   `/display/open`) and verify:

   - At 1920×1080, the top region is 900 px tall and the ad band
     is 180 px tall (5:1 ratio).
   - Resize to 1280×720, 2560×1440, and 3840×2160; the ratio is
     preserved.
   - Rotate the device to portrait (Chrome DevTools → Device
     toolbar → portrait); the regions disappear and the prompt
     "Por favor, rota el dispositivo" appears.
   - Rotate back to landscape; the regions return within one
     polling cadence.

4. Run the frontend test suite:

   ```sh
   npm --prefix frontend run test
   ```

   The new specs assert SC-001..SC-005.

5. Run the production build to make sure the CSS is valid:

   ```sh
   npm --prefix frontend run build
   ```

## Headless validation script

```sh
npm --prefix frontend run test
npm --prefix frontend run build
```

Both must exit zero for the change to be considered valid.

## Rollback

The change touches only `frontend/src/app/display/`. To roll back:

```sh
git revert <commit-sha>
npm --prefix frontend run build
```

No database migration is involved.