# Quickstart: CHG-048 Content Now Playing

**Branch**: `048-content-now-playing`  
**Prereqs**: Display session open, ≥3 content items, CHG-047 admin SSE running

## 1. Yellow row tracks rotation (SC-001 / SC-002)

1. Login as `admin@example.com` / `admin`.
2. Open display (`POST /api/display/open`) and register a kiosk or use existing rotation.
3. Navigate to `/admin/content` with page size **Todas**.
4. Observe exactly one row with yellow background matching kiosk content.
5. Wait for rotation advance → yellow moves to next row within ~3 s without manual refresh.

**Pass**: Row highlight matches kiosk; no extra column added.

## 1b. Initial highlight on page load (FR-002 replay)

1. With display rotation already running (item on air), open a **new** browser tab to `/admin/content` (or hard-refresh).
2. Do **not** wait for the next rotation step.

**Pass**: Yellow row appears immediately on the currently on-air item (SSE replay on connect).

## 2. Off-page hint (FR-003)

1. With ≥25 items, set page size **20**.
2. Ensure on-air item is on page 2.
3. Stay on page 1.

**Pass**: Hint «En pantalla: [título]» visible; no wrong row highlighted on page 1.

## 3. Operator read access (FR-001 clarification)

1. Login as `operator@example.com` / `operator`.
2. Open `/admin/content` during active display.

**Pass**: Stream connects (no 403); yellow row updates on rotation.

## 4. Ads / pause clears highlight (FR-004)

1. Switch display to ads-only or pause remote control.
2. Observe admin list.

**Pass**: No yellow row; no «En pantalla» hint.

## 5. Rotation logs (SC-003 / SC-005)

1. Tail backend logs (`docker compose logs -f api` or local uvicorn).
2. Let 3 rotation steps occur.

**Pass**: Each step logs `rotation_plan` with `showing`, `next`, `novelties`.

## 6. Mid-cycle novelty replan (SC-004 / US3)

1. Note current item id on air (e.g. item 3).
2. Upload via public API (`POST /api/public/content/upload`).
3. Before rotation advances, check logs.

**Pass**: `rotation_replan` with `showing=3`, `next=<new id>`, `novelties=[<new id>]`.

## 7. Novelty + on air styling (FR-011)

1. Public upload while that item is showing on kiosk.
2. With «Solo novedades» off, inspect row.

**Pass**: Yellow background (not orange); «Nov.» chip still visible until consumed.

## 8. Accessibility & edge cases (FR-009, edge cases)

1. **Contrast**: Inspect on-air row text against yellow tint; confirm readable in light theme (WCAG AA body text).
2. **«Solo novedades» filter**: Enable filter while a non-novelty item is on air → off-page hint still shows; no wrong row highlighted on filtered page.
3. **Drag-and-drop**: Start dragging a row → drag styling must differ from `content-list__row--on-air` (no confusion).
4. **Deactivated item on air**: Deactivate the currently on-air item from admin → highlight clears or moves when orchestrator reacts (≤3 s).

**Pass**: All four checks behave as specified.

## Automated smoke

```sh
pytest backend/tests/unit/test_rotation_plan_snapshot.py backend/tests/unit/test_rotation_logging.py backend/tests/integration/test_admin_content_now_playing_stream.py -q
npm --prefix frontend run test -- --include='**/content-list*' --include='**/admin-content-stream*'
```
