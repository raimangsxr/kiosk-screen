# Quickstart: Admin Operations Dashboard (CHG-040)

**Branch**: `040-admin-operations-dashboard`

## Prerequisites

- Local lab running (`docs/dev/local-lab.md`)
- Admin credentials
- At least one active content item and ad for readiness-ready state

## Contract prep (before code)

1. Merge `contracts/dashboard-ui-behavior.md` into:
   - `specs/contracts/admin-shell-navigation/contract.md`
   - `specs/contracts/readiness-setup/contract.md`
2. Add CHG-040 entry to `specs/manifest.yml` (in-progress).

## Implementation order

1. `readiness-routes.ts` + spec (extract from readiness component)
2. `events.api.ts` + thin wrapper
3. `dashboard.models.ts`, `dashboard.facade.ts` + facade spec
4. Section components (hero → alerts → queue → activity → contextual actions)
5. `dashboard.component.ts` rewrite
6. Remove legacy fold methods from `dashboard.service.ts` (or replace service with facade)
7. Update `dashboard.service.spec.ts` → `dashboard.facade.spec.ts`

## Manual validation

### Operations summary

1. Login → `/admin`
2. Verify: readiness chip, display status, mode, ads, updated time
3. Open `/display` in another tab → return `/admin` → display shows online
4. Simulate live-source failure → hero shows **Reintentar** and recovers without full page reload
5. Fixed mode with deleted pin target → hero shows **«Contenido no disponible»**

### Actionable blockers

1. Disable display configuration or remove active content
2. `/admin` shows blocker with "Resolver" → lands on correct module

### Content queue

1. Create 3 content items with orders 1, 2, 3
2. `/admin` lists them in order with position labels
3. Set recurring on one item → label shows cadence

### Activity feed

1. Change remote-control mode
2. Refresh `/admin` → event appears in feed (max 15 items)

### Title truncation

1. Use a content item with a very long title
2. Queue row shows ellipsis; hero pinned title wraps without horizontal scroll at 375px

### Legacy removal

1. Confirm six section-summary tiles are gone
2. Confirm no static four-card quick-action grid

### Compact viewport

1. Resize to 375px width
2. No horizontal scroll; sections stack readable

## Automated validation

```sh
npm --prefix frontend run test -- --include='**/dashboard/**'
npm --prefix frontend run test -- --include='**/readiness/**'
npm --prefix frontend run build
```

## Out of scope smoke (should be unchanged)

- `/hall` routing
- `/admin/readiness` full page
- Kiosk `/display` rotation
- `GET /api/events` response shape
