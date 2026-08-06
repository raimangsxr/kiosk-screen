# Contract Delta: Novelty Queue Indicator (CHG-050)

Merge into `specs/contracts/content-rotation/contract.md` (kiosk runtime section) before implementation.

## UI

- Always-visible discrete overlay on kiosk display (bottom-right default, reduced opacity).
- **Only novelties** (`isNovelty` preload items / snapshot `pendingNovelties`).
- One icon per pending novelty (image vs video glyph); no thumbnails in v1.
- Check overlay when download status = ready (same criterion as media gate).
- Error overlay (✗ or error tint) on download failure until removal.
- Remove icon when novelty is **committed visible** on screen (gate opened), not on raw `show_content`.
- Remove icon when novelty skipped (último gana, `media_error`, server no longer pending).
- Max **5** icons (FIFO by `displayOrder`) + **+N** counter for overflow.
- Hidden when queue empty or mode disallows novelty intercept (pause/fixed/iframe).

## Data sources

1. SSE `preload` items with `isNovelty: true`
2. SSE `snapshot.pendingNovelties` on connect/reconnect
3. Download status from `DisplayMediaCacheService`

## Accessibility

- `aria-hidden="true"` on decorative overlay (staff-facing subtle cue; not primary UI).

## Owned frontend paths

- `frontend/src/app/display/novelty-queue-tracker.service.ts` (new)
- `frontend/src/app/display/novelty-queue-indicator.component.ts` (new)
- `frontend/src/app/display/display-screen.component.ts`
