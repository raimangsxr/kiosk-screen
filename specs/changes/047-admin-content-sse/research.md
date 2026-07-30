# Research: Admin Content List Live Updates (CHG-047)

**Date**: 2026-07-30

## R1 — Transport: dedicated admin SSE vs polling

**Decision**: Server-Sent Events on `GET /api/admin/content/stream`; client reconciles via existing `GET /api/content`.

**Rationale**: User request and spec assumptions; aligns with CHG-041 kiosk pattern and ADR-0009. Polling would add steady load and miss the &lt;3 s target under default intervals. `EventSource` supports cookie auth and auto-reconnect.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Polling every N seconds | Wastes requests; latency tied to interval; spec calls for push |
| Reuse `GET /api/display/stream` | Kiosk events (`show_content`, etc.) are wrong abstraction; requires kiosk registration |
| WebSockets | Overkill for server→client inventory hints |
| Full list in SSE payload | Large payloads on reorder; spec assumes lightweight notify + GET reconcile |

---

## R2 — Hub separation from DisplaySseHub

**Decision**: New `AdminContentSseHub` under `backend/app/application/admin_content/`.

**Rationale**: Display hub tracks kiosk registrations, command sequences, and orchestrator envelopes. Admin inventory needs org-scoped fan-out to operator browser tabs with a single event type. Mixing would complicate auth and inflate kiosk stream traffic.

**Alternatives considered**:

- Extend `DisplaySseHub` with `admin_subscribers` — violates single responsibility; kiosk reconnect buffers irrelevant for admin.
- `BroadcastChannel` only — does not sync across operators or public API path (already used for display config admin tabs only).

---

## R3 — Multi-replica fan-out

**Decision**: Redis Pub/Sub channel `pubsub:org:{orgId}:admin-content`, same infrastructure as display SSE (CHG-041 R2).

**Rationale**: Production runs multiple backend replicas. Admin mutation may land on replica A while SSE connects to replica B.

**Alternatives considered**:

- Sticky sessions only — insufficient across replicas.
- PostgreSQL NOTIFY — weaker operational tooling vs existing Redis bus.

---

## R4 — Publish trigger consolidation

**Decision**: Add `notify_admin_content_inventory_changed(organization_id)`; call from `notify_content_mutated` and after orchestrator novelty consume in `rotation_logic`.

**Rationale**: All admin/public content mutations already invoke `notify_content_mutated` from `content.py`, `ads.py` (shared hook name today), and `public_content/routes.py`. Centralizing avoids missing a code path. Novelty consume clears `is_novelty` in orchestrator without calling `notify_content_mutated` today — must add explicit publish (FR-009).

**Alternatives considered**:

- DB triggers / LISTEN — hidden coupling; harder to test.
- Per-route publish calls only — easy to miss orchestrator novelty path.

---

## R5 — Client reconciliation and coalescing

**Decision**: On `content_inventory_changed`, debounce 1 s (`auditTime` / `debounceTime`) then `ContentFacade.refresh()` unless drag active.

**Rationale**: Clarification session 2026-07-30 (FR-012, FR-015). Reuses existing facade state and optimistic local updates. Preserves pagination/filter signals in component (FR-004).

**Alternatives considered**:

- Push diff/patch events — complex merge with optimistic reorder/delete.
- Immediate refresh per event — flicker under burst uploads.

---

## R6 — Connection lifecycle and UX feedback

**Decision**:

- Connect in `ContentListComponent` `ngOnInit`, disconnect `ngOnDestroy` (FR-011).
- Silent successful sync (FR-013).
- Show discrete stale hint after 30 s `!connected` (FR-014); mirror kiosk `reconnecting` pattern internally but no banner until threshold.
- Fatal 401/403 → existing auth redirect (US4.3).
- Wire `(refresh)="onRefresh()"` on `app-admin-list` (FR-006 bugfix).

**Rationale**: Clarifications 2026-07-30; `DisplayStreamService` provides reconnect and auth handling precedent.

---

## R7 — Authorization

**Decision**: Stream endpoint requires `CONTENT_MANAGEMENT_ROLES` (same as mutations). `GET /content` list remains `get_current_user` for read — stream is tied to operators who manage inventory per FR-008.

**Rationale**: Prevents leaking inventory-change signals to read-only roles if any exist; matches FR-008 wording.

---

## R8 — ADR documentation

**Decision**: No new ADR; extend change contract and `CONTENT.ADS.ADMIN` contract. Reference ADR-0009 for SSE transport rationale.

**Rationale**: Constitution V — incremental admin notification is narrower than orchestration ADR scope; avoids ADR proliferation.
