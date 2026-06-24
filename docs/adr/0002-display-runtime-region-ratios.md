# ADR-0002: Display runtime ratios come from polled configuration

## Status

Accepted

## Context

The kiosk display has a top content region and a sponsor ad band. Feature specs require the visual split to honor `topRegionRatio` and `bottomRegionRatio`, while the existing CSS contained hard-coded fractions that can drift from the backend configuration.

## Decision

The display runtime contract treats the polled configuration as the source of truth for top/ad region proportions. CSS may use stable defaults before the first poll, but the runtime must update layout variables from `DisplayState.configuration` once available.

## Consequences

- Admin configuration changes can affect the live display without redeploying the frontend.
- Responsive layout tests should assert concrete viewport/ratio outcomes.
- The active runtime contract, not historical specs, owns the current ratio behavior.
