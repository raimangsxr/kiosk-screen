# Context Pack: CHG-040 Admin Operations Dashboard

**Change**: `specs/changes/040-admin-operations-dashboard/`  
**Status**: in-progress  
**Branch**: `040-admin-operations-dashboard`

## Read first

1. `specs/changes/040-admin-operations-dashboard/tasks.md`
2. `specs/changes/040-admin-operations-dashboard/plan.md`
3. `specs/changes/040-admin-operations-dashboard/spec.md`
4. `specs/contracts/admin-shell-navigation/contract.md`
5. `specs/contracts/readiness-setup/contract.md`
6. `specs/contracts/display-control/contract.md`
7. `specs/contracts/display-events-audit/contract.md`
8. `specs/contracts/content-rotation/contract.md`

## Current code anchors

- `frontend/src/app/features/dashboard/dashboard.component.ts` — legacy layout to replace
- `frontend/src/app/features/dashboard/dashboard.service.ts` — parallel load + per-section degrade pattern to preserve
- `frontend/src/app/features/readiness/readiness.component.ts` — blocker → route resolution to reuse
- `frontend/src/app/features/remote-control/remote-control.component.ts` — live status labels (`displayOnline`, `modeLabel`, etc.)
- `backend/app/api/events.py` — `GET /events` for activity feed (no admin UI yet)

## Product decisions (from iteration)

- Dashboard purpose: **operations center**, not second navigation menu.
- Remove legacy section-summary card grid and static quick-action grid.
- Include: operational hero, actionable blockers, activity feed, programmed content queue.
- Exclude v1: playback heartbeat, novelty multi-kiosk behavior change, hall routing change.

## Contract updates required

- `ADMIN.SHELL.NAVIGATION` — dashboard behavior and sections
- `READINESS.SETUP` — optional if dashboard readiness surfacing changes materially

## Validation

```sh
npm --prefix frontend run test -- --include='**/dashboard/**'
npm --prefix frontend run test -- --include='**/readiness/**'
```
