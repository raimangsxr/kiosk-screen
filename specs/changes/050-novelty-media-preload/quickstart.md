# Quickstart: CHG-050 Novelty Media Preload

## Prerequisites

- Local lab running (`docs/dev/local-lab.md`)
- Active display session (operator opened display / kiosk registered)

## Manual validation

### 1. Novelty preload + indicator

1. Open kiosk display in loop mode with regular content rotating.
2. Upload a large video via public API (`isNovelty=true`).
3. Within 2 s: discrete overlay shows one video icon (no check yet).
4. When download completes: check appears on icon.
5. On next rotation boundary: slide changes without black frame; icon disappears when video is actually visible.

### 2. Heavy novelty late upload

1. Upload novelty when current slide has ~5 s left.
2. Observe: previous slide stays visible past boundary until video ready (no black).
3. Indicator shows pending without check until ready.

### 3. Multiple novelties (5+N)

1. Queue 6+ public uploads quickly.
2. Indicator shows 5 icons + "+1" (or +N).
3. As each plays, icons shift; overflow count decreases.

### 4. Failed media

1. Upload novelty then break media URL (or use integration test stub returning 404).
2. Icon shows error state; after `media_error` rotation advances; icon removed.

### 5. Reconnect

1. With 2 pending novelties, kill SSE (devtools offline) then restore.
2. Snapshot restores 2 icons without requiring re-upload.

## Automated tests

```sh
# Backend
pytest backend/tests/unit/test_novelty_preload_emit.py
pytest backend/tests/unit/test_media_error_advance.py
pytest backend/tests/integration/test_display_preload_sse.py
pytest backend/tests/integration/test_display_media_error_multi_kiosk.py

# Frontend
npm --prefix frontend run test -- --include='**/display-content-gate*.spec.ts'
npm --prefix frontend run test -- --include='**/novelty-queue*.spec.ts'
npm --prefix frontend run test -- --include='**/display-screen.component.spec.ts'
```

## Contract update (before merge)

Contracts merged in T002/T002b/T003/T004 — see [contracts/contract-deltas.md](./contracts/contract-deltas.md) for audit trail.

## Key files

| Area | File |
|------|------|
| Preload emit | `backend/app/application/display_orchestrator/rotation_logic.py` |
| Content mutation hook | `backend/app/application/display_orchestrator/hooks.py` |
| Snapshot | `backend/app/application/display_orchestrator/snapshot_builder.py` |
| Media error advance | `backend/app/application/display_orchestrator/service.py` |
| Media cache | `frontend/src/app/display/display-media-cache.service.ts` |
| Gate | `frontend/src/app/display/display-content-gate.service.ts` |
| Indicator | `frontend/src/app/display/novelty-queue-indicator.component.ts` |
| Kiosk shell | `frontend/src/app/display/display-screen.component.ts` |
