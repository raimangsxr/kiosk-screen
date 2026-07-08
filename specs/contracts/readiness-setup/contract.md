---
id: READINESS.SETUP
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/domain/readiness.py
  - backend/app/application/readiness/**
  - backend/app/api/readiness.py
  - backend/app/api/v1/readiness/**
  - frontend/src/app/features/readiness/**
  - frontend/src/app/features/dashboard/**
  - frontend/src/app/features/hall/**
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-011
  - CHG-037
  - CHG-040
related_adrs:
  []
---

# Readiness and Setup Check Contract

## Purpose

This active contract is the current source of truth for `READINESS.SETUP`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Readiness evaluation reports blockers and warnings before a live display is opened.
- Open kiosk is blocked when readiness is red and allowed when blockers are resolved.
- Checks cover enabled configuration, available content, available ads, timing values, and event setup as applicable.
- The admin dashboard and readiness page surface actionable status without exposing internal errors.
- The hall page shows the deployed application version in a footer (`Versión {version}`). Production images receive the value from the release tag at Docker build time; local dev uses `dev`.
- Readiness logic is testable independently from the UI.
- `GET /health` is a lightweight liveness probe (`{"status": "ok"}`) and does not check dependencies.
- `GET /ready` is the traffic-routing probe: it returns `{"status": "ready"}` when the database answers `SELECT 1` and the configured media storage path is writable; otherwise HTTP 503 with per-check status in `checks`.

### Dashboard readiness surfacing

- The dashboard MUST surface the same blocker and warning messages returned by readiness evaluation.
- Each blocker and warning on the dashboard MUST include a navigation control to the appropriate admin resolution route (equivalent intent to the readiness page "Resolver" / "Revisar" actions).
- Dashboard readiness failure (endpoint unavailable) MUST show a recoverable error in the readiness section without preventing other dashboard sections from rendering when their sources succeed.

## Public interfaces

- `GET /readiness`

## Public interfaces (operations probes)

- `GET /health`
- `GET /ready`

## Owned code paths

- `backend/app/domain/readiness.py`
- `backend/app/application/readiness/**`
- `backend/app/api/readiness.py`
- `backend/app/api/v1/readiness/**`
- `frontend/src/app/features/readiness/**`
- `frontend/src/app/features/dashboard/**`
- `frontend/src/app/features/hall/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Hardware health monitoring is outside scope.

## Change history

- CHG-011
- CHG-032
- CHG-037
- CHG-040 — dashboard readiness alerts with resolve navigation and partial degradation.
