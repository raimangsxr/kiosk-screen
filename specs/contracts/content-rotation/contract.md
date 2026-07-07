---
id: CONTENT.ROTATION
type: contract
status: active
source_of_truth: true
owns:
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
related_adrs:
  []
---

# Content Rotation Contract

## Purpose

This active contract is the current source of truth for `CONTENT.ROTATION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Loop mode advances eligible top content in display order using effective per-item or default durations.
- Pause and resume affect loop rotation without stopping backend polling.
- Ad rotation has an independent timer; top-content advances in loop/rotation mode must not clear or restart the ad timer.
- `DisplayState.ads` includes every eligible active ad in display order. `inlineAdCount` controls how many ads the kiosk shows concurrently in the sponsor strip; it does not cap the polled ad list.
- Fixed content can be pinned and loop cursor state is restored when leaving fixed mode.
- Recurring content with recurringEveryXIterations appears according to per-item
  cadence counters in the kiosk loop controller (CHG-039).
- Each active recurring item maintains an in-memory counter keyed by `contentId`.
  Counters increment on every on-screen content transition in loop mode (including
  due recurring and filler slides), except during pause or novelty bursts.
- After increment, an item is due when `counter >= recurringEveryXIterations`.
  Multiple due items resolve one per transition in ascending `displayOrder`; showing
  a due item resets only that counter and does not advance the regular queue cursor.
- When no regular content exists and no item is due, recurring items rotate as
  filler by `displayOrder`. `jump_to` a recurring item resets only its counter;
  polled cadence changes reset only the affected item; removing the last recurring
  clears all counters. Mode transitions preserve counter values until page reload.
- Empty content queues are debounced and reported through the display rotation event endpoint.
- Public API uploads mark content with `isNovelty`; loop mode intercepts pending novelties on each content transition (timer, video ended, remote next/previous), shows them in `displayOrder`, uses kiosk default top timing, and atomically consumes via `POST /api/display/content/{contentId}/consume-novelty`.
- Items with `isNovelty = true` are excluded from the regular queue; after the burst, rotation resumes at the item after the pre-burst regular cursor. Recurring cadence does not advance during a novelty burst.
- Fixed, iframe, and paused loop modes do not intercept novelties.

## Public interfaces

- `DisplayState.topContent` (includes `isNovelty`)
- `DisplayState.ads`
- `RemoteControl.navigationCommand`
- `POST /api/display/content/{contentId}/consume-novelty`

## Owned code paths

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
