# Research: CHG-048 Content Now Playing & Rotation Logging

**Date**: 2026-07-30

## R1 — Source of truth for «en emisión»

**Decision**: Use orchestrator Redis state field `currentTopContentId` (already set in `emit_top_content` patch) as the authoritative now-playing id.

**Rationale**: Same value drives kiosk `show_content` SSE; no client inference; survives replica fan-out via orchestrator state reads.

**Alternatives considered**:
- Parse last `show_content` envelope from display SSE buffer — replica-local, not admin-scoped.
- New DB column — unnecessary; ephemeral runtime state.

---

## R2 — Admin notification transport

**Decision**: New SSE event `now_playing_changed` on existing `AdminContentSseHub` / `GET /api/admin/content/stream` (CHG-047).

**Rationale**: Clarification session 2026-07-30; rotation does not fire `content_inventory_changed`; dedicated event avoids full list refresh per step.

**Alternatives considered**:
- Poll `GET /display/state` every 3 s — higher load, worse UX latency.
- Piggyback on inventory SSE only — misses pure rotation advances.

---

## R3 — Stream authorization for `event_operator`

**Decision**: Change `content_stream.py` dependency from `require_roles(CONTENT_MANAGEMENT_ROLES)` to `get_current_user` (any authenticated org member).

**Rationale**: `GET /api/content` list already uses `get_current_user`; clarification requires operators see live highlight; stream carries no write capability.

**Alternatives considered**:
- Separate read-only stream URL — duplicate hub wiring.
- Keep 403 for operators — contradicts FR-001/002 clarification.

---

## R4 — Computing «siguiente» and «novedades» for logs

**Decision**: New module `rotation_plan.py` with `compute_rotation_plan_snapshot(orchestrator, session) -> RotationPlanSnapshot` that reuses `_regular_queue`, `_pick_next_regular`, `novelty_queue`, `pick_due_recurring` without mutating state.

**Rationale**: User expects logs to match orchestrator planning (e.g. novelty 250 becomes next while still showing 3); single function for `rotation_plan` and `rotation_replan` logs.

**Alternatives considered**:
- Log only after emit (no replan) — misses mid-cycle novelty case (US3).
- Duplicate simplified «next = displayOrder+1» — wrong for novelty/recurring/fixed.

---

## R5 — Log format and level

**Decision**: Python `logger.info()` with structured `extra` dict (JSON-serializable) and stable keys: `event`, `organizationId`, `operatorSessionId`, `showing`, `next`, `novelties`, `reason`.

**Rationale**: Clarification: INFO always in production; grep-friendly; no PII beyond admin titles.

**Alternatives considered**:
- DEBUG for regular steps — rejected by clarification.
- Display audit DB table — out of scope; logs sufficient for v1.

---

## R6 — When to clear admin highlight

**Decision**: Emit `now_playing_changed` with `contentId: null` when orchestrator publishes `mode_changed` to non-top modes (ads sponsor focus, iframe takeover) or when no `currentTopContentId` in loop.

**Rationale**: Clarification A — no misleading yellow row when kiosks are not showing top content.

**Alternatives considered**:
- Sticky last id — rejected (clarification).

---

## R7 — UI styling

**Decision**: CSS class `content-list__row--on-air` / `content-list__card-item--on-air` using `color-mix` with a yellow/warning-adjacent token (distinct from `--status-warning-container` novelty tint).

**Rationale**: Matches CHG-046 novelty row pattern; no new column; emission wins over novelty background (FR-011).

**Alternatives considered**:
- Chip column — rejected by user preference.

---

## R8 — Off-page hint

**Decision**: Compact text `En pantalla: {title}` in `adminListActions` slot when `nowPlayingContentId` not in `visibleItems()`.

**Rationale**: FR-003; reuses existing action bar area from CHG-046 layout.

**Alternatives considered**:
- Auto-jump pagination to page — disruptive during editing.

---

## R9 — Initial highlight on page load

**Decision**: On admin stream subscribe, server replays one `now_playing_changed` from orchestrator `currentTopContentId` (or `null`).

**Rationale**: Operators opening `/admin/content` mid-rotation must see yellow row immediately (FR-002); avoids optional GET snapshot endpoint.

**Alternatives considered**:
- Wait for next rotation event — fails US1 acceptance «open list while item already on air».
- Client polls display state — duplicate source, higher latency.
