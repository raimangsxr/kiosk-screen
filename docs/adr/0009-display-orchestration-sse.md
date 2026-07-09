# ADR-0009: Server-authoritative display orchestration over SSE

## Status

Accepted

## Context

The kiosk runtime evolved from a single-display PoC where each client polls
`GET /display/state`, owns rotation timers locally (`KioskRotationController`),
and converges with other machines only on the polling interval (1–60 s). Operators
now need multiple kiosks to show the same content with low latency when
configuration or remote control changes.

Polling cannot guarantee synchronized frames across clients because each kiosk
maintains its own cursor, ad index, recurring counters, and novelty burst state.

## Decision

1. **Orchestration level**: Level 2 — the backend is the single source of truth
   for the current frame, rotation cursor, ad index, recurring counters, and
   novelty queue. Kiosk clients become viewers that render commands.

2. **Push transport**: **SSE** (`text/event-stream`) for all server → kiosk
   traffic. Native `EventSource` reconnect and `Last-Event-ID` are used for
   resumption.

3. **Reverse channel**: **HTTP POST** (`POST /api/display/kiosk/events`) for
   playback facts the server cannot observe: `media_ready`, `video_ended`,
   `media_error`, and optional `heartbeat`. This avoids WebSockets while keeping
   Level 2 semantics.

4. **Fan-out**: When an operator mutates configuration, remote control, or
   content, the orchestrator publishes to all kiosk SSE connections for the
   organization. Multi-replica deployments require a shared pub/sub bus (Redis).

5. **Orchestrator state**: Hot rotation state (cursors, counters, timers) lives
   in Redis keyed by `organization_id` + active `operator_session_id`. PostgreSQL
   remains authoritative for configuration, playlists, and audit.

6. **Migration**: Phased rollout with polling fallback until Phase 4 retires
   `DisplayPollingService`.

7. **Novelty semantics change**: Under server orchestration, novelty consumption
   is decided by the orchestrator when emitting `show_content`, not by
   first-kiosk-wins `POST consume-novelty` (CHG-027). The consume endpoint
   becomes an internal orchestrator action.

## Consequences

- `DISPLAY.RUNTIME`, `DISPLAY.CONTROL`, `CONTENT.ROTATION`, and
  `DISPLAY.CONFIG_SESSION` require contract updates before implementation.
- `remoteControlPollingSeconds` is deprecated in favor of SSE reconnect and
  heartbeat policy.
- Frontend rotation services (`KioskRotationController`, `RotationSchedulerService`,
  `DisplayPollingService`) are removed in the final phase.
- Redis becomes a production dependency for multi-replica SSE fan-out and
  orchestrator state.
- Contract and integration tests must cover the SSE protocol and orchestrator
  state machine (see `specs/changes/041-display-orchestration-sse/contracts/`).
- Product policy: configuration layout changes apply immediately; playlist changes
  apply at the next content boundary unless remote control forces an advance.

## Related artifacts

- `specs/changes/041-display-orchestration-sse/spec.md`
- `specs/changes/041-display-orchestration-sse/contracts/sse-protocol.md`
- `specs/changes/041-display-orchestration-sse/contracts/orchestrator-state-machine.md`
