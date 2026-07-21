---
id: DISPLAY.CONFIG_SESSION
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/application/display_config/**
  - backend/app/services/display_service.py
  - backend/app/api/configuration.py
  - backend/app/api/display_stream.py
  - backend/app/api/v1/display/**
  - backend/app/repositories/models/operator_session.py
  - backend/app/repositories/models/kiosk_connection.py
  - frontend/src/app/features/display-config/**
  - frontend/src/app/features/hall/**
  - frontend/src/app/core/api/display.api.ts
  - frontend/src/app/core/api/live-kiosks.api.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-002
  - CHG-011
  - CHG-020
  - CHG-032
  - CHG-036
  - CHG-041
  - CHG-044
related_adrs:
  - ADR-0009
  - ADR-0012
---

# Kiosk Configuration and Session Contract

## Purpose

This active contract is the current source of truth for `DISPLAY.CONFIG_SESSION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Operators can configure kiosk name, durations, animation defaults, inline ad count, sponsor-strip item border (radius, width, color), video-end delay, and enabled state. `remoteControlPollingSeconds` is deprecated (CHG-041); SSE reconnect policy replaces polling cadence configuration.
- Operators can configure the region split: `topRegionRatio` and `bottomRegionRatio` are independent integer fields in `[1, 20]`, with defaults `5` (top) and `1` (bottom). The persisted columns accept any positive integer; the request schema enforces `[1, 20]` for input validation.
- The admin form at `/admin/configuration` exposes the two ratio inputs with `min=1, max=20` and includes them in the PUT payload.
- Opening a display creates a new operator session and supersedes any prior active sessions for the organization (sets `ended_at` on older rows). Remote control and state reads always target the latest active session.
- `GET /display/state` is read-only: it does not insert control-state rows, auto-fallback, audit events, or commits.
- Readiness blockers prevent opening the kiosk when the setup is not safe for a live event.
- Polling cadence configuration is deprecated. `GET /display/state` is retained as a degraded fallback only when SSE is unavailable for more than 60 seconds.
- Displays register via `POST /api/display/kiosk/register` with an optional `label` (display label for ops). Connection lifecycle is persisted in `kiosk_connections` for ops visibility (hot path remains Redis). Registration does not return embed-layout data.
- `POST /display/open` bootstraps the server orchestrator and emits an initial `snapshot` to connected displays.
- Session supersede sends `session_ended` SSE to prior connections.
- Admin ops dashboard lists connected kiosks via `GET /api/admin/display/kiosks/live` (`kioskId`, `displayLabel` only).

## Public interfaces

- `GET /configuration`
- `PUT /configuration`
- `POST /display/open`
- `POST /api/display/kiosk/register`
- `GET /api/display/stream`
- `GET /api/admin/display/kiosks/live`
- `GET /display/state` (deprecated SSE-down fallback only)

## Owned code paths

- `backend/app/application/display_config/**`
- `backend/app/services/display_service.py`
- `backend/app/api/configuration.py`
- `backend/app/api/display_stream.py`
- `backend/app/api/v1/display/**`
- `backend/app/repositories/models/operator_session.py`
- `frontend/src/app/features/display-config/**`
- `frontend/src/app/features/hall/**`
- `frontend/src/app/core/api/display.api.ts`
- `frontend/src/app/core/api/live-kiosks.api.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Multi-organization tenant switching is not part of this contract.
- Per-display iframe embed density profiles and calibration UI are out of scope (removed by CHG-044).

## Change history

- CHG-002
- CHG-011
- CHG-020
- CHG-032
- CHG-036
- CHG-041
- CHG-044 — removes CHG-042/043 layout REST, `layout_updated` SSE, and `embed_density_defaults`; adds live kiosks admin endpoint.
