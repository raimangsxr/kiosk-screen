---
id: IFRAMES.VIDEO_END
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/iframes.py
  - backend/app/repositories/models/iframe.py
  - backend/app/application/display_config/**
  - frontend/src/app/features/iframes/**
  - frontend/src/app/display/display-screen.component.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-006
related_adrs:
  []
---

# Preconfigured Iframes and Video-End Contract

## Purpose

This active contract is the current source of truth for `IFRAMES.VIDEO_END`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authorized users can create, list, update, and delete preconfigured iframe URLs.
- Iframe mode requires a selected iframe that still exists and belongs to the user organization.
- Deleted selected iframes cause the display control state to revert safely to loop mode.
- Video end delay is configurable and applied by the runtime before advancing after video end.
- Iframe rendering hides the branding overlay and uses a sanitized safe resource URL.

## Public interfaces

- `GET /iframes`
- `POST /iframes`
- `PUT /iframes/{id}`
- `DELETE /iframes/{id}`
- `GET /display/remote-control/iframe-options`

## Owned code paths

- `backend/app/api/iframes.py`
- `backend/app/repositories/models/iframe.py`
- `backend/app/application/display_config/**`
- `frontend/src/app/features/iframes/**`
- `frontend/src/app/display/display-screen.component.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Arbitrary domains are not allowed unless approved by the iframe/domain governance.

## Change history

- CHG-006
