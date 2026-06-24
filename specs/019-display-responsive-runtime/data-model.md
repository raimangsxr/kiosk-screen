# Data Model: Display Responsive Runtime

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

This feature is scoped to presentation only. It does not introduce
new entities, tables, or contracts. The data model section
documents the entities that the CSS consumes from the existing
polled `DisplayState` and the derived orientation state.

## Consumed entities

### `DisplayKioskConfiguration`

- **Source**: `frontend/src/app/core/api/display.api.ts` (already
  defined; spec 002 FR-005).
- **Fields consumed by this feature**:
  - `topRegionRatio: number` (default `5`): the ratio numerator
    used to size the top region.
  - `bottomRegionRatio: number` (default `1`): the ratio
    denominator used to size the ad band.
- **Validation rules inherited from spec 002**:
  - Both ratios MUST be positive integers.
  - The CSS layer MUST default to `5 / 1` when the polled state
    is `null` or the values are missing.

### `OrientationState`

- **Source**: derived in the component via
  `matchMedia('(orientation: portrait)')`.
- **Fields**:
  - `value: 'landscape' | 'portrait'` — the current orientation.
  - `mediaQuery: MediaQueryList` — the underlying handle so the
    component can `addEventListener('change', ...)` and clean up
    in `ngOnDestroy`.

## Derived CSS contract

| Custom property | Source                | Default | Effect                            |
|-----------------|-----------------------|---------|-----------------------------------|
| `--top-ratio`   | `configuration.topRegionRatio` | `5`     | Numerator of the host grid rows. |
| `--bottom-ratio`| `configuration.bottomRegionRatio` | `1`     | Denominator of the host grid rows.|

The CSS layer MUST treat both properties as positive integers and
fall back to the defaults before the first polled state arrives.

## State transitions

```
                   ┌──────────────────────┐
                   │  Polled state null   │
                   └──────────┬───────────┘
                              │ poll resolves
                              ▼
                   ┌──────────────────────┐
                   │  Polled state ready  │
                   └──────────┬───────────┘
                              │ rotation event
                              ▼
                   ┌──────────────────────┐
                   │ Top region / ad band │
                   │ render with ratios   │
                   └──────────────────────┘

  In parallel, independent of the polled state:

                   ┌──────────────────────┐
                   │  Landscape (default) │
                   └──────────┬───────────┘
                              │ matchMedia 'change'
                              ▼
                   ┌──────────────────────┐
                   │      Portrait        │
                   │ (regions hidden,     │
                   │  prompt visible)     │
                   └──────────┬───────────┘
                              │ matchMedia 'change'
                              ▼
                   ┌──────────────────────┐
                   │  Landscape restored  │
                   └──────────────────────┘
```

## Validation rules

- `topRegionRatio` and `bottomRegionRatio` MUST be positive
  integers; the CSS clamps them with a minimum of 1 via
  `Math.max(1, value)` in the binding.
- Orientation MUST flip within one `matchMedia` event cycle
  after the device rotation; no polling involved.
- The polled state MUST continue to update while the orientation
  is portrait (no state pausing).

## Relationships

- The component template binds `--top-ratio` and `--bottom-ratio`
  from `state.configuration`.
- The orientation signal is local to the component and does not
  feed back to the controller or the backend.