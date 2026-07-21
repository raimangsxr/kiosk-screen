---
id: IFRAMES.VIDEO_END
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/iframes.py
  - backend/app/repositories/models/iframe.py
  - backend/app/application/display_config/**
  - backend/app/application/iframe_runtime.py
  - frontend/src/app/features/iframes/**
  - frontend/src/app/display/display-screen.component.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-006
  - CHG-044
related_adrs:
  - ADR-0012
---

# Preconfigured Iframes and Video-End Contract

## Purpose

This active contract is the current source of truth for `IFRAMES.VIDEO_END`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authorized users can create, list, update, and delete preconfigured iframe URLs.
- Each iframe stores `scaleX` and `scaleY` (default `1.0`, validated range `0.1`–`5.0`). The same scale applies on every kiosk that shows that iframe.
- Iframe mode requires a selected iframe that still exists and belongs to the user organization.
- Deleted selected iframes cause the display control state to revert safely to loop mode.
- Video end delay is configurable and applied by the runtime before advancing after video end.
- Iframe rendering hides the branding overlay and uses a sanitized safe resource URL. The configured URL, including any query string, is passed through unchanged to the kiosk iframe `src` (no stripping or rewriting of operator-supplied parameters).
- When an iframe is updated via `PUT /iframes/{id}` and that iframe is the active remote-control selection, the server re-emits `show_iframe` so connected kiosks refresh scale without reloading `/display`.

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
- `backend/app/application/iframe_runtime.py`
- `frontend/src/app/features/iframes/**`
- `frontend/src/app/display/display-screen.component.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Arbitrary domains are not allowed unless approved by the iframe/domain governance.
- Per-kiosk iframe scale overrides are not supported (scale is per iframe record).

## Change history

- CHG-006
- CHG-044 — replaces CHG-042 embed-density model with per-iframe `scaleX`/`scaleY` and live `show_iframe` refresh on update.
