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
  - backend/app/repositories/models/display_device.py
  - backend/app/api/display_devices.py
  - frontend/src/app/features/display-config/**
  - frontend/src/app/features/hall/**
  - frontend/src/app/core/api/display.api.ts
  - frontend/src/app/core/api/live-kiosks.api.ts
  - frontend/src/app/core/api/display-device.api.ts
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
  - CHG-045
related_adrs:
  - ADR-0009
  - ADR-0012
  - ADR-0013
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
- Displays register via `POST /api/display/kiosk/register` with a required non-empty `label`. Registration upserts `display_devices` by `(organization_id, label)`, links `kiosk_connections.display_device_id`, and returns `displayDeviceId` in the response. Connection lifecycle is persisted in `kiosk_connections` for ops visibility (hot path remains Redis). Registration does not return embed-layout data.
- Known display devices are listed and managed via `GET/POST/PATCH/DELETE /api/admin/display-devices`. Manual pre-creation is supported; label rename updates metadata only (overrides stay on device id).
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
- `GET /api/admin/display-devices`
- `POST /api/admin/display-devices`
- `PATCH /api/admin/display-devices/{id}`
- `DELETE /api/admin/display-devices/{id}`
- `GET /display/state` (deprecated SSE-down fallback only)

## Owned code paths

- `backend/app/application/display_config/**`
- `backend/app/services/display_service.py`
- `backend/app/api/configuration.py`
- `backend/app/api/display_stream.py`
- `backend/app/api/v1/display/**`
- `backend/app/repositories/models/operator_session.py`
- `backend/app/repositories/models/kiosk_connection.py`
- `backend/app/repositories/models/display_device.py`
- `backend/app/api/display_devices.py`
- `frontend/src/app/features/display-config/**`
- `frontend/src/app/features/hall/**`
- `frontend/src/app/core/api/display.api.ts`
- `frontend/src/app/core/api/live-kiosks.api.ts`
- `frontend/src/app/core/api/display-device.api.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Multi-organization tenant switching is not part of this contract.
- Per-display iframe embed density profiles and on-display calibration UI are out of scope (removed by CHG-044).

## Change history

- CHG-002
- CHG-011
- CHG-020
- CHG-032
- CHG-036
- CHG-041
- CHG-044 — removes CHG-042/043 layout REST, `layout_updated` SSE, and `embed_density_defaults`; adds live kiosks admin endpoint.
- CHG-045 — restores slim `display_devices` registry, required register label, and admin display-device CRUD.
