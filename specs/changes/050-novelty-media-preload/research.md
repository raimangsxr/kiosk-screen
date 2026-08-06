# Research: CHG-050 Novelty Media Preload & Queue Indicator

**Date**: 2026-08-04

## R1 — Novelty preload trigger (server)

**Decision**: Emit SSE `preload` when pending novelty queue changes (public upload / `notify_content_mutated` replan) and on orchestrator bootstrap for active loop sessions. Payload includes **all** pending novelty items plus the next planned regular item.

**Rationale**: FR-001/FR-002; maximizes lead time; reuses existing `preload` event type and kiosk `DisplayMediaCacheService.warm()`.

**Alternatives considered**:
- New `novelty_preload` event — duplicate hub wiring; rejected.
- Preload only first novelty — insufficient for burst uploads (clarification: signal all, download FIFO max 3).

---

## R2 — Regular preload timing

**Decision**: After each `emit_top_content` in loop mode (and on bootstrap snapshot path), emit `preload` for the **next regular** item if no novelty intercepts the next slot. Remove the current pattern of calling `emit_preload` only inside `advance_loop_top` immediately before `emit_top_content` for the *current* advance.

**Rationale**: FR-006 — preload at start of current item's period equals preload right after previous item lands; separates preload lead time from transition instant.

**Alternatives considered**:
- Keep simultaneous preload+show_content — fails SC-003 for heavy regular items.

---

## R3 — Preload payload shape

**Decision**: Extend each preload item with `isNovelty: boolean` (required). Keep existing fields `contentId`, `mediaUrl`, `contentType`, `mediaVersion`.

**Rationale**: Same SSE event serves regular warm + novelty queue indicator (indicator filters `isNovelty === true` only).

**Alternatives considered**:
- Separate indicator feed — extra SSE type; rejected.

---

## R4 — Snapshot backfill for reconnect

**Decision**: Extend `build_snapshot_payload()` with `pendingNovelties: PreloadItem[]` built from `compute_rotation_plan_snapshot().novelties` mapped through eligible content rows (same shape as preload items).

**Rationale**: Clarification session — indicator and warm queue MUST rebuild from server plan on reconnect, not only from preload events received before disconnect (FR-010).

**Alternatives considered**:
- Re-emit preload only on connect — race if client misses event; snapshot is already sent on SSE open.

---

## R5 — Client display gate (“último gana”)

**Decision**: New `DisplayContentGateService` (display-scoped) holds at most one **pending** `ShowContentPayload`. New `show_content` replaces pending (latest wins). Committed display updates `DisplayViewerController` only when `DisplayMediaCacheService` reports ready (image blob + decode probe; video `canplaythrough` on blob URL). While waiting, keep rendering previous committed content.

**Rationale**: FR-003/FR-004/FR-011; clarifications on latest-wins and no black frame.

**Alternatives considered**:
- FIFO pending queue — rejected by clarification.
- Gate in component template only — untestable; service extraction preferred.

---

## R6 — Gate timeout and `media_error`

**Decision**: Client gate timeout default **30 s** per pending command; on timeout or cache `ensure()` failure, post existing `POST /api/display/kiosk/events` `media_error` with `contentId` + reason metadata. Extend `DisplayOrchestrator.handle_media_error()` to dedupe by `commandId` (same pattern as `handle_video_ended`) and call `advance_top(session, reason="media_error")` once — advancing **all** displays via next `show_content`.

**Rationale**: FR-007 + clarification; today `handle_media_error` only audits and does not advance — gap must close.

**Alternatives considered**:
- Client-only skip without server — desyncs multi-kiosk rotation.

---

## R7 — Novelty queue indicator UI

**Decision**: Standalone overlay component `NoveltyQueueIndicatorComponent` in `display-screen` template (bottom-right, reduced opacity, `pointer-events: none`). State from `NoveltyQueueTrackerService`: sync list from preload items (`isNovelty`) + snapshot `pendingNovelties`; max **5** icons FIFO + `+N` counter; states `downloading` | `ready` (check) | `error` (✗); remove icon when gate **commits** visibility (not on raw `show_content`).

**Rationale**: US5 + clarifications (always visible discrete overlay, 5+N cap, error state, remove on real display).

**Alternatives considered**:
- Thumbnails — out of scope v1.
- Debug-only toggle — rejected by clarification.

---

## R8 — Download concurrency

**Decision**: Centralize in `DisplayMediaCacheService` a small scheduler: FIFO queue, max **3** concurrent `ensure()` fetches; `warm()` enqueues without exceeding cap.

**Rationale**: FR-002/FR-008; avoids ad-hoc parallel `warm()` calls from multiple effects.

**Alternatives considered**:
- Unlimited parallel — risks venue bandwidth saturation.

---

## R9 — Video “ready” criterion

**Decision**: After blob fetch, create off-DOM `<video preload="auto">` with blob URL; resolve ready on `canplaythrough` (with 10 s sub-timeout → treat as error).

**Rationale**: FR-003 edge case; bytes alone insufficient for smooth start.

**Alternatives considered**:
- `loadeddata` only — may still stall on first frame.

---

## R10 — Modes without novelty intercept

**Decision**: Gate and indicator active only when `contentMode === 'loop' && !isPaused && !iframeActive`. On mode change away, clear pending gate + hide indicator + stop novelty warm (regular preload may continue per spec FR-009).

**Rationale**: CHG-027 + FR-009.

**Alternatives considered**:
- Keep indicator during pause — contradicts edge case.
