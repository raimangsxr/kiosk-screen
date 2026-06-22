# Quickstart: Public Content API

**Date**: 2026-06-18
**Spec**: [spec.md](./spec.md)

This quickstart walks through the local-dev lifecycle of the feature: starting the stack, creating an API key, uploading a file via the public endpoint, and seeing the new item appear in the running kiosk.

## Prerequisites

- Python 3.12
- Node.js 22.x (per `.nvmrc`)
- Docker or OrbStack with the local PostgreSQL container (`docker compose up -d postgres`)
- Alembic migrations applied (`alembic -c backend/alembic.ini upgrade head`)
- Backend running (`uvicorn app.main:app --reload --app-dir backend`)
- Frontend running (`npm --prefix frontend start`)

## Step 1: Sign in as the bootstrap admin

Open `http://localhost:4200`, log in with the default admin credentials (`admin@example.com` / `admin`).

## Step 2: Open the API keys section

Navigate to `/admin/api-keys`. The list is empty.

## Step 3: Create a key

1. Click "Create key".
2. Enter label: "My first integration".
3. Click "Create".
4. The reveal panel shows the raw key (e.g., `ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX`).
5. Click "Copy", then "Done". The key appears in the list with the prefix `ksk_live_AbCdEfGh…`.

> **Note**: the raw key is shown ONLY in this reveal panel. If you lose it, the only recovery is to rotate.

## Step 4: Upload a file via the public endpoint

From a terminal:

```sh
curl -X POST http://localhost:8000/api/public/content/upload \
  -H "Authorization: Bearer ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX" \
  -F "file=@/path/to/photo.jpg" \
  -F "title=Test upload"
```

Expected response (201):

```json
{
  "id": "9c3e...",
  "title": "Test upload",
  "contentType": "photo",
  "sourceReference": "/api/media/...",
  "mediaFile": { ... },
  "isActive": true,
  "displayOrder": 5,
  "createdAt": "2026-06-18T...",
  "updatedAt": "2026-06-18T..."
}
```

The `displayOrder` is `max(existing) + 1` for the organization.

## Step 5: See the new item in the kiosk

1. Open `http://localhost:4200/hall`.
2. Click "Open kiosk mode" (or whatever the hall entry is in the current build).
3. The kiosk loads `topContent` from the server. The new item is in the list at the end.
4. Wait for the next transition. The new item appears.

If the kiosk is **already open** in another tab when the upload completes, the next poll (≤5s) or pre-transition poll (1s before next transition) detects the new item and shows it at the next transition, ahead of the remaining base rotation items.

## Step 6: Rotate the key

1. In the API keys list, click "Rotate" on the row.
2. Confirm in the dialog.
3. The reveal panel shows the new raw key. Copy it.
4. Click "Done".
5. Test the rotation: the previous raw key now returns 401 `invalid_api_key` on the public endpoint. The new raw key works.

## Step 7: Revoke the key

1. Click "Revoke" on the row.
2. Confirm in the dialog.
3. The row now shows "Revoked" and the revoked timestamp.
4. Any further upload with this raw key returns 403 `inactive_api_key`.

## Verifying Concurrency

To verify the advisory lock prevents ordering races:

```sh
for i in $(seq 1 20); do
  curl -s -X POST http://localhost:8000/api/public/content/upload \
    -H "Authorization: Bearer ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX" \
    -F "file=@/path/to/photo_$i.jpg" \
    -F "title=Burst upload $i" &
done
wait
```

Then check the database:

```sh
docker compose exec postgres psql -U kiosk -d kiosk_screen \
  -c "SELECT title, display_order FROM top_content_items ORDER BY display_order DESC LIMIT 20;"
```

The `display_order` values should form a single contiguous descending sequence with no gaps or duplicates, even though the 20 requests were fired in parallel.

## Verifying Live Update

1. Open kiosk mode in a browser tab.
2. From a terminal, upload a file (Step 4).
3. Within at most 6 seconds, the new item appears on the kiosk screen, even though no manual refresh was performed.

## Verifying Audit Events

After any of the steps above, the audit events can be inspected in the database:

```sh
docker compose exec postgres psql -U kiosk -d kiosk_screen \
  -c "SELECT event_type, entity_type, event_metadata, created_at FROM display_events ORDER BY created_at DESC LIMIT 10;"
```

Public uploads produce `event_type='content_changed'` with `event_metadata->>'source' = 'public_api'`. Admin actions on keys produce `event_type='api_key_changed'` with `event_metadata->>'action'` being `create`, `rotate`, or `revoke`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 `invalid_api_key` immediately after creation | The raw key was not copied correctly (extra space, truncated). | Re-copy from the reveal panel if still in memory; otherwise rotate to get a new value. |
| 413 `media_too_large` | The file exceeds the configured `IMAGE_UPLOAD_MAX_BYTES` (default 25 MB) or `VIDEO_UPLOAD_MAX_BYTES` (default 500 MB). | Reduce the file size or adjust the env var. |
| 415 `unsupported_media_type` | The MIME type is not in the supported set (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/ogg`). | Convert the file to a supported format. |
| 403 `inactive_api_key` | The key has been revoked. | Create a new key. |
| Upload succeeds but item doesn't appear on the kiosk | The kiosk is in fallback mode (no eligible items, configuration disabled, or event expired). | Check the readiness section of the admin. |
| CORS error from a browser | `PUBLIC_API_CORS_ORIGINS` is not configured. | Set the env var to the allowed origin(s) and restart the backend. |
