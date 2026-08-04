# Contract Deltas — CHG-050

Merge into active contracts **before implementation** (Constitution IV).

## CONTENT.ROTATION

Add to **Current behavior**:

- On novelty queue change in active loop, server emits SSE `preload` with all pending novelty items (`isNovelty: true`) plus next regular item when applicable.
- After each top-content emit in loop, server emits `preload` for the next regular item at the start of that item's period (not simultaneous with the following advance only).
- SSE `snapshot` includes `pendingNovelties` for reconnect backfill.
- Preload item schema includes required `isNovelty` boolean.
- No `preload` emission while loop is paused, in fixed content mode, or iframe mode (CHG-027).
- First `media_error` per `commandId` advances orchestrator top rotation for all displays (deduped via `processedKioskEvents`).

Add to **Public interfaces**:

- SSE `preload` (extended item field `isNovelty`)
- `snapshot` field `pendingNovelties`
- `POST /api/display/kiosk/events` `media_error` triggers rotation advance (deduped)

Add to **Owned code paths** (backend):

- `backend/app/application/display_orchestrator/preload.py`

Add to **related_changes**: CHG-050

---

## DISPLAY.RUNTIME

Add to **Current behavior**:

- `DisplayContentGateService` holds pending `show_content` (latest wins) and commits to `DisplayViewerController` only when `DisplayMediaCacheService` reports media ready (image decode / video `canplaythrough`). While pending, the last committed slide remains visible — no remote URL fallback that causes black frames.
- Gate and novelty preload warm are inactive when `contentMode` is fixed or iframe, or when loop is paused (FR-009).
- On preload/gate failure or `GATE_TIMEOUT_MS` (30 s default), kiosk posts `media_error`; committed content stays visible until next `show_content`.
- `DisplayMediaCacheService` schedules downloads FIFO with max 3 concurrent fetches; dedupes cached and in-flight URLs.
- **Novelty queue indicator**: always-visible discrete overlay (bottom-right, reduced opacity) showing pending novelty icons only (image/video glyph, no thumbnails). Check when ready; error overlay on failed download; max 5 icons + `+N` overflow; hidden when queue empty or gate inactive modes. Icons removed on gate commit (real visibility), skip, or replan sync.
- `NoveltyQueueTrackerService` syncs from latest `preload` payload (authoritative ordered ids) and `snapshot.pendingNovelties` on reconnect; exposes `onCommitted(contentId)` hook from gate.

Add to **Public interfaces**:

- `DisplayContentGateService.committedContent`, `enqueueShowContent()`, `onCommitted` callback
- `NoveltyQueueTrackerService.visibleIcons`, `overflowCount`

Add to **Owned code paths**:

- `frontend/src/app/display/display-media-cache.service.ts`
- `frontend/src/app/display/display-content-gate.service.ts`
- `frontend/src/app/display/novelty-queue-tracker.service.ts`
- `frontend/src/app/display/novelty-queue-indicator.component.ts`
- `frontend/src/app/display/display-stream.models.ts`

Add to **related_changes**: CHG-050

---

## Manifest

- Add `CHG-050` entry `status: in-progress` under `changes:`.
- Add `CHG-050` to `CONTENT.ROTATION.related_changes` and `DISPLAY.RUNTIME.related_changes`.
