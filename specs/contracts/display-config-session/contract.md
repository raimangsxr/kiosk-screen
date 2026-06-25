---
id: DISPLAY.CONFIG_SESSION
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/application/display_config/**
  - backend/app/services/display_service.py
  - backend/app/api/configuration.py
  - backend/app/api/display.py
  - backend/app/api/v1/display/**
  - backend/app/repositories/models/operator_session.py
  - frontend/src/app/features/display-config/**
  - frontend/src/app/features/hall/**
  - frontend/src/app/core/api/display.api.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-002
  - CHG-011
related_adrs:
  []
---

# Kiosk Configuration and Session Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.CONFIG_SESSION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Operators can configure kiosk name, durations, animation defaults, inline ad count, polling cadence, video-end delay, and enabled state.
- Opening a display creates or reuses a valid operator session for the user organization.
- Display state polling returns configuration, top content, ads, selected iframe, remote control state, fallback status, and fixed-eligible contents.
- Readiness blockers prevent opening the kiosk when the setup is not safe for a live event.
- Polling cadence comes from configuration and is bounded to safe values.

## Public interfaces

- `GET /configuration`
- `PUT /configuration`
- `POST /display/open`
- `GET /display/state`

## Owned code paths

- `backend/app/application/display_config/**`
- `backend/app/services/display_service.py`
- `backend/app/api/configuration.py`
- `backend/app/api/display.py`
- `backend/app/api/v1/display/**`
- `backend/app/repositories/models/operator_session.py`
- `frontend/src/app/features/display-config/**`
- `frontend/src/app/features/hall/**`
- `frontend/src/app/core/api/display.api.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Multi-organization tenant switching is not part of this contract.

## Change history

- CHG-002
- CHG-011
