# Quickstart: Setup Check Relabel and Wire Empty Rules

**Branch**: `010-admin-cleanup-and-polish` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Local development

The local-dev workflow is unchanged.

```sh
# Backend
pip install -e backend
pytest backend/tests

# Frontend
npm --prefix frontend install
npm --prefix frontend run test
npm --prefix frontend run build

# Run the app
docker compose up --build
# or
cd backend && uvicorn app.main:app --reload
cd frontend && npm start
```

## Automated validation

Run the full test suite before opening a pull request:

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

The new behaviors are covered by:

- `backend/tests/unit/test_readiness.py` — new test cases
  (`test_readiness_reports_unapproved_domain`,
  `test_readiness_ignores_inactive_items`,
  `test_readiness_reports_missing_media`,
  `test_readiness_swallows_filesystem_errors`).
- `backend/tests/unit/test_admin_readiness_services.py` — new test
  cases (`test_readiness_service_reports_unapproved_iframe`,
  `test_readiness_service_reports_missing_media`).
- `backend/tests/integration/test_admin_readiness_api.py` — new test
  cases (`test_get_readiness_includes_unapproved_domain_blocker`,
  `test_get_readiness_includes_missing_media_warning`).
- `frontend/src/app/features/readiness/readiness.component.spec.ts`
  — updated to assert the new page-header title and description copy.
- `frontend/src/app/features/admin-shell/admin-shell.component.spec.ts`
  — updated to assert the sidenav nav item is labeled "Setup check".
- `frontend/src/app/features/dashboard/dashboard.component.spec.ts`
  — updated to assert the dashboard button is labeled "Run setup
  check" and the alerts section is titled "Setup check".

## Manual smoke flow

Run this flow against a fresh database to validate the relabel and
the two new rules end-to-end.

### Step 1 — Relabel verification

1. Sign in as `admin@example.com` / `admin` at `/login`.
2. Confirm the redirect to `/hall`.
3. From the hall, click the "Open administration" tile.
4. In the admin sidenav, confirm the eighth item is labeled "Setup
   check" (not "Readiness").
5. Click the "Setup check" item. The page title should be "Setup
   check" with the description "Verify all kiosk setup is complete
   before opening the display for an event."
6. Navigate back to the dashboard. Confirm the button next to the
   setup-status pill is labeled "Run setup check" (not "Review
   readiness"). Click it and confirm it deep-links to the setup check
   page.
7. Navigate to "Display configuration". Toggle the kiosk off. Confirm
   the hint reads "When disabled, the kiosk will not run and the
   setup check will report a blocker." (not "readiness will block
   setup").
8. Toggle the kiosk back on.

### Step 2 — Unapproved-embedded-domain rule

1. Navigate to "Iframe domains" (`/admin/domains`). Confirm one
   approved domain exists (the bootstrap data seeds
   `dashboard.example.com`).
2. Navigate to "Content" (`/admin/content`). Create a new iframe
   content item with:
   - Title: `Unapproved iframe`
   - Source URL: `https://unapproved.example.org/dashboard`
   - Approved domain: leave blank (or pick the existing one and
     override the URL to a non-approved host).
   - Active: yes.
3. Navigate to "Setup check" (`/admin/readiness`). The page should
   show a blocker of the form
   `Embedded domain is not approved: unapproved.example.org`. Click
   the "Resolve" button and confirm the deep-link lands on the
   "Iframe domains" section.
4. Return to "Content" and deactivate the unapproved iframe item.
5. Refresh the setup check page. The blocker should no longer
   appear.

### Step 3 — Missing-media rule

1. Navigate to "Content". Confirm at least one active image or
   video item exists (the bootstrap data seeds one).
2. Find the underlying file on disk. The path is
   `<MEDIA_STORAGE_PATH>/<organization_id>/<media_id>-<uuid>.<ext>`.
   The default `MEDIA_STORAGE_PATH` is `var/media`. Resolve the
   relative path stored in the `media_file_references.storage_path`
   column of the corresponding row.
3. Move the file aside (do not delete the row):
   ```sh
   mv var/media/<org_id>/<media_id>-<uuid>.<ext> /tmp/missing-file
   ```
4. Refresh the setup check page. The page should show a warning of
   the form `Source may be unavailable: <title>` for the affected
   item. The dashboard's alerts section should show the same
   warning.
5. Move the file back:
   ```sh
   mv /tmp/missing-file var/media/<org_id>/<media_id>-<uuid>.<ext>
   ```
6. Refresh the setup check page. The warning should no longer
   appear.

### Step 4 — Filesystem-error graceful degradation (optional)

1. Change the permissions on a single media file to make it
   unreadable:
   ```sh
   chmod 000 var/media/<org_id>/<media_id>-<uuid>.<ext>
   ```
2. Refresh the setup check page. The page should show a warning of
   the form `Source for "<title>" could not be verified.` (not a
   page crash). The other readiness rules (configuration, event
   duration, ≥1 content, ≥1 ad) should still be evaluated and
   shown.
3. Restore the permissions:
   ```sh
   chmod 644 var/media/<org_id>/<media_id>-<uuid>.<ext>
   ```

## Manual smoke acceptance

The spec is considered implemented only when:

- [x] Every item in Step 1 passes.
- [x] Every item in Step 2 passes.
- [x] Every item in Step 3 passes.
- [x] Every item in Step 4 passes.
- [x] `pytest backend/tests` passes.
- [x] `npm --prefix frontend run test` passes.
- [x] `npm --prefix frontend run build` passes.
