# Quickstart: Event Branding and Ads Section Title (spec 017)

**Branch**: `017-event-branding` | **Date**: 2026-06-20

A short, runnable recipe for an operator to verify spec 017 end-to-end on a freshly bootstrapped environment.

## Prerequisites

- The kiosk-screen stack runs locally (`./scripts/dev.sh` or `docker compose up backend frontend postgres`).
- At least one admin user exists (the default `admin@example.com` / `admin` from `bootstrap_service.ensure_mvp_bootstrap_data`).
- At least one organisation with a `kiosk_display_configurations` row (so the migration backfill is exercised).

## 1. Run the migration

```sh
cd backend
alembic upgrade head
```

Expected output:
- A new table `event_configurations` is created.
- One `event_configurations` row per existing organisation is created (idempotent on rerun per FR-011a).
- The column `kiosk_display_configurations.configured_event_duration_minutes` is dropped.
- The constraint `ck_kiosk_event_duration_positive` is removed.

Sanity check:
```sh
psql $DATABASE_URL -c '\d event_configurations'
psql $DATABASE_URL -c 'SELECT organization_id, event_duration_minutes FROM event_configurations;'
```

## 2. Configure branding from the admin UI

1. Sign in as `admin@example.com` / `admin`.
2. Navigate to `/admin/event`.
3. Fill in:
   - Organizer name: `ACME Events`
   - Event name: `Spring Summit 2026`
   - Event duration: `180` (minutes)
4. Upload a 200 KB PNG logo.
5. Click **Save**.

Expected:
- Snackbar: "Event configuration saved."
- The `/admin/event` form re-renders with the same values (persisted).
- The audit events listing shows one `event_configuration_changed` event with `changedFields=["eventName","organizerName","organizerLogoMediaId","eventDurationMinutes"]`.

## 3. Verify the kiosk renders the overlay and the ads label

1. Open `http://localhost:4200/display` in a separate browser (or device).
2. Expected:
   - Top-left of the top region: a small badge with the organizer logo, "ACME Events", separator dot, and "Spring Summit 2026".
   - Bottom ads region (if ads are configured): the label "Patrocinadores del evento" on the left edge of the gold band.
3. Confirm no error chrome is shown and the kiosk display state (content rotation / iframe mode) works as before.

## 4. Edit and remove the logo

1. Go back to `/admin/event`.
2. Replace the logo with a JPG.
3. Save. Verify the kiosk overlay updates within one polling interval (default 3s) with the new image.
4. Tick **Remove logo** (or whatever control the form surfaces for that) and Save.
5. Verify the overlay on the kiosk shows only the text fields (no image) and the underlying media file is removed from disk:

```sh
ls $(grep MEDIA_STORAGE_PATH backend/.env | cut -d= -f2)/<organization_id>/
```

The previous logo file should be gone (or the file size has not increased, if it was already referenced by another row).

## 5. Confirm the public endpoint

```sh
curl -i http://localhost:8000/api/event-branding | jq
```

Expected (200):
```json
{
  "eventName": "Spring Summit 2026",
  "organizerName": "ACME Events",
  "organizerLogoUrl": "/api/media/<uuid>"
}
```

## 6. Edge case smoke tests

- **Empty values**: clear all fields and save. Verify the overlay disappears from the DOM (`document.querySelector('.branding-overlay')` returns `null`).
- **Large file**: upload a 2 MB PNG. The form must reject it before reaching the server, with the message "Logo too large (max 1 MB)." The previously saved logo must remain intact.
- **Wrong type**: upload a `.bmp` file. Rejected with "Unsupported file type. Allowed: PNG, JPG, WebP, SVG."
- **Ambiguous PUT**: not directly user-reproducible from the UI (the form only sends one of `file` or `removeLogo`). Verified by an integration test that posts both and asserts HTTP 400.
- **Branding endpoint down**: stop the backend, refresh the kiosk. The kiosk keeps showing the last good overlay and does not show an error chrome. Restart the backend; the kiosk overlay updates with new values within one poll.

## 7. Migration downgrade (manual, informational only)

```sh
alembic downgrade -1
```

Expected:
- The `event_configurations` table is dropped.
- The `kiosk_display_configurations.configured_event_duration_minutes` column is restored (with default 240 — no data is migrated back; this is by design per spec §Assumption "one-way migration").
- Any subsequent `POST /api/display/open` will fail until the migration is re-applied and an event configuration row exists.
