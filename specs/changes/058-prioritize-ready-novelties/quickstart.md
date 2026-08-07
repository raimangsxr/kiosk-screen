# Quickstart validation: Priorizar novedades descargadas

## Automated validation

```sh
pytest backend/tests/unit/test_novelty_defer_advance.py backend/tests/unit/test_rotation_plan_snapshot.py
```

Validation completed 2026-08-07:

- Focused modules: `13 passed in 2.17s`.
- Full backend suite: `387 passed, 5 skipped, 1 warning in 236.56s`.
- The warning is an existing AnyIO deprecation warning for HTTP 422 naming in `test_iframe_display_scales_api.py`.

## Core sequence

1. Configure regular content 1–5 and start loop mode on 1.
2. Add novelty content 6, 7, and 8.
3. Mark all three ready for every connected kiosk.
4. Advance five boundaries.
5. Expected visible sequence after 1: `6, 7, 8, 2, 3`.

## Blocked FIFO head

1. Add novelties 6 and 7 in that order.
2. Leave 6 not ready; mark 7 ready.
3. Advance once.
4. Expected: regular 2 emits, 6 defer count increments, and 7 remains pending behind 6.
