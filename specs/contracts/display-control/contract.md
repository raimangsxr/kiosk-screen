---
id: DISPLAY.CONTROL
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/application/display_control/**
  - backend/app/api/display.py
  - backend/app/repositories/models/display_control_state.py
  - frontend/src/app/features/remote-control/**
  - frontend/src/app/core/display-control-sync.service.ts
  - frontend/src/app/display/kiosk-rotation.controller.ts
  - frontend/src/app/display/display-screen.component.ts
tests:
  - backend/tests/**/*remote_control*
  - backend/tests/**/*display_control*
  - frontend/src/app/features/remote-control/**/*.spec.ts
  - frontend/src/app/display/kiosk-rotation.controller.spec.ts
related_changes:
  - CHG-005
  - CHG-006
  - CHG-007
  - CHG-014
related_adrs:
  - ADR-0003
---

# Display Control Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.CONTROL`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Remote control supports content modes loop, iframe, and fixed.
- Navigation commands are next, previous, pause, resume, and jump_to; jump_to is valid only in loop mode and requires an active non-fixed target.
- The fixed-mode selector lists fixed-eligible content with a visual preview when a thumbnail or media URL is available, falling back to a content-type icon when no preview asset is present.
- Ads visibility and fullscreen request changes are propagated through display polling and audited.
- Fixed mode validates fixed-eligible content and auto-falls back to loop if the target disappears or is unmarked.
- Cross-tab sync keeps multiple kiosk tabs aligned without direct private-field access to the controller.

## Public interfaces

- `GET /display/remote-control/state`
- `PUT /display/remote-control/state`
- `POST /display/remote-control/navigation`
- `GET /display/remote-control/iframe-options`
- `POST /display/rotation-event`

## Owned code paths

- `backend/app/application/display_control/**`
- `backend/app/api/display.py`
- `backend/app/repositories/models/display_control_state.py`
- `frontend/src/app/features/remote-control/**`
- `frontend/src/app/core/display-control-sync.service.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`
- `frontend/src/app/display/display-screen.component.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Multi-machine real-time synchronization beyond the existing polling/cross-tab model.

## Change history

- CHG-005
- CHG-006
- CHG-007
- CHG-014
