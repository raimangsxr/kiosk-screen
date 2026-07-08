# Context Pack: CHG-039 Independent Recurring Counters

## Task classification

- Type: behavior change to active contract
- Affected contracts: `CONTENT.ROTATION`
- Requires contract update: yes (before implementation)
- Current status: draft

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/changes/039-independent-recurring-counters/spec.md`
- `specs/contracts/content-rotation/contract.md`
- `specs/changes/039-independent-recurring-counters/plan.md`

## Optional context

Read only if the task touches the area:

- `specs/changes/007-content-rotation-modes/spec.md` (superseded recurring model)
- `specs/changes/014-display-screen-runtime/spec.md` (kiosk runtime)
- `specs/changes/027-public-content-novelty-rotation/spec.md` (novelty burst interaction)

## Do not read by default

- `specs/archive/**`
- Unrelated in-progress changes (019, 021, 025, 026) unless task overlaps
- Backend content service (no API/schema changes in this change)

## Code entrypoints

### Frontend (primary)

- `frontend/src/app/display/recurring-cadence.service.ts` — pure cadence math (rewrite)
- `frontend/src/app/display/recurring-cadence.service.spec.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts` — counter state + advance orchestration
- `frontend/src/app/display/kiosk-rotation.controller.spec.ts`
- `frontend/src/app/display/display-rotation.service.ts` — `pickNext` for regular/filler queues
- `frontend/src/app/display/display-fingerprint.ts` — cadence field already fingerprinted
- `frontend/src/app/features/content/content-form.component.ts` — cadence hint (verify only)

### Active contract (update before code)

- `specs/contracts/content-rotation/contract.md`

### Manifest

- `specs/manifest.yml` — add CHG-039 under `CONTENT.ROTATION.related_changes`

## Tests

Narrow first:

```sh
npm --prefix frontend run test -- --include='**/recurring-cadence.service.spec.ts'
npm --prefix frontend run test -- --include='**/kiosk-rotation.controller.spec.ts'
```

Broader:

```sh
npm --prefix frontend run test
npm --prefix frontend run build
```

Backend pytest unchanged (no backend behavior change).

## Implementation constraints

- No database migrations or API shape changes.
- Replace single `cadenceCounter` signal with per-item counter map owned by `KioskRotationController`.
- Preserve novelty burst freeze, pause freeze, mode-transition counter preservation, and `jump_to` semantics per spec.
- Cadence trigger changes from legacy `counter > N` (shared smallest-cadence picker) to `counter >= N` per item.
- Filler rotation applies only when no regular content exists and no item is due on the current tick.
