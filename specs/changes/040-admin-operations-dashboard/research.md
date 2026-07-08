# Research: Admin Operations Dashboard (CHG-040)

**Date**: 2026-07-08

## R1 — Data sources for v1 dashboard

**Decision**: Compose the dashboard from four existing authenticated endpoints with per-source degradation (same pattern as current `AdminDashboardService`).

| Section | Endpoint | Notes |
|---------|----------|-------|
| Readiness | `GET /api/readiness` | Blockers, warnings, `ready` |
| Live status | `GET /api/display/remote-control/state` | `displaySessionActive`, `contentMode`, `adsVisible`, `selectedFixedContentId`, `updatedAt` |
| Content queue | `GET /api/content` | Filter `isActive`; sort by `displayOrder`; exclude `isNovelty` from regular queue display |
| Activity feed | `GET /api/events` | Backend exists; **no frontend client yet** |

**Rationale**: Spec explicitly defers aggregated `operations-summary` endpoint. Current dashboard already uses `forkJoin` + `catchError` per source; preserve that reliability pattern.

**Alternatives considered**:
- Single new BFF endpoint — rejected for v1 (extra backend scope).
- `GET /api/display/state` for queue — rejected; admin content list includes admin fields and matches content module semantics.

---

## R2 — Blocker resolution routing

**Decision**: Extract `resolveReadinessRoute(message: string): string` from `ReadinessComponent` into a shared pure function (e.g. `frontend/src/app/features/readiness/readiness-routes.ts`) used by both readiness page and dashboard.

**Rationale**: Duplicated heuristics would drift; readiness page already maps English/Spanish blocker strings to routes.

**Alternatives considered**:
- Backend returns structured `{ code, route }` per blocker — rejected (backend change out of scope).

---

## R3 — Live status labels and fixed-mode pin

**Decision**: Reuse label logic from `RemoteControlComponent` (`modeLabel`, `adsLabel`, `displayLabel`, `relativeTime`) via shared helpers or thin dashboard computed signals fed by `RemoteControlState`.

**Rationale**: Operators already learn these labels on remote-control page; consistency reduces confusion.

**Alternatives considered**:
- Embed remote-control component in dashboard — rejected (too heavy, wrong interaction model).

---

## R4 — Content queue presentation

**Decision**: Show programmed queue only (no live slide index). Classify each active item:

| Kind | Rule |
|------|------|
| Regular | active, not novelty, no `recurringEveryXIterations` |
| Recurring | active, `recurringEveryXIterations` set |
| Fixed-eligible | `isFixed === true` |
| Novelty | `isNovelty === true` — **omit from queue list** (out of scope per spec) |

Highlight pinned item when `contentMode === 'fixed'` and `selectedFixedContentId` matches.

**Rationale**: Matches `CONTENT.ROTATION` queue semantics without kiosk heartbeat.

**Alternatives considered**:
- Show novelty pending count — deferred (novelty multi-kiosk change separate).

---

## R5 — Activity feed bounds and empty states

**Decision**: Request `GET /api/events` (default backend limit 50); display **newest 15** on dashboard. Map `severity` to `StatusChip` kinds. Show section-level empty and error states without failing the page.

**Rationale**: Backend `list_recent` already caps at 50; dashboard needs bounded DOM.

**Alternatives considered**:
- Pagination on dashboard — rejected (non-goal: full audit browser).

---

## R6 — Component architecture

**Decision**: Refactor `features/dashboard/` to:

```
dashboard/
  dashboard.component.ts          # layout shell
  dashboard.facade.ts             # forkJoin load + section degrade
  dashboard.models.ts             # OperationsDashboardState
  readiness-routes.ts             # shared with readiness (moved)
  sections/
    operations-hero.component.ts
    readiness-alerts.component.ts
    activity-feed.component.ts
    content-queue.component.ts
    contextual-actions.component.ts
```

Remove legacy `sectionSummaries` / six-tile grid from models and service fold logic.

**Rationale**: Aligns with CHG-035 primitives (`AdminPage`, `StatusChip`, `AdminStateComponent`); keeps dashboard testable per section.

**Alternatives considered**:
- Single monolithic template — rejected (harder to test, violates section degrade clarity).

---

## R7 — Refresh and polling

**Decision**: Load on `ngOnInit`; expose refresh via `AdminPage` refresh action (if present) or hero retry controls. **No** background polling on v1.

**Rationale**: Spec does not require live auto-refresh; remote-control page loads once on init. Operators can navigate away and back or use browser refresh. Polling can be a follow-up if operators request it.

**Alternatives considered**:
- Poll remote control every `remoteControlPollingSeconds` while dashboard mounted — deferred (complexity, battery on mobile admin).

---

## R8 — Contract and manifest updates

**Decision**: Before implementation, update:

1. `specs/contracts/admin-shell-navigation/contract.md` — new dashboard sections, removal of section-summary grid.
2. `specs/contracts/readiness-setup/contract.md` — dashboard lists blockers with resolve navigation (mirror readiness page).

Delta captured in `contracts/dashboard-ui-behavior.md`.

**Rationale**: Constitution principle IV — user-visible admin behavior change.

---

## R9 — Testing strategy

**Decision**:

| Layer | Coverage |
|-------|----------|
| `dashboard.facade.spec.ts` | Per-source degrade, state fold, contextual actions |
| `dashboard.component.spec.ts` | Section render, no legacy grid |
| `readiness-routes.spec.ts` | Route resolution table |
| Section specs | Hero labels, activity empty/error, queue order |

Manual: 375px viewport scroll check, blocked readiness one-click resolve.

**Rationale**: Constitution principle VI; mirrors existing dashboard.service.spec patterns.
