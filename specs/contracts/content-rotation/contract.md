---
id: CONTENT.ROTATION
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/application/display_orchestrator/**
  - backend/app/domain/rotation.py
  - backend/app/api/mappers.py
  - frontend/src/app/display/display-rotation.service.ts
  - frontend/src/app/display/kiosk-rotation.controller.ts
  - frontend/src/app/display/display-screen.component.ts
  - frontend/src/app/features/content/**
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-007
  - CHG-014
  - CHG-027
  - CHG-036
  - CHG-039
  - CHG-041
  - CHG-048
  - CHG-050
  - CHG-056
  - CHG-057
related_adrs:
  []
---

# Content Rotation Contract

## Purpose

This active contract is the current source of truth for `CONTENT.ROTATION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- **Server orchestrator (CHG-041)**: `DisplayOrchestrator` owns loop cursor, ad index, recurring counters, novelty queue, and rotation timers per active operator session. State persists in Redis; playlists load from PostgreSQL.
- Loop mode advances eligible top content in display order using effective per-item or default durations. Advances emit `show_content` SSE to all registered displays.
- Pause and resume freeze the top timer on the server; sponsor ads continue rotating independently (FR-011/FR-012).
- Ad rotation has an independent server timer; top-content advances must not clear or restart the ad timer.
- `show_ads` commands include every eligible active ad slice per `inlineAdCount`.
- Fixed content can be pinned and loop cursor state is restored when leaving fixed mode.
- Recurring content cadence rules (CHG-039) run in the orchestrator with per-item counters in Redis. Only **regular** (non-recurring) content transitions increment those counters; showing due or filler recurring content does not increment them.
- Empty content queues are debounced on the server; `orchestrator_empty_queue` audit events replace client `content_rotation_empty` posts.
- Public API uploads mark content with `isNovelty`; the orchestrator queues novelties with **defer-first emission** (CHG-056): at each loop boundary, if the head novelty is not ready on all connected kiosks, the orchestrator emits the next regular/recurring item and increments a per-novelty defer counter (max from `noveltyMaxDeferTransitions` configuration). When ready, the novelty emits in place of the next regular slot and the displaced regular is **rescheduled** for the following boundary. Max-defer discard calls `consume_novelty` without `show_content`. Kiosks report readiness via `novelty_preload_ready` on `POST /api/display/kiosk/events`.
- Admin content and ad write paths trigger orchestrator `content_mutated` refresh; playlist changes apply at the next content boundary.
- Fixed, iframe, and paused loop modes do not intercept novelties.

- `KioskRotationController` is deprecated (CHG-041 Phase 8); rotation timers live in the server orchestrator.
- After each top-content emit (`show_content` in loop mode), the server logs INFO `rotation_plan` with `showing`, `next`, and ordered `novelties` id list, plus `organizationId` and `operatorSessionId`.
- When the novelty queue or planned next item changes without an emit (e.g. public upload mid-cycle), the server logs INFO `rotation_replan` with the same fields while `showing` is unchanged.
- When top content stops (ads mode, pause, iframe), `rotation_plan` may log `showing: null`.
- `compute_rotation_plan_snapshot()` derives next/novelties using the same rules as `advance_top` without mutating state.
- On novelty queue change in active loop, server emits SSE `preload` with all pending novelty items (`isNovelty: true`) plus the next regular item when applicable. No `preload` while loop is paused, in fixed content mode, or iframe mode.
- After each top-content emit in loop, server emits `preload` for the next regular item at the start of that item's period.
- SSE `snapshot` includes `pendingNovelties` for reconnect backfill with `deferCount`, `maxDefer`, `downloadReady` per item. Preload items require `isNovelty: boolean`.
- First `media_error` per `commandId` advances orchestrator top rotation for all displays (deduped via `processedKioskEvents`); novelty gate timeout path removed (CHG-056).
- Orchestrator Redis state tracks `noveltyDeferCounts`, `noveltyReadyKiosks`, and `rescheduledRegularContentId`.
- **Rotation recovery (CHG-057)**: `GET /api/display/stream` open and `GET /api/display/state` call `ensure_display_orchestrator` when the engine is inactive (idempotent). Remote `adsVisible` false→true re-arms ad rotation via `ensure_ad_rotation`; hidden ads cancel the ad timer. Polled `GET /api/display/state` may include `currentTop` and `currentAds` (same shapes as SSE snapshot) reflecting live orchestrator position.

## Public interfaces

- SSE `show_content`, `show_ads`, `show_iframe`, `mode_changed`, `preload`
- `POST /api/display/kiosk/events` (`video_ended`, `media_error`, `novelty_preload_ready` — `media_error` advances rotation when deduped first report)
- `POST /api/display/content/{contentId}/consume-novelty` (deprecated; orchestrator consumes internally)

## Owned code paths

- `backend/app/application/display_orchestrator/service.py`
- `backend/app/application/display_orchestrator/preload.py`
- `backend/app/domain/rotation.py`
- `backend/app/api/mappers.py`
- `frontend/src/app/display/display-rotation.service.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`
- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/features/content/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Personalized or audience-targeted rotation is outside scope.

## Change history

- CHG-007
- CHG-014
- CHG-027
- CHG-036
- CHG-039
- CHG-041
- CHG-048
- CHG-050
