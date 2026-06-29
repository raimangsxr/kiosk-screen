# Context Pack: CHG-024 Event Config Realtime Sync

## Task classification

- Type: change to existing contracts (admin form + display sync)
- Affected contracts: `EVENT.BRANDING`, `DISPLAY.RUNTIME`
- Requires contract update: yes
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/event-branding/contract.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/changes/024-event-config-realtime-sync/spec.md`

## Optional context

Read only if the task explicitly touches the area:

- `specs/contracts/display-control/contract.md` (reference for the BroadcastChannel pattern)
- `docs/adr/0003-display-control-event-catalog.md`
- `frontend/src/app/core/display-control-sync.service.ts` (template for the new service)
- `frontend/src/app/features/display-config/display-config.facade.ts` (template for the facade integration)

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `frontend/src/app/features/event-config/event-config.component.ts`
- `frontend/src/app/features/event-config/event-config.facade.ts`
- `frontend/src/app/core/event-branding.service.ts`
- `frontend/src/app/core/api/event-config.api.ts`
- `frontend/src/app/core/api/event-branding.api.ts`
- `frontend/src/app/core/display-control-sync.service.ts` (template)
- `frontend/src/app/display/display-screen.component.ts`

## New files

- `frontend/src/app/core/event-config-sync.service.ts`
- `frontend/src/app/features/event-config/event-config.component.spec.ts`

## Tests

- `npm --prefix frontend run test`
- Narrow specs first when possible:
  - `frontend/src/app/features/event-config/event-config.component.spec.ts` (new)
  - `frontend/src/app/display/display-screen.component.spec.ts` (extend)

## Implementation constraints

- Reuse the existing `EventBrandingService.refresh()` API on the display side; do not introduce a parallel refresh path.
- Use `MatSliderModule` from `@angular/material/slider` (already in dependencies).
- Match the BroadcastChannel + localStorage pattern from `DisplayControlSyncService` to keep the cross-tab mechanism consistent.
- Use `takeUntilDestroyed(destroyRef)` for all new RxJS subscriptions; do not introduce new lifecycle methods on the display component.
- Auto-save debounce window: 400 ms (matches the typical "drag-stopped" UX window).
- Keep the explicit Save button for non-layout fields; do not auto-save the logo file or the remove-logo checkbox.
- Do not modify backend code; the existing `PUT /event-configuration` and `GET /event-branding` endpoints are reused.