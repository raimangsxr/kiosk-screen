# Implementation Plan: Admin Operations Dashboard

**Branch**: `040-admin-operations-dashboard` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/040-admin-operations-dashboard/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-040 entry to add at implementation)
- Active contracts read: `ADMIN.SHELL.NAVIGATION`, `READINESS.SETUP`, `DISPLAY.CONTROL`, `DISPLAY.EVENTS.AUDIT`, `CONTENT.ROTATION`
- Change specs read: `specs/changes/040-admin-operations-dashboard/spec.md`, `context-pack.md`
- Context pack read or created: `context-pack.md`
- ADRs read: none required
- Code entrypoints verified:
  - `frontend/src/app/features/dashboard/dashboard.component.ts`
  - `frontend/src/app/features/dashboard/dashboard.service.ts`
  - `frontend/src/app/features/readiness/readiness.component.ts`
  - `frontend/src/app/features/remote-control/remote-control.component.ts`
  - `backend/app/api/events.py`
- Tests identified:
  - `dashboard.service.spec.ts` (to migrate)
  - `readiness.component.spec.ts`
  - new `dashboard.facade.spec.ts`, section specs
- Archived or consolidated specs read: none

## Summary

Refactor `/admin` from a redundant section-navigation grid into an **operations
center**: live readiness + display status, actionable blockers, programmed
content queue, and recent audit activity. Frontend-only v1 composes four
existing APIs with per-section degradation. Legacy six-tile summary grid and
static quick actions are removed. Contract updates to `ADMIN.SHELL.NAVIGATION`
and `READINESS.SETUP` precede implementation.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | TypeScript / Angular 20 (frontend only) |
| **Dependencies** | Angular Material, existing admin primitives (`AdminPage`, `StatusChip`, `AdminStateComponent`) |
| **Storage** | None (read-only view models) |
| **Testing** | Jasmine/Karma unit tests |
| **Target** | Admin shell `/admin` route |
| **Performance** | Single parallel load on init; 4 HTTP requests (vs current 7) |
| **Constraints** | Spanish copy; no horizontal scroll; partial degrade per section |
| **Scope** | ~12 frontend files, 0 migrations, 0 new backend endpoints |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contract identified | pass — `ADMIN.SHELL.NAVIGATION`, `READINESS.SETUP` |
| Manifest update planned | pass — CHG-040 at implementation |
| Context pack present | pass |
| Contract update before implementation | yes — `contracts/dashboard-ui-behavior.md` |
| Tests for changed behavior | pass — facade + component + section specs |
| Security / error exposure | pass — read-only; existing auth on all endpoints |
| Observability / audit | pass — consumes audit feed; no new producers |
| No unjustified archive reads | pass |

## Project Structure

### Documentation for this change

```text
specs/changes/040-admin-operations-dashboard/
├── spec.md
├── context-pack.md
├── plan.md                    ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dashboard-ui-behavior.md
├── checklists/requirements.md
└── tasks.md                   ← /speckit-tasks
```

### Source code touched

```text
frontend/
  src/app/core/api/events.api.ts                    # NEW
  src/app/features/readiness/readiness-routes.ts    # NEW (extract)
  src/app/features/dashboard/
    dashboard.component.ts                          # rewrite layout
    dashboard.facade.ts                             # NEW orchestration
    dashboard.models.ts                             # NEW view models
    dashboard.facade.spec.ts                        # NEW
    dashboard.component.spec.ts                     # update
    sections/
      operations-hero.component.ts
      readiness-alerts.component.ts
      content-queue.component.ts
      activity-feed.component.ts
      contextual-actions.component.ts
  src/app/features/readiness/readiness.component.ts # use shared routes
  src/app/shared/admin-ui.models.ts                 # remove legacy dashboard types

specs/
  contracts/admin-shell-navigation/contract.md      # update before code
  contracts/readiness-setup/contract.md             # update before code
  manifest.yml                                        # add CHG-040
```

### Active contract update (before implementation)

Merge [contracts/dashboard-ui-behavior.md](./contracts/dashboard-ui-behavior.md) into active contracts per quickstart.

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Four existing endpoints; no aggregated BFF for v1.
2. Shared `resolveReadinessRoute` extracted from readiness page.
3. Reuse remote-control label semantics for live status.
4. Programmed queue only — no playback heartbeat.
5. Activity feed capped at 15 items; new `EventsApiService`.
6. Section-based components with facade fold + per-source degrade.
7. Load on init only; no background polling on v1.
8. `DashboardFacade.reloadLive()` supports hero section-level retry without full `load()`.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/dashboard-ui-behavior.md](./contracts/dashboard-ui-behavior.md), [quickstart.md](./quickstart.md).

### DashboardFacade fold pipeline

```text
forkJoin({
  readiness  → catchError → degraded
  live       → catchError → degraded  (RemoteControlApi.getState)
  content    → catchError → degraded  (ContentApi.list → activeContentCount stub in Phase 2; full queue in US4)
  activity   → catchError → degraded  (EventsApi.listRecent → take 15)  # stub empty until US3
})
  → derive pinned title from queue + live.pinnedContentId
  → derive contextualActions (after queue fold provides activeContentCount + entries)
  → OperationsDashboardState
```

### UI section map

| User story | Component | Key inputs |
|------------|-----------|------------|
| US1 Hero | `operations-hero` | `live`, `readiness.ready`, CTAs |
| US2 Alerts | `readiness-alerts` | `blockers`, `warnings` |
| US4 Queue | `content-queue` | `queue.entries`, `live.contentMode` |
| US3 Activity | `activity-feed` | `activity.items` |
| US5 Actions | `contextual-actions` | `contextualActions` |

### UX note: hero CTAs vs contextual actions (FR-002 / FR-009)

- **Operations hero** always exposes persistent primary links: Abrir display, Control remoto (FR-002).
- **Contextual actions** surface state-driven extras only (resolve first blocker, add content when queue empty, ejecutar comprobación when not ready). Intentional overlap on "Abrir display" is avoided — contextual bar does not duplicate hero links when already visible above the fold.

### Remote-control label reuse

Extract or duplicate (prefer extract to `shared/util/remote-control-labels.ts`):

- `modeLabel(mode)` → Rotación / Iframe / Fijo
- `adsLabel(visible)` → Visible / Ocultos
- `displayLabel(active)` → Display en línea / Display desconectado
- `relativeTime(iso)` → hace X min

## Phase 2: Task Planning Approach

Tasks will map to user stories:

| Story | Tasks |
|-------|-------|
| US1 P1 | Contract merge; events API; facade skeleton; operations-hero |
| US2 P1 | readiness-routes extract; readiness-alerts section |
| US5 P1 | Remove legacy grid; contextual-actions; update models |
| US3 P2 | activity-feed section |
| US4 P2 | content-queue section; pinned highlight |
| Cross | Facade degrade tests; component spec; AGENTS.md manifest; manual quickstart |

### Test strategy

- **Unit**: facade fold per degraded source; route resolver table; queue sort/labels; no legacy grid in component DOM
- **Integration**: HTTP testing controller for 4 endpoints in facade spec
- **Manual**: quickstart checklist (375px, blocker resolve, display online)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
