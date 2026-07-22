# Implementation Plan: Per-Display Iframe Scale

**Input**: Feature specification from `specs/changes/045-per-display-iframe-scale/spec.md`  
**Branch**: `045-per-display-iframe-scale` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`specs/manifest.yml` — `IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`)
- Active contracts read: `iframes-video-end`, `display-runtime`, `display-config-session`
- Change specs read: CHG-045 (active), CHG-044 (baseline scale), CHG-042 (historical device identity only)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: ADR-0009, ADR-0012 (to be extended by ADR-0013)
- Code entrypoints verified: `iframe_service.py`, `iframe_runtime.py`, `remote_control.py`, `display_stream.py`, `iframe-list/form`, `display-screen.component.ts`, `display-viewer.controller.ts`
- Tests identified: unit resolver, integration APIs, Angular iframe + display specs
- Archived or consolidated specs read: none

## Summary

Extend CHG-044 per-iframe default CSS scale with **per-display overrides** keyed by stable `display_devices` records. Operators manage overrides from the **iframe admin list** (summary) and **iframe edit-form matrix** (batch save). Kiosks resolve effective scale client-side (`override ?? default`) using `displayDeviceId` from register; live updates via new `iframe_scale_updated` SSE event. Reintroduces slim `display_devices` table (without CHG-042 density profiles).

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript / Angular 19+ (frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy, Alembic, PostgreSQL; Angular Material admin shell  
**Storage**: PostgreSQL (`display_devices`, `iframe_display_scale_overrides`); Redis SSE fanout (unchanged)  
**Testing**: pytest (backend unit + integration); Angular Vitest/Karma specs  
**Target Platform**: Linux containers; browser kiosk clients  
**Project Type**: Full-stack web app (FastAPI + Angular)  
**Performance Goals**: Override save → kiosk visual update ≤5s (SC-001)  
**Constraints**: SSE broadcast model (no per-kiosk envelope today); live-event safety; Spanish admin UI; no `/display` calibration UI  
**Scale/Scope**: Tens of displays per org; sparse override rows (only explicit overrides stored)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass |
| Manifest update needed and planned | pass (CHG-045 entry in plan/tasks) |
| Context pack created/updated | pass |
| Contract update required before implementation | yes — deltas in `contracts/contract-deltas.md` |
| Tests planned for changed behavior | pass |
| Security and user-facing error exposure considered | pass — org-scoped RBAC; no internal paths in errors |
| Observability/audit impact considered | pass — optional audit event deferred; kiosk_connections link restored |
| No archived or superseded specs used without justification | pass — CHG-042 referenced only for device identity pattern |

**Post-design re-check**: pass (all NEEDS CLARIFICATION resolved in `research.md`)

## Project Structure

### Documentation for this change

```text
specs/changes/045-per-display-iframe-scale/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── alembic/versions/0024_per_display_iframe_scale.py
├── app/repositories/models/display_device.py          # new
├── app/repositories/models/iframe_display_scale_override.py  # new
├── app/repositories/display_devices.py                # new
├── app/repositories/iframe_display_scale_overrides.py # new
├── app/application/iframe_scale_resolver.py           # new
├── app/application/iframe_runtime.py                  # extend
├── app/services/iframe_service.py                     # extend
├── app/services/display_device_service.py             # new
├── app/api/iframes.py                                 # display-scales routes
├── app/api/display_devices.py                         # new admin router
├── app/api/display_stream.py                          # register upsert
└── app/api/schemas.py                                 # DTOs

frontend/
├── src/app/core/api/iframe.api.ts
├── src/app/core/api/display-device.api.ts               # new
├── src/app/features/iframes/iframe-list.component.ts
├── src/app/features/iframes/iframe-form.component.ts
├── src/app/features/iframes/iframe.facade.ts
├── src/app/display/display-stream.models.ts
├── src/app/display/display-stream.service.ts
├── src/app/display/display-screen.component.ts
├── src/app/display/display-viewer.controller.ts
├── src/app/display/iframe-scale.service.ts              # new resolver

docs/adr/0013-per-display-iframe-scale.md                # new
specs/contracts/**/contract.md                           # pre-impl update
specs/manifest.yml                                       # CHG-045 entry
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Restore slim `display_devices` + new `iframe_display_scale_overrides`.
2. Client-side effective scale resolution (SSE fanout unchanged).
3. `iframe_scale_updated` SSE for live override refresh.
4. Admin APIs: display-devices CRUD + iframe display-scales batch PUT.
5. Matrix UX: defaults pre-filled; only explicit saves create override rows.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

1. `specs/contracts/iframes-video-end/contract.md` — overrides, APIs, remove per-kiosk non-goal.
2. `specs/contracts/display-runtime/contract.md` — client resolution, `iframe_scale_updated`, register `displayDeviceId`.
3. `specs/contracts/display-config-session/contract.md` — `display_devices`, admin device APIs, FK on `kiosk_connections`.

### ADR

Create `docs/adr/0013-per-display-iframe-scale.md` documenting client-side resolution rationale and reversal of ADR-0012 per-kiosk non-goal.

## Phase 2: Task Planning Approach

Tasks will be grouped by user story:

| Story | Task focus |
|-------|------------|
| P1 — Per-display scale | Migration, models, resolver, register upsert, kiosk runtime resolution, SSE handler |
| P2 — Defaults fallback | Resolver tests; ensure no override row = iframe default; iframe PUT refresh |
| P3 — Admin iframe UX | List summary column, edit-form matrix, display-devices admin, batch PUT API |

**Test strategy**:

- Unit: `resolve_effective_scale(device, iframe, overrides)` edge cases.
- Integration: display-scales CRUD, register device upsert, cascade on iframe delete.
- Frontend: matrix save/clear, list summary, display-screen and display-viewer scale resolution per override.
- E2E manual: [quickstart.md](./quickstart.md).

**Implementation order**: migration → backend resolver + APIs → contract updates → frontend admin → kiosk runtime → ADR + manifest.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Reintroduce `display_devices` after CHG-044 removal | Stable identity for overrides across rename/reconnect | Label-string keys break FR-005a |
| New SSE event `iframe_scale_updated` | Targeted live refresh for one display | Reusing `show_iframe` alone does not signal scale-only changes clearly |

## Validation

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

Manual: `specs/changes/045-per-display-iframe-scale/quickstart.md`
