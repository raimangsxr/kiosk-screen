# Research: Synchronized multi-kiosk display control (CHG-041)

**Date**: 2026-07-08

## R1 — Push transport: SSE vs WebSockets

**Decision**: Server-Sent Events for server → display; HTTP POST for display →
server playback facts.

**Rationale**: User requirement and ADR-0009. Level-2 orchestration needs
bidirectional semantics but not a persistent bidirectional socket — video-ended
round-trip over HTTP (tens of ms) is acceptable for event kiosks. SSE has
native browser reconnect, simpler proxy configuration, and works with session
cookies without custom headers on `EventSource`.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| WebSockets | Higher infra complexity (sticky sessions, upgrade handling) without meaningful latency gain for this domain |
| Long polling | Still N requests/sec per kiosk; does not solve fan-out latency |
| SSE-only (no HTTP reverse) | Cannot report `video_ended`; server would guess duration only |

---

## R2 — Multi-replica fan-out

**Decision**: Redis Pub/Sub channel `pubsub:org:{orgId}:display` plus local
connection registry per backend replica.

**Rationale**: Production runs multiple backend pods (ArgoCD/K8s). Admin
mutation may hit replica A while display SSE connects to replica B. Redis is the
minimal shared bus; PostgreSQL LISTEN/NOTIFY is weaker for buffer replay.

**Alternatives considered**:

- Sticky sessions only — insufficient when mutation and stream land on different pods.
- Single orchestrator pod — SPOF; violates horizontal scaling.

---

## R3 — Orchestrator state storage

**Decision**: Hot state in Redis (`orchestrator:{orgId}:{sessionId}`); playlists
and config from PostgreSQL on each mutation.

**Rationale**: Cursors, recurring counters, and timer deadlines change every
few seconds — Redis fits. Eligibility filters already implemented in
`display_service.py`; reuse on read rather than cache stale playlists.

**Alternatives considered**:

- All state in PostgreSQL — write amplification on every timer tick.
- All state in memory — lost on pod restart mid-event.

---

## R4 — Novelty consumption semantics

**Decision**: Orchestrator consumes novelty in DB when emitting `show_content`;
all displays receive the same command. Deprecate first-kiosk-wins
`POST consume-novelty` race.

**Rationale**: With server authority, there is one program — no per-client
consume race. Simpler and matches FR-003 (all displays show same item).

**Alternatives considered**:

- Keep CHG-027 client race — incompatible with synchronized displays.
- Per-display novelty ack — unnecessary complexity.

---

## R5 — Advance gating on slow displays

**Decision**: Server advances on timer or first `video_ended`; does **not** wait
for all displays' `media_ready`. Slow displays catch up on current slide.

**Rationale**: Spec edge case and FR-003 trade-off — one broken screen must not
freeze the venue. `media_ready` is informational in v1.

**Alternatives considered**:

- Wait for all kiosks — blocked by single offline screen.
- Wait with 2 s timeout — added in v2 if operators report visible desync.

---

## R6 — SSE authentication

**Decision**: Session cookie (existing auth) for `GET /display/stream`; kiosk
registers with `POST /display/kiosk/register` after `POST /display/open`.

**Rationale**: `EventSource` cannot set Authorization header reliably in all
browsers. Kiosk already runs in authenticated operator context.

**Alternatives considered**:

- Query-string token — leaks in logs/proxies.
- Separate kiosk API keys — new credential model out of scope.

---

## R7 — Config change mid-slide

**Decision**: Layout fields (`topRegionRatio`, borders) → immediate
`config_updated`. Playlist and `inlineAdCount` → next content/ad boundary.

**Rationale**: Matches operator expectation from current fingerprint behavior;
avoids jarring mid-animation cuts except for layout.

---

## R8 — Migration strategy

**Decision**: Four phases; polling remains fallback until Phase 4; feature flag
`DISPLAY_ORCHESTRATOR` on frontend.

**Rationale**: Constitution principle VII (live-event safety). Venues cannot
accept a single cutover weekend.

**Alternatives considered**:

- Big-bang — rejected for production risk.
- SSE-only snapshot without server rotation (Level 1 forever) — fails FR-003.

---

## R9 — Local development

**Decision**: Add `redis:7-alpine` to `docker-compose.yml`; document SSE proxy
headers in `quickstart.md`.

**Rationale**: Phase 1 gate requires Redis; developers must reproduce fan-out
locally with two browser tabs.

---

## R10 — Port source for rotation logic

**Decision**: Port behavior from `KioskRotationController` and
`RecurringCadenceService` to Python; use existing specs CHG-027, CHG-039, and
`kiosk-rotation.controller.spec.ts` as acceptance oracles.

**Rationale**: Logic is battle-tested; re-specifying risks regression.

**Alternatives considered**:

- Rewrite from scratch — high regression risk.
- Keep client rotation with SSE state push — fails synchronized hall requirement.
