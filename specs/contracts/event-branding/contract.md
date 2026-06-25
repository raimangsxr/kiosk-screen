---
id: EVENT.BRANDING
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/event_configuration.py
  - backend/app/api/event_branding.py
  - backend/app/repositories/models/event_configuration.py
  - frontend/src/app/core/event-branding.service.ts
  - frontend/src/app/features/event-config/**
  - frontend/src/app/display/display-screen.component.ts
  - frontend/src/app/display/display-screen.component.css
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-008
  - CHG-019
related_adrs:
  - ADR-0005
---

# Event Branding Contract

## Purpose

This active contract is the current source of truth for `EVENT.BRANDING`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Administrators can configure event name, organizer name, organizer logo, and event duration.
- The kiosk displays branding when configured and hides the overlay when no branding fields are available.
- Broken organizer logos are hidden without breaking the kiosk runtime.
- Branding remains visible and non-overlapping across supported landscape viewports. The overlay container is full-width flex with `justify-content: space-between`: the organizer logo anchors to the left and the event name anchors to the right inside the same overlay container, so the two children never collide (see `ADR-0005`).
- Branding is not shown over iframe mode.

## Public interfaces

- `GET /event-configuration`
- `PUT /event-configuration`
- `GET /event-branding`

## Owned code paths

- `backend/app/api/event_configuration.py`
- `backend/app/api/event_branding.py`
- `backend/app/repositories/models/event_configuration.py`
- `frontend/src/app/core/event-branding.service.ts`
- `frontend/src/app/features/event-config/**`
- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Multi-logo sponsor carousels are handled by ads, not branding.

## Change history

- CHG-008
- CHG-019
