# ADR-0004: Relax the kiosk region ratio contract

## Status

Accepted (will be upon consolidation of `CHG-020`)

## Context

The original kiosk configuration (CHG-002, consolidated into `DISPLAY.CONFIG_SESSION`) enforced the region split as exact-value CHECK constraints: `top_region_ratio = 4` and `bottom_region_ratio = 1`. This produced a 4:1 split that the responsive runtime (CHG-019, in-progress) consumes through the polled `DisplayState.configuration.topRegionRatio` / `bottomRegionRatio`.

Two problems forced the amendment:

1. **The exact-value CHECK blocks the polled-source-of-truth principle.** ADR-0002 already declares that "the runtime must update layout variables from `DisplayState.configuration` once available". With the CHECK locked at 4:1, the polled value is decorative — the database cannot carry any other value, so the operator cannot adjust the split through the admin form without a migration.
2. **The historical default 4:1 does not match the documented 5:1 intent.** The kiosk display spec (CHG-019 US1 AS1) describes a top region that is exactly 5/6 of the viewport and an ad band that is 1/6. The 4:1 default was an early implementation artefact, not a design decision.

The user also confirmed end-to-end configurability: the admin form at `/admin/configuration` should expose the two ratio inputs so the operator can change the split without redeploying the frontend.

## Decision

1. **Replace the exact-value CHECK constraints with positive-value CHECK constraints**: `top_region_ratio > 0` and `bottom_region_ratio > 0`. The CHECK enforces only the lower bound; the application layer enforces the upper bound.
2. **Default values become `top_region_ratio=5, bottom_region_ratio=1`**. The bootstrap service seeds these values for new organizations. Existing rows are backfilled to `5` in the Alembic migration (idempotent `UPDATE ... WHERE <> 5`).
3. **Cap the operator input at `[1, 20]`** at the schema layer (`KioskConfigurationRequest.ge=1, le=20`) and at the form layer (`Validators.min(1), Validators.max(20)`, `min="1"`, `max="20"`). Twenty covers every realistic split described in CHG-019 (up to 7:3) while preventing accidental absurd ratios (e.g., `topRegionRatio=1000`) that would push the smaller region under ~5% of the viewport and break legibility.
4. **The form lives in `CHG-020`** because the end-to-end configurability promise (US3 of CHG-019, "the operator can adjust the split from the admin configuration without redeploying the frontend") requires the form binding as part of the configurability contract. CHG-019 remains a CSS-layer refactor that consumes the polled ratios with mocked state in its own specs.

## Consequences

- **Polled-source-of-truth becomes real.** The operator can change the ratio end-to-end: form PUT → backend persists → polled state delivers new value → CSS layer (CHG-019) renders to the new proportion within one `remoteControlPollingSeconds` cadence.
- **Migration is required.** Existing rows in `kiosk_display_configurations` are migrated from `4` to `5` to keep the visual layout unchanged for operators who never edited the ratio.
- **Backwards-compatible PUT.** `KioskConfigurationRequest` declares the new fields with `default=5` and `default=1` so existing payloads that omit them continue to work (the `test_admin_readiness_api.py` integration test stays green).
- **Bounded risk.** The `[1, 20]` cap and the application-layer validation are the safety net; the DB CHECK only guards the lower bound because Alembic is the only DB-mutating path and the application always validates first.
- **Two contracts get updated.** `DISPLAY.CONFIG_SESSION` gains the configurable-ratio contract and the form-binding contract. `DISPLAY.RUNTIME` references this ADR to explain the `5/1` default and the `>= 1` defensive clamp in the CSS layer.
