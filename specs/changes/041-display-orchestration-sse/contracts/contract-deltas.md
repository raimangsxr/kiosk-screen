# Contract Deltas: CHG-041 Display Orchestration

**Date**: 2026-07-08

Pre-implementation deltas to merge into active contracts before coding.

---

## DISPLAY.RUNTIME

### Replaces

- `DisplayPollingService` as primary sync mechanism.
- `KioskRotationController` as timer owner.
- `DisplayControlSyncService` as primary multi-machine display sync.
- Polling-based fingerprint timer preservation.

Note: branding sync migration is owned by `EVENT.BRANDING` (see below).

### Adds

- `DisplayStreamService` subscribes to `GET /api/display/stream` (SSE).
- `DisplayViewerController` applies `show_content`, `show_ads`, `mode_changed`,
  `config_updated`, `snapshot` commands.
- Displays report `video_ended`, `media_error` via `POST /api/display/kiosk/events`.
- Reconnect UX: automatic `EventSource` reconnect; `snapshot` on gap;
  non-intrusive "reconectando" indicator (CHG-030 parity).
- Polling fallback until Phase 4 when SSE unavailable > 60 s.

### Preserves

- DOM rendering (blur-fill ADR-0007, portrait prompt, fullscreen prompt,
  branding overlay, sponsor strip layout).
- `display-screen.component` as template owner.

---

## DISPLAY.CONTROL

### Replaces

- Non-goal: "Multi-machine real-time synchronization beyond polling."
- Remote control effect via polling convergence.

### Adds

- Every remote control mutation triggers orchestrator fan-out to all registered
  displays for the organization.
- `navigationCommand` cleared after orchestrator processes; displays receive
  `show_content` or `mode_changed`, not raw navigation state alone.

### Preserves

- Commands: next, previous, pause, resume, jump_to.
- Fixed auto-fallback semantics (now on orchestrator write path only).
- Cross-tab sync for admin UI (optional; not required for kiosk sync).

---

## DISPLAY.CONFIG_SESSION

### Adds

- `POST /api/display/kiosk/register` — returns `kioskId`.
- Active session scopes SSE fan-out.
- `POST /display/open` bootstraps orchestrator and emits initial `snapshot`.
- Session supersede sends `session_ended` to prior connections.

### Deprecates (Phase 4)

- `remoteControlPollingSeconds` configuration field.
- `GET /display/state` as primary read path (retained as fallback).

### Preserves

- Operator session lifecycle, readiness blockers, configuration schema (minus
  polling field).

---

## CONTENT.ROTATION

### Replaces

- Client-side loop cursor, recurring counters, novelty intercept.
- Client `POST /display/rotation-event` for empty queue (orchestrator detects).
- First-kiosk-wins `POST consume-novelty` (orchestrator consumes on emit).

### Adds

- Server `DisplayOrchestrator` owns rotation per `orchestrator-state-machine.md`.
- Recurring counters in Redis (CHG-039 rules unchanged).
- Novelty queue in orchestrator; burst on next boundary in loop mode (CHG-027
  resume cursor rules unchanged).
- Admin content and ad write paths (`content.py`, `ads.py`) trigger orchestrator
  `content_mutated` refresh; playlist changes apply at next content boundary
  (FR-009).

### Preserves

- Eligibility filters, `inlineAdCount` slicing, independent ad cadence (FR-012),
  fixed/iframe/pause semantics, effective durations from configuration.

---

## DISPLAY.EVENTS.AUDIT

### Adds event types

| Event type | Severity | When |
|------------|----------|------|
| `kiosk_connected` | info | SSE register + stream open |
| `kiosk_disconnected` | info | Stream closed |
| `orchestrator_advanced` | info | Top content advance (optional metadata: commandId, reason) |
| `orchestrator_empty_queue` | warning | Debounced empty queue (replaces client `content_rotation_empty`) |
| `orchestrator_session_ended` | info | Session superseded or expired |

### Preserves

- Existing catalog entries; sanitization rules (ADR-0003).

---

## EVENT.BRANDING

### Replaces

- `EventConfigSyncService` / `BroadcastChannel` as primary multi-machine branding
  sync for kiosks (CHG-024 poll + cross-tab fallback).

### Adds

- `branding_updated` SSE event when operator saves event configuration or
  branding; all connected displays refresh `EventBrandingService` without poll
  or `BroadcastChannel`.
- `PUT /api/event-configuration` (and related branding mutations) publish to
  orchestrator SSE hub.

### Preserves

- `EventBrandingService` as frontend branding state owner.
- Branding overlay rendering in `display-screen.component` (ADR-0005).
- Admin cross-tab `BroadcastChannel` optional for admin UI only until Phase 8.

---

## OPS.PLATFORM

### Adds

- `redis` service in `docker-compose.yml` for local dev.
- nginx/ingress notes: disable buffering for SSE; extended `proxy_read_timeout`.
- Redis as production dependency for multi-replica deployments.
- CI: Redis service container for orchestrator integration tests (optional
  marker `@pytest.mark.redis`).

### Preserves

- Existing backend/frontend Docker patterns; no WebSocket-specific proxy config.

---

## Quality gate

- Merge each section into the target contract file before Phase 1 implementation.
- Run `pytest backend/tests -k display` and `npm --prefix frontend run test`
  after contract merge to establish baseline.
