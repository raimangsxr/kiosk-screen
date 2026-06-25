# Quickstart: Kiosk Region Ratio Configurability

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

This change makes the kiosk region ratio configurable from the admin form. It is a backend amendment (one migration) plus a form binding (two new inputs). Use this quickstart to validate the change locally.

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

   The new migration `0015_relax_kiosk_region_ratio` applies automatically. Existing rows in `kiosk_display_configurations` are backfilled from `4` to `5`.

2. Start the frontend:

   ```sh
   cd frontend
   npm install
   npm start
   ```

3. Open the admin form at `http://localhost:4200/admin/configuration`. Verify:

   - The form shows two new inputs under "Region ratio": **Top region units** and **Bottom region units**.
   - Both inputs accept integers between `1` and `20`.
   - Saving with `Top region units = 3, Bottom region units = 1` returns a success snackbar.

4. Open the kiosk at `http://localhost:4200/display` (after `/display/open`) and verify:

   - At 1920×1080 with the saved `3/1` ratio, the top region is 810 px tall and the ad band is 270 px tall.
   - Open `/admin/configuration`, change the ratios to `7/3`, save, and re-poll: the top region is now 7/10 and the ad band is 3/10.

5. Run the backend test suite:

   ```sh
   pytest backend/tests/unit backend/tests/integration backend/tests/contract
   ```

   The new specs cover SC-001 (PUT 3/1), SC-002 (PUT 0), SC-003 (migration), and the updated defaults.

6. Run the frontend test suite:

   ```sh
   npm --prefix frontend run test
   ```

   The display-config spec covers the new form binding.

7. Run the production build to confirm the TypeScript types compile:

   ```sh
   npm --prefix frontend run build
   ```

## Out-of-range validation

- `PUT /api/display/configuration` with `topRegionRatio=0` returns `400` with `code="validation_error"`.
- `PUT /api/display/configuration` with `topRegionRatio=21` returns `400`.
- The form rejects these values client-side via `Validators.min(1)` / `Validators.max(20)` before the PUT is issued.

## Headless validation script

```sh
pytest backend/tests/unit backend/tests/integration backend/tests/contract
npm --prefix frontend run test
npm --prefix frontend run build
```

All three must exit zero for the change to be considered valid.

## Rollback

The change touches one migration, one model, one schema, one service method, one bootstrap line, one TS interface, and one form component. To roll back:

```sh
alembic -c backend/alembic.ini downgrade -1
git revert <commit-sha>
npm --prefix frontend run build
```

The downgrade restores the exact-value CHECK constraints and `top_region_ratio=4` for any row that has not been manually changed since the migration.
