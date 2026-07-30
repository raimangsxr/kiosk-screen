# Contract Deltas — CHG-048

Merge into active contracts **before implementation** (Constitution IV).

## CONTENT.ADS.ADMIN

Add to **Current behavior**:

- Admin content list highlights the row/card of the item currently on air with a **soft yellow background** (`content-list__row--on-air`); no new table column.
- Highlight updates via SSE `now_playing_changed` on `GET /api/admin/content/stream` within ≤3 s of orchestrator emit; on stream connect, server replays current now-playing state immediately.
- When the on-air item is not on the visible page, show compact hint «En pantalla: [título]» below the action bar.
- When no top content is on displays (ads mode, pause, no session), no row highlighted and no hint.
- If item is both on air and `isNovelty`, yellow emission background wins; «Nov.» chip remains.
- Admin content stream auth: any authenticated user with list access (includes `event_operator`), not only `CONTENT_MANAGEMENT_ROLES`.

Add to **Public interfaces**:

- SSE event `now_playing_changed` on `/api/admin/content/stream`

Add to **related_changes**: CHG-048

---

## CONTENT.ROTATION

Add to **Current behavior**:

- After each top-content emit, server logs INFO `rotation_plan` with showing, next, and novelty queue ids.
- On inventory mutation affecting novelty queue without emit, server logs INFO `rotation_replan` with updated next/novelties while showing unchanged.
- `compute_rotation_plan_snapshot()` derives next/novelties using same rules as `advance_top`.

Add to **related_changes**: CHG-048

---

## CHG-047 contract note

`specs/changes/047-admin-content-sse/contracts/admin-content-stream.md` auth line superseded for stream endpoint: use `get_current_user` per CHG-048 `admin-content-stream-now-playing.md`.
