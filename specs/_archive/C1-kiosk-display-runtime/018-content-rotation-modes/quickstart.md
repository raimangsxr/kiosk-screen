# Quickstart: Content Rotation Modes

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

End-to-end manual smoke for spec 018. Use after `alembic upgrade head`, `npm --prefix frontend run build`, and `pytest backend/tests -q` have passed. All commands assume the local docker-compose stack is up.

## 0. Prerequisites

```bash
# From repo root
docker compose up -d backend frontend db
docker compose exec backend alembic upgrade head   # applies 0012_content_rotation_modes.py
docker compose exec backend pytest backend/tests -q
npm --prefix frontend run test                     # headless Karma
npm --prefix frontend run build
```

Expected: zero test failures; build succeeds; migration logs `0012_content_rotation_modes ... OK`.

## 1. Sign in as administrator

1. Open `http://localhost:8080/admin/login`.
2. Sign in with the seeded `administrator` user (per `bootstrap_service`).
3. Confirm the dashboard loads and shows the new "Event" card (017) and the existing "Display", "Ads", "Content", "Iframes" cards.

## 2. Verify Content upload — photo by extension (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sample.jpg" \
  -F "displayOrder=10"
```

Expected: HTTP 200; response includes `"contentType": "photo"`, `"isFixed": false`, `"recurringEveryXIterations": null`.

## 3. Verify Content upload — video by extension (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sample.mp4" \
  -F "displayOrder=11"
```

Expected: HTTP 200; `"contentType": "video"`.

## 4. Verify Content upload — extension overrides explicit `contentType` (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sample.mp4" \
  -F "contentType=photo" \
  -F "displayOrder=12"
```

Expected: HTTP 200; `"contentType": "video"` (extension won). Audit event `content_type_autodetected` is emitted; visible in `/admin/events`.

## 5. Verify Content upload — unsupported extension (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sample.xyz"
```

Expected: HTTP 415 with `code: "unsupported_extension"`.

## 6. Verify recurring content (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/info.jpg" \
  -F "recurringEveryXIterations=3"
```

Expected: HTTP 200; `"isFixed": false`, `"recurringEveryXIterations": 3`.

## 7. Verify fixed content (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sponsor.jpg" \
  -F "isFixed=true"
```

Expected: HTTP 200; `"isFixed": true`, `"recurringEveryXIterations": null`.

## 8. Verify exclusivity (admin)

```bash
curl -X POST http://localhost:8080/api/content/upload \
  -H "Cookie: session=..." \
  -F "file=@/tmp/sample.jpg" \
  -F "isFixed=true" \
  -F "recurringEveryXIterations=3"
```

Expected: HTTP 400 with `code: "mutually_exclusive_flags"`.

## 9. Verify public upload ignores fixed / recurring (public API)

```bash
curl -X POST http://localhost:8080/api/public/content/upload \
  -H "Authorization: Bearer <api-key>" \
  -F "file=@/tmp/from_integration.mp4" \
  -F "isFixed=true" \
  -F "recurringEveryXIterations=3"
```

Expected: HTTP 200; `"isFixed": false`, `"recurringEveryXIterations": null` (silently ignored).

## 10. Open the kiosk display

1. Open `http://localhost:8080/display` in Chrome AND Firefox (two tabs).
2. Confirm the ad-region is visible in BOTH browsers.
3. After ~30 s, confirm the ad index advances and the cycle honours `defaultAdDurationSeconds` (configured in `/admin/display`).

## 11. Verify branding overlay hidden in iframe mode

1. Configure branding in `/admin/event` (logo + organizer + event name).
2. Confirm the overlay is visible on `/display`.
3. In `/admin/remote-control`, set `Content mode = Iframe` and select any preconfigured iframe. Save.
4. Confirm the overlay disappears within ~3 s (next poll cycle).
5. Switch back to `Rotation`. Confirm the overlay reappears.

## 12. Verify Pause / Resume

1. In `/admin/remote-control`, confirm the new "Pause" and "Resume" buttons are present in the "Rotation navigation" card.
2. Click Pause. Confirm the item currently on `/display` stays put; the rotation cursor does not advance.
3. Click Resume. Confirm the rotation continues within ≤ 1 s + `effectiveDurationSeconds`.
4. Switch to `Iframe` mode and try clicking Pause. Confirm the button is disabled (or the API returns 409).

## 13. Verify Fixed mode

1. Confirm the new "Fixed" radio appears under "Content mode" in `/admin/remote-control`.
2. Select "Fixed" and pick the fixed content uploaded in step 7. Save.
3. Confirm the kiosk switches to that content and stays on it.
4. Click Pause. Confirm the API rejects (HTTP 409).
5. Switch back to "Rotation". Confirm the rotation continues from the previous loop index (NOT from 0).

## 14. Verify recurring cadence

1. Confirm a recurring Content was uploaded in step 6 with `everyXIterations=3`.
2. Watch `/display` for ~30 content changes; confirm the recurring item appears every 3 changes.

## 15. Verify migration idempotency

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic upgrade head   # run twice
```

Expected: second run is a no-op (no errors, no duplicate rows/columns/constraints).

## 16. Verify frontend tests

```bash
npm --prefix frontend run test
```

Expected: all Karma specs pass, including the new iframe-overlay-hidden, fixed-mode-render, pause/resume, recurring-cadence, chrome-ad-visibility, and ad-index-advancement specs.

## 17. Verify backend tests

```bash
docker compose exec backend pytest backend/tests -q
```

Expected: all pytest tests pass, including the 8 new test files listed in `plan.md` §Project Structure.

## 18. Done

If all 17 steps pass, spec 018 is end-to-end green. Capture the transcript in a PR comment.