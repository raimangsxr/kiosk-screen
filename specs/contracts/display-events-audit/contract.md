---
id: DISPLAY.EVENTS.AUDIT
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/domain/display_events.py
  - backend/app/repositories/events.py
  - backend/app/repositories/models/display_event.py
  - backend/app/api/events.py
  - backend/app/api/v1/events/**
  - frontend/src/app/features/**
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-012
  - CHG-004
  - CHG-005
  - CHG-007
  - CHG-014
related_adrs:
  - ADR-0003
---

# Display Events Audit Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.EVENTS.AUDIT`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Operational events are recorded with organization, type, severity, message, metadata, created_by_user_id, and timestamp.
- The event type catalog is explicit and producers must not emit undocumented event types.
- Secrets and tokens are sanitized before being stored in event metadata or messages.
- Administrators can browse relevant display and API-key events.
- Kiosk-originated empty-queue events are accepted only for supported event types.
- In loop mode with zero eligible top content, the kiosk client posts `content_rotation_empty` to `POST /api/display/rotation-event` (debounced on the client per existing catalog semantics). The display screen wires the rotation controller sink to this endpoint at runtime.

## Public interfaces

- `GET /events`
- `POST /display/rotation-event`

## Owned code paths

- `backend/app/domain/display_events.py`
- `backend/app/repositories/events.py`
- `backend/app/repositories/models/display_event.py`
- `backend/app/api/events.py`
- `backend/app/api/v1/events/**`
- `frontend/src/app/features/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- External SIEM forwarding is not required by this contract.

## Change history

- CHG-012
- CHG-004
- CHG-005
- CHG-007
- CHG-014
- CHG-029
