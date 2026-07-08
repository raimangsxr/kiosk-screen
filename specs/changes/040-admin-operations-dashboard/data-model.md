# Data Model: Admin Operations Dashboard (CHG-040)

**Date**: 2026-07-08  
**Scope**: Frontend view models composed from existing API responses. No database changes.

## OperationsDashboardState

Root state emitted by `DashboardFacade.load()`.

| Field | Type | Source | Degrade when |
|-------|------|--------|--------------|
| `readiness` | `ReadinessSlice \| degraded` | `/api/readiness` | readiness fails |
| `live` | `LiveStatusSlice \| degraded` | `/api/display/remote-control/state` | remote control fails |
| `queue` | `ContentQueueSlice \| degraded` | `/api/content` | content list fails |
| `activity` | `ActivityFeedSlice \| degraded` | `/api/events` | events fails |
| `contextualActions` | `ContextualAction[]` | derived | always computed from available slices |
| `degradedSections` | `string[]` | derived | Spanish labels for failed slices |

### ReadinessSlice

| Field | Type |
|-------|------|
| `ready` | `boolean` |
| `blockers` | `ReadinessAlert[]` |
| `warnings` | `ReadinessAlert[]` |

### ReadinessAlert

| Field | Type |
|-------|------|
| `message` | `string` |
| `resolveRoute` | `string` |

`resolveRoute` computed via `resolveReadinessRoute(message)`.

### LiveStatusSlice

| Field | Type |
|-------|------|
| `displaySessionActive` | `boolean` |
| `contentMode` | `'loop' \| 'iframe' \| 'fixed'` |
| `adsVisible` | `boolean` |
| `updatedAt` | `string` (ISO) |
| `pinnedContentId` | `string \| null` |
| `pinnedContentTitle` | `string \| null` |
| `pinnedContentUnresolved` | `boolean` |

`pinnedContentTitle` resolved from content queue slice or fixed options when mode is `fixed`. Set `pinnedContentUnresolved: true` when `selectedFixedContentId` is set but no matching active item exists (display **«Contenido no disponible»**).

### ContentQueueSlice

| Field | Type |
|-------|------|
| `entries` | `ContentQueueEntry[]` |
| `activeContentCount` | `number` |

`activeContentCount` is populated in Phase 2 (count of active, non-novelty items) so contextual actions can detect an empty queue before full `entries` are classified in US4.

### ContentQueueEntry

| Field | Type |
|-------|------|
| `id` | `string` |
| `title` | `string` |
| `displayOrder` | `number` |
| `kind` | `'regular' \| 'recurring' \| 'fixed-eligible'` |
| `recurringEveryXIterations` | `number \| null` |
| `isPinnedNow` | `boolean` |

**Derivation rules**:
- Include only `isActive === true` items.
- Exclude `isNovelty === true`.
- Sort ascending by `displayOrder`.
- `kind = recurring` when `recurringEveryXIterations` is a positive integer.
- `kind = fixed-eligible` when `isFixed === true` (may overlap recurring — recurring takes precedence if both set).
- `isPinnedNow` when `live.pinnedContentId === id`.

### ActivityFeedSlice

| Field | Type |
|-------|------|
| `items` | `ActivityFeedItem[]` |

### ActivityFeedItem

| Field | Type |
|-------|------|
| `id` | `string` |
| `eventType` | `string` |
| `severity` | `'info' \| 'warning' \| 'error'` (normalized from backend) |
| `message` | `string` |
| `createdAt` | `string` (ISO) |

Dashboard displays at most **15** items (newest first).

### ContextualAction

| Field | Type |
|-------|------|
| `label` | `string` (Spanish) |
| `route` | `string` |
| `icon` | `string` |
| `priority` | `'primary' \| 'secondary'` |

**Derivation (priority order)**:
1. First blocker → primary "Resolver: …" to `blockers[0].resolveRoute`
2. Display offline → primary "Abrir display" → `/display`
3. Empty active queue → secondary "Añadir contenido" → `/admin/content/new`
4. Always secondary "Control remoto" → `/admin/remote-control` when live slice available
5. Not ready → secondary "Ejecutar comprobación" → `/admin/readiness`

Cap visible actions at 4. **Do not** emit actions that duplicate persistent hero CTAs (Abrir display, Control remoto) when the hero is rendered.

## Removed models (legacy)

Delete from `admin-ui.models.ts` when unused elsewhere:

- `AdminSectionSummary` (dashboard-specific)
- `AdminQuickAction` usage from dashboard state (may remain on `AdminNavigationService` for other consumers — verify)
- `AdminDashboardState` fields: `sectionSummaries`, `quickActions` as primary dashboard shape

## API client addition

### EventsApiService (new)

```typescript
interface DisplayEvent {
  id: string;
  eventType: string;
  severity: string;
  message: string;
  createdAt: string;
}

listRecent(): Observable<DisplayEvent[]>  // GET /api/events
```

Maps to `ActivityFeedItem` in facade fold step.

## State transitions

```text
[loading] → forkJoin(all sources with catchError)
         → [ready] OperationsDashboardState
         → per-section degraded flags set; page never fully blank unless all four fail AND no cached state
```

No writable server state from dashboard (read-only operations view).
