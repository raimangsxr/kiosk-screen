# Research: CHG-056 Novelty Defer Rotation

**Date**: 2026-08-07

## R1 — Where defer decisions live

**Decision**: Server orchestrator (`advance_loop_top`) owns defer vs emit vs discard. Kiosks no longer gate novelties locally.

**Rationale**: FR-011/FR-012 require synchronized emission across displays; per-kiosk defer (CHG-050 gate) caused unpredictable holds and `media_error` skips. Clarifications confirm all connected kiosks must agree on readiness before emit.

**Alternatives considered**:

- Client-only defer without server state — rejected; multi-kiosk desync and cursor drift.
- Server blocks timer until ready (CHG-050 rejected pattern) — rejected; freezes rotation for all.

---

## R2 — Kiosk readiness signal

**Decision**: New kiosk event type `novelty_preload_ready` on existing `POST /api/display/kiosk/events` with `{ type, kioskId, contentId }`. Posted once per novelty when `DisplayMediaCacheService.ensureReady()` succeeds (idempotent server-side).

**Rationale**: Server must aggregate readiness without blocking on slowest kiosk at emit time; disconnected kiosks excluded from connected set (clarification Q3).

**Alternatives considered**:

- Reuse `media_error` inverted semantics — confusing; rejected.
- Server polls kiosk HTTP — no existing channel; rejected.

---

## R3 — Orchestrator Redis state extensions

**Decision**: Extend orchestrator state JSON:

| Field | Type | Purpose |
|-------|------|---------|
| `noveltyDeferCounts` | `Record<contentId, int>` | Aplazamientos por novedad |
| `noveltyReadyKiosks` | `Record<contentId, string[]>` | kioskIds que confirmaron descarga |
| `rescheduledRegularContentId` | `string \| null` | Ítem regular a emitir tras novedad |

Prune entries when novelty consumed/discarded or no longer in eligible queue.

**Rationale**: FR-004a reprogramación; FR-005 contador independiente; FR-012 agregación multi-quiosco.

**Alternatives considered**:

- PostgreSQL table — overkill for ephemeral session state; rejected.

---

## R4 — Advance algorithm (loop top)

**Decision**: At each `advance_loop_top` in loop mode (ordered checks):

1. If `rescheduledRegularContentId` set → emit that regular item (update cursor), clear field, return.
2. If head novelty exists:
   - If `is_novelty_ready(all_connected_kiosks)` → compute displaced regular (`_pick_next_regular` without advancing cursor), emit novelty, set `rescheduledRegularContentId`, `consume_novelty` on emit, clear defer/ready maps for that id.
   - Else if `deferCount >= maxDefer` → `consume_novelty` (discard), prune maps, fall through to regular path (no emit novelty).
   - Else → increment `deferCount`, fall through to regular path (emit next regular/recurring as today).
3. Else existing recurring / regular / filler logic unchanged.

`maxDefer` from `configuration.novelty_max_defer_transitions` (default 3).

**Rationale**: Matches illustrative example (1→2→3 defer, then 6 replaces 4, then 4 rescheduled).

**Alternatives considered**:

- Defer without advancing regular cursor — breaks visible rotation sequence; rejected.

---

## R5 — Client gate bypass for novelties

**Decision**: `DisplayContentGateService.enqueueShowContent`: if `payload.reason === 'novelty'`, commit immediately (server already verified readiness). Regular content keeps gate + 30 s timeout + `media_error`.

**Rationale**: FR-013/FR-014; novelties are pre-validated server-side; eliminates black-frame hold and novelty `media_error` defer confusion.

**Alternatives considered**:

- Keep gate for novelties with longer timeout — still blocks rotation visually; rejected.

---

## R6 — Configuration field

**Decision**: Add `novelty_max_defer_transitions` to `kiosk_display_configurations` (Alembic migration), API schema, and `/admin/configuration` form. Integer, default **3**, range **1–10**. Propagate via existing `config_updated` SSE.

**Rationale**: FR-006/FR-007; clarification Q4 — event-level config only.

**Alternatives considered**:

- Per-device override on `/admin/displays` — rejected in clarification.

---

## R7 — Snapshot / plan extensions

**Decision**: Extend snapshot payload per pending novelty:

```json
{
  "contentId": "...",
  "deferCount": 1,
  "maxDefer": 3,
  "ready": false
}
```

`pendingNovelties` preload items unchanged shape; add optional `noveltyDefer` block on snapshot root or enrich `pendingNovelties` entries.

**Rationale**: FR-012a reconnect backfill for indicator + tracker without replaying events.

**Alternatives considered**:

- Defer counts client-only — fails reconnect sync; rejected.

---

## R8 — Discard without display

**Decision**: On max-defer discard, call existing `consume_novelty()` (clears `isNovelty`, admin SSE inventory refresh). Do **not** emit `show_content`. Remove from `pendingNovelties` preload on next replan.

**Rationale**: Clarification Q5 — consume like emitted but no visual emission.

**Alternatives considered**:

- Leave `isNovelty` for manual review — rejected.

---

## R9 — Connected kiosk set for readiness

**Decision**: Use `DisplaySseHub` live kiosk registrations for `operator_session_id` as the connected set. On disconnect, remove kiosk from `noveltyReadyKiosks` entries; re-evaluate readiness (may unlock emit). On connect, kiosk must post `novelty_preload_ready` for pending items already cached locally.

**Rationale**: Clarification Q3 — disconnected does not block.

**Alternatives considered**:

- Persist ready across disconnect — could emit while kiosk offline; rejected.

---

## R10 — Rotation plan logging

**Decision**: Extend `rotation_plan` / `rotation_replan` logs with `deferCounts` and `rescheduledRegular` for ops debugging. No new audit event type in v1.

**Rationale**: Constitution observability gate; defer is operationally sensitive during live events.

**Alternatives considered**:

- Dedicated audit table row per defer — deferred to implementation if ops requests.

---

## ADR decision (Constitution V)

**Decision**: **No new ADR file** for CHG-056. Durable rationale for shifting novelty emission from client gate (CHG-050) to server-side defer lives in this `research.md` (R1, R4, R5) and will be consolidated into active contracts on acceptance.

**Rationale**: The architectural shift is scoped to novelty rotation within the existing display-orchestration model (ADR-0009 SSE orchestrator). A separate ADR is warranted only if ops later requires per-defer audit persistence or per-device defer overrides.

**Revisit trigger**: Multi-tenant defer policies or cross-session novelty state sharing.
