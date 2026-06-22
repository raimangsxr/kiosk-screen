# Data Model: Display Control Rotation Tests

**Branch**: `020-display-control-rotation-tests` | **Date**: 2026-06-22

This spec adds no new tables or columns. It tests the existing 018
schema and adds one client-side trigger (FR-001).

## Existing schema (unchanged)

The 018 schema is documented in
`specs/018-content-rotation-modes/data-model.md`. Read that file
for the canonical shape of:

- `top_content_items.recurring_every_x_iterations`,
  `top_content_items.is_fixed`, both CHECK constraints.
- `display_control_states.selected_fixed_content_id`, widened
  `content_mode` CHECK, new `ck_display_control_fixed_has_target`.

## Client-side trigger (FR-001)

When the content queue transitions from non-empty to empty, the
`KioskRotationController` schedules a debounced (60 s) HTTP POST:

```
POST /api/display/rotation-event
Content-Type: application/json
Cookie: <operator-session-token>

{
  "eventType": "content_rotation_empty",
  "payload": { "reason": "queue_empty" }
}
```

The audit event lands in `display_events` with
`event_type="content_rotation_empty"`, `severity="warning"`,
`entity_type="display_control"`.

The debounce window (60 s) is client-side; the kiosk suppresses
additional POSTs within the window. The server's
`POST /api/display/rotation-event` endpoint
(`specs/019-display-control-canonical/contracts/audit-display-events.md`)
validates the body and emits the audit event.

## Service-layer helper (FR-003)

`frontend/src/app/display/display-rotation.service.ts` gains a new
pure helper:

```typescript
pickRecurringInsertion(
  regularQueue: DisplayContentItem[],
  recurringItems: DisplayContentItem[],
  cadenceCounter: number,
): { regularNext: DisplayContentItem | null; recurringNext: DisplayContentItem | null }
```

The helper is pure: no signals, no `effect()`, no timer. The
controller calls it once per advance and applies the result. The
controller's existing cadence logic moves verbatim into the
helper; the controller keeps only the signal and the freeze/resume
logic.

## Cross-references

- 018 data model: `specs/018-content-rotation-modes/data-model.md`.
- 019 audit events: `specs/019-display-control-canonical/contracts/audit-display-events.md`.