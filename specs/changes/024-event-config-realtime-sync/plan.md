# Implementation Plan: Event Config Realtime Sync

**Branch**: `024-event-config-realtime-sync` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/changes/024-event-config-realtime-sync/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml`
- Active contracts read: `specs/contracts/event-branding/contract.md`, `specs/contracts/display-runtime/contract.md`
- Change specs read: `specs/changes/024-event-config-realtime-sync/spec.md`, `specs/changes/024-event-config-realtime-sync/context-pack.md`
- Reference implementation read: `frontend/src/app/core/display-control-sync.service.ts`
- ADRs read: `docs/adr/0001-token-aware-sdd-governance.md`

## Summary

Convert the ten branding layout fields in the admin Event configuration form from `<input type="number">` to Material sliders, auto-save the layout with a 400 ms debounce on slider movement, and notify a cross-tab BroadcastChannel so any open `/display` tab refreshes the branding overlay within ~1 s instead of waiting for the next 3-5 s polling cycle.

The technical approach is:

1. Mirror the existing `DisplayControlSyncService` pattern in a new `EventConfigSyncService`.
2. Replace number inputs with `MatSlider` + `matSliderThumb` inside the existing form group, keeping `formControlName` wiring.
3. Subscribe to `layout.valueChanges` with `debounceTime(400)` and `distinctUntilChanged`, calling a new `saveLayout()` facade method.
4. The facade emits `EventConfigSyncService.notifyEventConfigChanged()` on every successful save (auto or explicit).
5. The display component subscribes to `EventConfigSyncService.changes$` and calls `EventBrandingService.refresh()` on each notification.

## Technical Context

- **Language/Version**: TypeScript 5.8 (frontend only).
- **Primary Dependencies**: Angular 20, RxJS, Material 20. No new dependencies.
- **Storage**: N/A (state lives in the backend; this spec consumes it unchanged).
- **Testing**: Karma + Jasmine. New spec extends `frontend/src/app/features/event-config/event-config.component.spec.ts`.
- **Target Platform**: Chromium desktop and kiosk (same as existing CHG-019 / CHG-023 work).
- **Project Type**: web (frontend Angular SPA).
- **Performance Goals**: layout auto-save fires at most once per slider drag, debounced 400 ms; kiosk refresh latency ≤ 1 s end-to-end.
- **Constraints**: no backend changes, no new public APIs, no new dependencies.

## Constitution Check

- **Spec traceability**: spec.md lists 4 user stories, 10 FRs, 5 SCs.
- **Requirement clarity**: zero open ambiguities after the clarification round.
- **Plan alignment**: scope is admin form (layout sliders) + display sync (new subscription); backend untouched.
- **Simplicity**: one new service, one new facade method, two component changes, no new abstractions.
- **Contracts**: `EVENT.BRANDING` and `DISPLAY.RUNTIME` are updated with the live-update behavior and the new channel name.
- **Testing**: new spec file plus one extended spec cover SC-001..SC-005.
- **Security, observability, accessibility**: no changes; existing dirty-form guard and i18n extraction apply.
- **No speculative scope**: cross-machine live updates are out of scope (existing polling handles that path).
- **Conflict handling**: no supersession; CHG-024 extends the existing contracts additively.
- **Size budget**: spec.md ≤ 250 lines (current ~190), plan.md ≤ 300 lines (current ~80), tasks.md ≤ 400 lines (current ~140).

## Project Structure

### Documentation (this feature)

```text
specs/changes/024-event-config-realtime-sync/
├── spec.md
├── plan.md
├── tasks.md
└── context-pack.md
```

### Source Code

```text
frontend/src/app/
├── core/
│   └── event-config-sync.service.ts       (new)
├── features/event-config/
│   ├── event-config.component.ts          (touched — sliders + auto-save)
│   ├── event-config.facade.ts             (touched — saveLayout method)
│   └── event-config.component.spec.ts     (new)
└── display/
    └── display-screen.component.ts        (touched — sync subscription)
```

**Structure Decision**: this is a frontend-only, additive change. No new modules, no new routes, no backend changes.

## Implementation Order

1. Update contracts `EVENT.BRANDING` and `DISPLAY.RUNTIME` with the new behavior.
2. Create `EventConfigSyncService`.
3. Add `saveLayout()` to `EventConfigFacade` and wire it to the sync service.
4. Replace number inputs with `MatSlider` in `EventConfigComponent`.
5. Wire `valueChanges` → debounce → `saveLayout()` with auto-save status signal.
6. Subscribe to sync channel in `DisplayScreenComponent`.
7. Write tests; run `npm --prefix frontend run build` and `npm --prefix frontend run test`.

## Risk and Mitigation

- **Risk**: MatSlider `discrete` mode emits `valueChange` on every step; with `debounceTime(400)` the rapid intermediate values collapse to one save, but a slow drag with pauses could trigger multiple saves.
  **Mitigation**: `distinctUntilChanged` with a JSON fingerprint ensures only state-changing emissions trigger saves; the existing `form.pristine` flag suppresses the initial population burst.
- **Risk**: A cross-tab notification could fire during the operator's own slider drag, causing the display to refresh mid-iteration and possibly jumping the slider visually if the form is repopulated.
  **Mitigation**: the auto-save subscriber does NOT call `populate()` on the form; the form is left untouched so the operator's drag continues uninterrupted.
- **Risk**: The existing `DisplayControlSyncService` is in root; the new `EventConfigSyncService` could leak the same way if not handled.
  **Mitigation**: subscribe via `takeUntilDestroyed(destroyRef)`; service `OnDestroy` removes the `storage` listener and closes the `BroadcastChannel`.

## Out of Scope

- Cross-machine live updates (the kiosk machine and the admin browser are on different hosts); existing polling covers that path.
- Drag-and-drop position picker (still numeric per EVENT.BRANDING non-goals).
- Animations on layout change.
- Live preview overlay in the admin form (the operator uses the real display).