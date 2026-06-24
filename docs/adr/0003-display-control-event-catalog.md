# ADR-0003: Display control and audit event catalog is explicit

## Status

Accepted

## Context

Remote control, content rotation, API keys, and public uploads emit operational events. Stale or undocumented event types make audit behavior hard to verify.

## Decision

`DISPLAY.EVENTS.AUDIT` owns the current audit event contract. New producers must update that active contract before emitting new event types. Change specs may propose additions, but the event catalog becomes normative only after consolidation.

## Consequences

- Event names are traceable and testable.
- `/speckit.analyze` can detect producers that lack contract coverage.
- Display control changes must consider observability alongside behavior.
