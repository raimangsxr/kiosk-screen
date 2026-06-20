# Quickstart: Pre-configured Iframes and Video Plays To End

**Date**: 2026-06-20
**Spec**: [spec.md](./spec.md)

This quickstart walks through the local-dev lifecycle of the feature: applying the migration, creating an iframe from the admin site, pinning it to the kiosk from the remote control, returning to Content rotation, and verifying the video play-to-end behaviour.

## Prerequisites

- Python 3.12
- Node.js 22.x (per `.nvmrc`)
- Docker or OrbStack with the local PostgreSQL container (`docker compose up -d postgres`)
- Alembic migrations applied (`alembic -c backend/alembic.ini upgrade head`)
- Backend running (`uvicorn app.main:app --reload --app-dir backend`)
- Frontend running (`npm --prefix frontend start`)

## Step 1: Sign in as the bootstrap admin

Open `http://localhost:4200`, log in with the default admin credentials (`admin@example.com` / `admin`).

## Step 2: Open the new Iframes section

Navigate to `/admin/iframes`. The list is empty.

## Step 3: Create an iframe

1. Click "New iframe".
2. Enter URL: `https://example.com/stream-a`.
3. Click "Save".
4. The iframe appears in the list at `/admin/iframes`.

## Step 4: Create a second iframe (optional)

1. Click "New iframe" again.
2. Enter URL: `https://example.com/stream-b`.
3. Click "Save".
4. The list now has two iframes.

## Step 5: Verify duplicate-URL rejection

1. Click "New iframe" again.
2. Enter URL: `https://example.com/stream-a` (the same as Step 3).
3. Click "Save".
4. The form rejects the submission with a clear "URL already exists" error.

## Step 6: Open the kiosk

In another browser tab, navigate to `http://localhost:4200/display`. The kiosk opens, opens a display session, and starts cycling through `topContent` (photos and videos only; no iframes in the rotation).

## Step 7: Pin an iframe to the kiosk

1. In the original admin tab, navigate to `/admin/remote-control`.
2. The "Rotation" radio is selected by default.
3. Click the "Iframe" radio. The list of pre-configured iframes appears.
4. Click the radio button next to `https://example.com/stream-a`.
5. Wait at most `configuration.remoteControlPollingSeconds` (default 3) seconds.
6. The kiosk top zone switches to the iframe and stays there.

## Step 8: Switch the iframe

1. On `/admin/remote-control`, click the radio button next to `https://example.com/stream-b`.
2. Within the polling interval, the kiosk top zone switches to the new iframe.

## Step 9: Return to Content rotation

1. On `/admin/remote-control`, click the "Rotation" radio.
2. Within the polling interval, the kiosk top zone returns to Content rotation.
3. The rotation resumes at the same item that was on screen at the moment of the switch, with a fresh `effectiveDurationSeconds` timer (per US-5 acceptance scenario 1).

## Step 10: Delete the active iframe from the admin

1. On `/admin/iframes`, click "Delete" on one of the iframes (any).
2. Within the polling interval, the kiosk top zone returns to Content rotation if that iframe was the active one; otherwise, nothing changes.
3. The audit log records a `remote_control_iframe_deleted` event for the affected kiosk (per FR-007, SC-007).

## Step 11: Verify video play-to-end

1. Add a 30-second video to `topContent` (either via the admin upload form at `/admin/content/new` or by directly inserting a row in `top_content_items` for testing).
2. The video enters the rotation. When it appears:
   - The video auto-plays muted.
   - The video does not loop.
   - The kiosk does not advance until the video reaches its natural end.
   - The kiosk waits `configuration.videoEndDelaySeconds` (default 2) seconds after the end, then advances.

## Step 12: Configure the video end delay

1. On `/admin/display-config`, find the new "Video end delay (s)" field.
2. Change it to 10.
3. Click "Save".
4. Within the polling interval, the kiosk's next video waits 10 seconds after `ended` before advancing.
5. Out-of-range values (e.g., `-1`, `31`) are rejected with HTTP 400 and a clear validation error.

## Verifying Cursor Preservation

To verify that the kiosk resumes the rotation on the same item after an iframe toggle:

1. Add three photos with `durationSeconds=10` each.
2. Wait for the kiosk to show the second photo.
3. Note the photo's identity (title or visible content).
4. Switch to iframe mode on `/admin/remote-control` for at least 30 seconds.
5. Switch back to "Rotation".
6. The kiosk must show the second photo again, and play it for 10 full seconds before advancing to the third photo.

## Verifying Approval Removal

To verify that the iframe domain-approval system is gone:

1. Search the codebase for `ApprovedEmbeddedDomain`, `approved_embedded_domains`, `/api/approved-domains`, `/admin/domains`. The search must return zero hits.
2. Try to navigate to `/admin/domains` in the running app. The page must not exist.
3. Try to POST to `/api/approved-domains`. The route must return 404.

## Verifying the `embedded_web` Rejection

To verify that the Content section no longer accepts `embedded_web`:

1. On `/admin/content/new`, open the "Type" dropdown. Only "Photo" and "Video" appear.
2. From a terminal, attempt:
   ```sh
   curl -X POST http://localhost:8000/api/content \
     -H "Cookie: kiosk_session=<admin session cookie>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Legacy iframe","contentType":"embedded_web","sourceReference":"https://example.com","isActive":true}'
   ```
3. The request is rejected with HTTP 400 and an `invalid_content_type` error.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| The new `/admin/iframes` route 404s | The frontend bundle was not rebuilt after the new feature | Re-run `npm --prefix frontend start`. |
| The migration fails on `DROP TABLE approved_embedded_domains` | A foreign key in another table (e.g., a leftover reference) still points to the table | Inspect the schema; the migration's `CASCADE` should drop dependent objects. |
| Videos still advance on a fixed timer | The `display-screen.component` template still has `loop` on the `<video>` element, or the `(ended)` handler is missing | Re-check the template; the contract in [kiosk-render-contract.md](./contracts/kiosk-render-contract.md) specifies the binding. |
| The kiosk does not pick up the new `videoEndDelaySeconds` | The fingerprint equality in `DisplayApiService.watchState` was not extended | Re-check the equality function; it must include `configuration.videoEndDelaySeconds`. |
| Deleting an iframe does not return the kiosk to Content rotation | The `IframeService.delete` cleanup did not run, or the `DisplayControlState` row was not updated | Inspect the audit log for `remote_control_iframe_deleted`; the service-level cleanup must run inside the same transaction as the delete. |
