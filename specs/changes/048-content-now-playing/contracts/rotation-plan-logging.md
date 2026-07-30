# Rotation Plan Logging (CHG-048)

**Contract**: `CONTENT.ROTATION` observability extension  
**Level**: INFO (production)

## Purpose

Structured logs for every top-content orchestration decision so operators and engineers can audit showing / next / novelty queue state, including mid-cycle replanning when uploads arrive.

## Log events

### `rotation_plan`

Written immediately after each successful `emit_top_content` (or equivalent remote emit).

### `rotation_replan`

Written when `compute_rotation_plan_snapshot()` changes (next or novelties) while `showing` id unchanged — e.g. public upload during current slide.

---

## Payload schema (structured logging `extra`)

All keys camelCase for consistency with API JSON.

```json
{
  "event": "rotation_plan",
  "organizationId": "uuid",
  "operatorSessionId": "uuid",
  "reason": "rotation_advance",
  "showing": { "id": "uuid", "title": "Item 3" },
  "next": { "id": "uuid", "title": "Item 4" },
  "novelties": ["uuid"]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `event` | string | `rotation_plan` \| `rotation_replan` |
| `organizationId` | string | Org scope |
| `operatorSessionId` | string | Active display session |
| `reason` | string | Orchestrator reason (`rotation_advance`, `novelty`, `public_upload_replan`, `remote_jump`, …) |
| `showing` | object \| null | Current on-air content |
| `next` | object \| null | Planned next emit |
| `novelties` | string[] | Pending novelty ids in consume order |

`showing` / `next` objects: `{ "id": string, "title": string }`.

---

## Example sequence (user scenario)

```text
rotation_plan  showing=1 next=2 novelties=[]
rotation_plan  showing=2 next=3 novelties=[]
rotation_plan  showing=3 next=4 novelties=[]
rotation_replan showing=3 next=250 novelties=[250] reason=public_upload_replan
rotation_plan  showing=250 next=4 novelties=[]
```

---

## Rules

- Exactly one `rotation_plan` per `emit_top_content`.
- `rotation_replan` MAY follow inventory mutation hooks when snapshot changes and showing unchanged.
- No binary media, cookies, or operator PII in logs.
- Titles reflect DB at log time (may be stale if renamed later).

---

## Non-goals

- Admin UI log viewer
- Persisting logs to `display_events` audit table (v1)
