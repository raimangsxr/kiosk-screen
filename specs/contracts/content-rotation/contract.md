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
- Fixed content can be pinned and loop cursor state is restored when leaving fixed mode.
- Recurring content with recurringEveryXIterations appears according to the controller cadence contract.
- Empty content queues are debounced and reported through the display rotation event endpoint.

## Public interfaces

- `DisplayState.topContent`
- `DisplayState.ads`
- `RemoteControl.navigationCommand`

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
