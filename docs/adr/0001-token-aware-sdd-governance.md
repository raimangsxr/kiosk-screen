# ADR-0001: Contract-centric, token-aware SDD governance

## Status

Accepted

## Context

The project accumulated many feature specs in a flat `specs/NNN-*` structure. That preserved history but forced agents to discover context by reading too many files, increasing token cost and the risk of following stale requirements.

## Decision

Use `specs/manifest.yml` as the SDD entrypoint, active contracts under `specs/contracts/**/contract.md` as the source of truth, and incremental change specs under `specs/changes/**` as historical or in-progress records. Every active change gets a `context-pack.md` that limits mandatory context.

## Consequences

- Agents read less documentation by default.
- Current behavior is easier to locate.
- Historical specs are preserved but not treated as normative after consolidation.
- Future SDD changes must maintain the manifest and affected contracts.
