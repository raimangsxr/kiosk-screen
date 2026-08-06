# Contract deltas: CHG-053

## DISPLAY.RUNTIME

- Photo and video blur-fill use one original foreground media element plus one bounded captured backdrop raster; no second original photo and no persistent full-screen CSS filter.
- Top preload accepts only the first announced candidate. Queue pruning, late completion, probe failure, iframe transition, and teardown preserve the visible-plus-one retention bound.
- Consecutive sponsor windows are equivalent without considering `commandId` when their visible IDs and presentation values match.
- SSE command effects track only their command signal; fallback activation and polling lifecycle are reactive.
- Reduced motion suppresses decorative backdrop and non-essential sponsor/content animation.

## Public/API surface

No HTTP, SSE payload, persistence, authorization, or backend contract changes.

