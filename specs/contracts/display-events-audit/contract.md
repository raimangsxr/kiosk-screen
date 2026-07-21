---
id: DISPLAY.EVENTS.AUDIT
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/application/display_orchestrator/**
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
  - CHG-041
  - CHG-044
related_adrs:
  - ADR-0003
  - ADR-0009
---

# Display Events Audit Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.EVENTS.AUDIT`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Operational events are recorded with organization, type, severity, message, metadata, created_by_user_id, and timestamp.
- The event type catalog is explicit and producers must not emit undocumented event types.
- Secrets and tokens are sanitized before being stored in event metadata or messages.
- Administrators can browse relevant display and API-key events.
- Kiosk-originated empty-queue events are accepted only for supported event types. When the orchestrator is active, empty-queue detection is server-side (`orchestrator_empty_queue`); client `content_rotation_empty` posts are deprecated.
- SSE lifecycle events: `kiosk_connected` on register + stream open; `kiosk_disconnected` on stream close.
- Orchestrator audit: `orchestrator_advanced` on each top content advance (optional metadata: `commandId`, `reason`); `orchestrator_empty_queue` debounced warning when no eligible top content; `orchestrator_session_ended` when session is superseded or expires.

## Public interfaces

- `GET /events`
- `POST /display/rotation-event` (deprecated when orchestrator active)
- `POST /api/display/kiosk/events` (playback facts; orchestrator may emit related audit entries)

## Owned code paths

- `backend/app/application/display_orchestrator/service.py`
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
- CHG-041
- CHG-044 — removes layout calibration audit events introduced by CHG-042.
