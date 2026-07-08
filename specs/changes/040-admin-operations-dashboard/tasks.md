---
description: "Task list for CHG-040 admin operations dashboard"
---

# Tasks: Admin Operations Dashboard

**Input**: Design documents from `/specs/changes/040-admin-operations-dashboard/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/dashboard-ui-behavior.md`

**Tests**: Mandatory per TQ-003 — facade, route resolver, and component specs included.

**Organization**: Tasks grouped by user story (US1–US5). Contract update blocks implementation (Constitution IV).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Frontend dashboard: `frontend/src/app/features/dashboard/`
- Readiness routes: `frontend/src/app/features/readiness/`
- Contracts: `specs/contracts/admin-shell-navigation/contract.md`, `specs/contracts/readiness-setup/contract.md`
- Change: `specs/changes/040-admin-operations-dashboard/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Update active contracts and manifest before code changes (TQ-001, TQ-004).

**⚠️ CRITICAL**: No implementation phases below until this phase is complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/040-admin-operations-dashboard/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/dashboard-ui-behavior.md}`.
- [x] T002 Merge `specs/changes/040-admin-operations-dashboard/contracts/dashboard-ui-behavior.md` into `specs/contracts/admin-shell-navigation/contract.md`: operations-center purpose, four dashboard sections, removal of legacy section-summary grid and static quick-action grid, partial degradation, Spanish copy.
- [x] T003 Merge dashboard readiness surfacing bullets from `specs/changes/040-admin-operations-dashboard/contracts/dashboard-ui-behavior.md` into `specs/contracts/readiness-setup/contract.md`.
- [x] T004 Add `CHG-040` to `specs/manifest.yml`: append under `ADMIN.SHELL.NAVIGATION.related_changes` and `READINESS.SETUP.related_changes`; add `changes:` entry with `id: CHG-040`, `path: specs/changes/040-admin-operations-dashboard/spec.md`, `status: in-progress`, `modifies: [ADMIN.SHELL.NAVIGATION, READINESS.SETUP]`, `read_by_default: true`.
- [x] T005 Verify `status: in-progress` in `specs/changes/040-admin-operations-dashboard/spec.md` frontmatter (set during spec/plan iteration).

---

## Phase 2: Foundational — Shared dashboard infrastructure (blocking)

**Purpose**: API client, shared utilities, view models, and facade skeleton used by all user stories.

**Independent Test**: `readiness-routes.spec.ts` passes; `events.api` returns typed list; `dashboard.facade.spec.ts` folds readiness + live slices with per-source degrade.

- [x] T006 [P] Create `frontend/src/app/core/api/events.api.ts` with `DisplayEvent` interface and `listRecent(): Observable<DisplayEvent[]>` calling `GET /api/events` with credentials.
- [x] T007 [P] Create `frontend/src/app/features/readiness/readiness-routes.ts` exporting `resolveReadinessRoute(message: string): string` (extract logic from `frontend/src/app/features/readiness/readiness.component.ts`).
- [x] T008 [P] Create `frontend/src/app/features/readiness/readiness-routes.spec.ts` covering blocker/warning message → route mappings (content, ads, configuration, event, users, default).
- [x] T009 [P] Create `frontend/src/app/shared/util/remote-control-labels.ts` with `modeLabel`, `adsLabel`, `displayLabel`, `relativeTime` helpers (Spanish copy; extract from `frontend/src/app/features/remote-control/remote-control.component.ts`).
- [x] T010 [P] Create `frontend/src/app/features/dashboard/dashboard.models.ts` with `OperationsDashboardState`, slice types, and `ContentQueueEntry` per `specs/changes/040-admin-operations-dashboard/data-model.md`.
- [x] T011 Create `frontend/src/app/features/dashboard/dashboard.facade.ts` with `load(): Observable<OperationsDashboardState>` using `forkJoin` + per-source `catchError` for readiness (`ReadinessApiService`), live (`RemoteControlApi.getState`), and content (`ContentApiService.list()` → fold `queue.activeContentCount` only, exclude `isNovelty`); stub empty `queue.entries` and activity slice; defer `contextualActions` until T027.
- [x] T012 Create `frontend/src/app/features/dashboard/dashboard.facade.spec.ts`: happy path (readiness + live + content count OK); readiness-only degrade; live-only degrade; content-only degrade; verify `degradedSections` labels in Spanish.
- [x] T013 Refactor `frontend/src/app/features/readiness/readiness.component.ts` to import `resolveReadinessRoute` from `frontend/src/app/features/readiness/readiness-routes.ts` instead of inline method.
- [x] T014 Run `npm --prefix frontend run test -- --include='**/readiness-routes.spec.ts' --include='**/dashboard.facade.spec.ts'`.

---

## Phase 3: User Story 1 — Operational status at a glance (Priority: P1) 🎯 MVP

**Goal**: Prominent operations summary with readiness, display online/mode/ads, last updated, and CTAs to display and remote control.

**Independent Test**: With readiness ready and active display in rotation with ads visible, `/admin` shows all summary fields without visiting remote-control page.

- [x] T015 [US1] Create `frontend/src/app/features/dashboard/sections/operations-hero.component.ts`: inputs for `readiness` slice and `live` slice; render `StatusChip` for readiness; display mode/ads/online labels via `remote-control-labels.ts`; show `relativeTime(updatedAt)`; show **«Contenido no disponible»** when `pinnedContentUnresolved`; pinned title wraps up to two lines (`line-clamp`); primary links to `/display` and `/admin/remote-control`; when live slice is degraded, show `AdminStateComponent` with section-level **Reintentar** that emits `retryLive` (parent re-fetches live slice only).
- [x] T016 [US1] Extend `frontend/src/app/features/dashboard/dashboard.facade.ts` live fold: set `pinnedContentUnresolved` when `contentMode === 'fixed'` and `selectedFixedContentId` has no matching active item; resolve `pinnedContentTitle` when match exists (full title lookup completed in T041).
- [x] T017 [US1] Rewrite `frontend/src/app/features/dashboard/dashboard.component.ts` template: **remove legacy section-summary grid and static quick-action cards entirely**; render `app-admin-page` + `operations-hero` only; wire facade `load()` on init; handle `retryLive` by re-invoking facade live slice fetch; section-level error via `AdminStateComponent` only when all slices fail.
- [x] T018 [P] [US1] Add `frontend/src/app/features/dashboard/sections/operations-hero.component.spec.ts`: ready + online rotation + ads visible renders expected Spanish labels; degraded live shows Reintentar; unresolved pinned shows «Contenido no disponible».
- [x] T019 [US1] Update `frontend/src/app/features/dashboard/dashboard.component.spec.ts`: assert operations hero present; assert legacy `dashboard__grid` / section-summary tiles absent.
- [x] T020 [US1] Run `npm --prefix frontend run test -- --include='**/dashboard/**'`.

---

## Phase 4: User Story 2 — Actionable readiness blockers (Priority: P1)

**Goal**: Blockers and warnings listed with Resolver/Revisar navigation matching readiness page semantics.

**Independent Test**: Missing active content blocker on `/admin` links to `/admin/content` in one click.

- [x] T021 [US2] Create `frontend/src/app/features/dashboard/sections/readiness-alerts.component.ts`: list blockers with primary stroked buttons linking to `resolveRoute`; list warnings separately; hide section when ready with no warnings.
- [x] T022 [US2] Extend `frontend/src/app/features/dashboard/dashboard.facade.ts` readiness fold: map blockers/warnings to `ReadinessAlert[]` with `resolveRoute` via `resolveReadinessRoute`.
- [x] T023 [P] [US2] Add `frontend/src/app/features/dashboard/sections/readiness-alerts.component.spec.ts`: blocker renders Resolver link with correct `routerLink`.
- [x] T024 [US2] Wire `readiness-alerts` into `frontend/src/app/features/dashboard/dashboard.component.ts` below operations hero; show degraded `AdminStateComponent` when readiness slice failed.
- [x] T025 [US2] Run `npm --prefix frontend run test -- --include='**/readiness-alerts.component.spec.ts' --include='**/dashboard.facade.spec.ts'`.

---

## Phase 5: User Story 5 — Remove redundant navigation chrome (Priority: P1)

**Goal**: Legacy service/models removed; contextual-actions shell ready (derivation wired after queue fold in Phase 7).

**Independent Test**: `/admin` does not render section-summary tiles; `dashboard.service` legacy fold removed.

- [x] T026 [US5] Create `frontend/src/app/features/dashboard/sections/contextual-actions.component.ts`: render up to 4 action buttons from `contextualActions` input (primary/secondary styling); omit actions that duplicate hero CTAs (Abrir display, Control remoto).
- [x] T028 [US5] Remove legacy fold methods and `sectionSummaries` / `quickActions` from `frontend/src/app/features/dashboard/dashboard.service.ts`; re-export facade from `frontend/src/app/features/dashboard/dashboard.facade.ts` or replace service with facade injection in component.
- [x] T029 [US5] Clean `frontend/src/app/shared/admin-ui.models.ts`: remove or deprecate `AdminSectionSummary`, legacy `AdminDashboardState` fields if unused elsewhere; grep repo for `sectionSummaries` and update consumers.
- [x] T030 [US5] Delete or rewrite `frontend/src/app/features/dashboard/dashboard.service.spec.ts` → extend `dashboard.facade.spec.ts`; assert no six-tile grid in `dashboard.component.spec.ts`.

---

## Phase 6: User Story 3 — Recent operational activity (Priority: P2)

**Goal**: Bounded recent audit events on dashboard with severity, timestamp, empty and error states.

**Independent Test**: After remote-control mode change, refresh `/admin` shows event in activity section.

- [x] T032 [US3] Extend `frontend/src/app/features/dashboard/dashboard.facade.ts` activity fold: call `EventsApiService.listRecent()`, map to `ActivityFeedItem[]`, take newest 15, `catchError` → degraded slice.
- [x] T033 [US3] Create `frontend/src/app/features/dashboard/sections/activity-feed.component.ts`: list items with severity chip, message (ellipsis truncation), relative time; `AdminStateComponent` for empty and error.
- [x] T034 [P] [US3] Add `frontend/src/app/features/dashboard/sections/activity-feed.component.spec.ts`: empty state; error state; renders 2 mock items newest-first.
- [x] T035 [US3] Extend `frontend/src/app/features/dashboard/dashboard.facade.spec.ts` with activity HTTP mock (success, 500 degrade).
- [x] T036 [US3] Wire `activity-feed` into `frontend/src/app/features/dashboard/dashboard.component.ts`.

---

## Phase 7: User Story 4 — Content rotation queue context (Priority: P2)

**Goal**: Active top content in displayOrder with regular/recurring/fixed-eligible labels; pinned highlight; contextual actions derived and wired.

**Independent Test**: Three active items with orders 1–3 appear in order; recurring item shows cadence label; fixed mode highlights pinned id; blocked readiness shows contextual primary action.

- [x] T037 [US4] Extend `frontend/src/app/features/dashboard/dashboard.facade.ts` queue fold: build full `entries` from content list (filter `isActive`, exclude `isNovelty`, sort `displayOrder`, classify `kind`, set `isPinnedNow`); complete `pinnedContentTitle` / `pinnedContentUnresolved` resolution in live slice.
- [x] T027 [US4] Implement `deriveContextualActions()` in `frontend/src/app/features/dashboard/dashboard.facade.ts` per `data-model.md` using `queue.activeContentCount` and readiness/live slices (first blocker primary, empty queue → add content, not-ready → comprobación; no duplicate hero CTAs).
- [x] T031 [US4] Wire `contextual-actions` into `frontend/src/app/features/dashboard/dashboard.component.ts` between hero and downstream sections; extend `dashboard.facade.spec.ts` for contextual action derivation cases.
- [x] T038 [US4] Create `frontend/src/app/features/dashboard/sections/content-queue.component.ts`: ordered list with position index, title (ellipsis truncation), kind badges (Regular / Recurrente cada N / Fijo elegible), pinned highlight class.
- [x] T039 [P] [US4] Add `frontend/src/app/features/dashboard/sections/content-queue.component.spec.ts`: sort order; recurring label; pinned row highlighted; long title ellipsis.
- [x] T040 [US4] Extend `frontend/src/app/features/dashboard/dashboard.facade.spec.ts` with content list mock (regular + recurring + fixed-eligible classification; unresolved pinned id).
- [x] T041 [US4] Wire `content-queue` into `frontend/src/app/features/dashboard/dashboard.component.ts`; sync `operations-hero` pinned title when queue loads.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Responsive layout, refresh, validation, governance closure.

- [x] T042 Add page-level refresh action to `frontend/src/app/features/dashboard/dashboard.component.ts` (reload full facade on user trigger); verify compact viewport styles in section components (no horizontal scroll at 375px).
- [x] T043 [P] Refactor `frontend/src/app/features/remote-control/remote-control.component.ts` to use `frontend/src/app/shared/util/remote-control-labels.ts` instead of duplicated computed label strings.
- [x] T047 [P] Audit Spanish copy: grep `frontend/src/app/features/dashboard/sections/` and hero for English operator strings; fix any leaks (FR-011).
- [x] T044 Run full dashboard validation per `specs/changes/040-admin-operations-dashboard/quickstart.md` (manual checklist: hero, live retry, blocker resolve, unresolved pinned, queue order, activity, legacy removal, 375px, title truncation).
- [x] T045 Run `npm --prefix frontend run test -- --include='**/dashboard/**'` and `npm --prefix frontend run build`.
- [x] T046 Update `specs/changes/040-admin-operations-dashboard/checklists/requirements.md` with validation evidence; set `status: implemented` in `specs/changes/040-admin-operations-dashboard/spec.md` and manifest when accepted.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005) ──blocks──► Phase 2 (T006–T014)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              Phase 3 US1       Phase 4 US2       Phase 5 US5
              (T015–T020)       (T021–T025)       (T026,T028–T030)
                    │                 │                 │
                    └────────┬────────┴────────┬────────┘
                             ▼                 ▼
                       Phase 6 US3       Phase 7 US4
                       (T032–T036)       (T037,T027,T031,T038–T041)
                             │                 │
                             └────────┬────────┘
                                      ▼
                               Phase 8 (T042–T047)
```

**Story dependencies**:

- US1 removes legacy grid in T017 (FR-008); do not defer removal to a later phase.
- US2 and US5 (legacy service cleanup) can proceed in parallel after Phase 2.
- `deriveContextualActions` (T027) runs after full queue fold (T037) so empty-queue uses accurate `activeContentCount` and entries.
- US3 and US4 are independent except T031 (contextual actions) depends on T027.
- US4 completes pinned title resolution for US1 hero (T016 + T041).

## Parallel Execution Examples

**After Phase 2 completes**:

```text
Parallel batch A: T015 operations-hero + T021 readiness-alerts + T026 contextual-actions
Parallel batch B: T018 hero spec + T023 alerts spec + T034 activity spec (after respective components exist)
```

**Phase 6 + 7 in parallel** (different section files):

```text
T032–T036 (US3 activity) ∥ T037–T041 (US4 queue)
```

## Implementation Strategy

### MVP (operational dashboard without activity/queue sections)

1. Complete Phase 1 + Phase 2.
2. Complete Phase 3 (T015–T020) — **includes legacy grid removal (FR-008)**.
3. Complete Phase 4 (T021–T025) + Phase 5 (T026, T028–T030).
4. **STOP and validate**: hero, readiness alerts, no legacy grid, legacy service removed. Contextual actions ship with Phase 7 (T027, T031).

### Recommended incremental delivery

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 — **core operations dashboard (FR-001–FR-004, FR-008–FR-010)**
2. Phase 6 (US3) + Phase 7 (US4) — activity feed, content queue, contextual actions (FR-005–FR-007, FR-009)
3. Phase 8 — polish and sign-off

## Task Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 47 |
| **Phase 1 (governance)** | 5 |
| **Phase 2 (foundational)** | 9 |
| **US1** | 6 |
| **US2** | 5 |
| **US5** | 4 |
| **US3** | 5 |
| **US4** | 7 |
| **Polish** | 6 |
| **Parallel opportunities** | T006–T010, T018/T023/T034/T039/T047, Phase 6 ∥ Phase 7 (after T037) |

**Suggested MVP scope**: T001–T030 — hero, alerts, legacy removal, no activity/queue/contextual actions yet.

**Independent test criteria**:

| Story | Test |
|-------|------|
| US1 | Ready + online rotation + ads visible; live retry; unresolved pinned label |
| US2 | Blocker links to correct resolve route in one click |
| US3 | Recent remote-control event appears after refresh (max 15 items) |
| US4 | Content in displayOrder; contextual action for first blocker |
| US5 | No six-tile grid; legacy service removed |
