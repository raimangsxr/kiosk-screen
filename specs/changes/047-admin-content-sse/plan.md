# Implementation Plan: Admin Content List Live Updates (SSE)

**Input**: Feature specification from `specs/changes/047-admin-content-sse/spec.md`  
**Branch**: `047-admin-content-sse` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`specs/manifest.yml` — `CONTENT.ADS.ADMIN`)
- Active contracts read: `content-ads-admin`
- Change specs read: CHG-047 (active), CHG-046 (list UX), CHG-027 (novelty), CHG-041 (display SSE patterns)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md` (transport precedent)
- Code entrypoints verified:
  - Backend: `content.py`, `hooks.notify_content_mutated`, `display_orchestrator/sse_hub.py`, `rotation_logic.py` (novelty consume)
  - Frontend: `content-list.component.ts`, `content.facade.ts`, `display-stream.service.ts` (SSE lifecycle reference)
- Tests identified: backend integration stream test, unit hub test, frontend stream service spec, content-list component spec extensions
- Archived or consolidated specs read: none

## Summary

Add **Server-Sent Events** so operators on `/admin/content` receive near-real-time inventory notifications when top content changes (admin CRUD, public API upload, kiosk novelty consume). Clients reconcile via existing `GET /api/content` (lightweight `content_inventory_changed` events, not full payloads). Lifecycle is page-scoped (connect on enter, disconnect on leave), debounced 1 s coalescing, silent successful sync, discrete stale indicator after 30 s disconnect, deferred refresh during drag-and-drop, and a wired **Actualizar** button.

## Technical Context

**Language/Version**: Python 3.12 (FastAPI), TypeScript / Angular 19+  
**Primary Dependencies**: FastAPI `StreamingResponse`, Redis Pub/Sub (existing), browser `EventSource`, RxJS debounce  
**Storage**: PostgreSQL (authoritative inventory); no new tables  
**Testing**: `pytest backend/tests`, `npm --prefix frontend run test`  
**Target Platform**: Admin browser (`/admin/content` only)  
**Project Type**: Full-stack web app  
**Performance Goals**: 95 % of remote changes visible &lt;3 s (SC-001/002); coalesced refresh ≤1 s after last event in burst  
**Constraints**: Session-cookie auth (`withCredentials`); `CONTENT_MANAGEMENT_ROLES` on stream; Spanish UI for stale indicator; preserve CHG-046 pagination/filter/selection semantics  
**Scale/Scope**: One SSE connection per open content-list tab per operator; fan-out per `organizationId`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `CONTENT.ADS.ADMIN` |
| Manifest update needed and planned | pass — add CHG-047 entry in tasks |
| Context pack created/updated | pass — [context-pack.md](./context-pack.md) |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass |
| Security and user-facing error exposure considered | pass — authZ on stream; no inventory in SSE payload |
| Observability/audit impact considered | pass — optional debug log on publish; no new audit event required |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (all NEEDS CLARIFICATION resolved in [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/047-admin-content-sse/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-content-stream.md
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── app/application/admin_content/
│   ├── sse_hub.py              # AdminContentSseHub (new)
│   └── hooks.py                # notify_admin_content_inventory_changed (new)
├── app/api/
│   ├── content_stream.py       # GET /admin/content/stream (new)
│   └── content.py              # wire publish on mutations (via hooks)
├── app/application/display_orchestrator/
│   ├── hooks.py                # extend notify_content_mutated → admin publish
│   └── rotation_logic.py       # publish after novelty consume
└── tests/
    ├── unit/test_admin_content_sse_hub.py
    └── integration/test_admin_content_stream.py

frontend/
├── src/app/features/content/
│   ├── admin-content-stream.service.ts   # new — EventSource lifecycle
│   ├── content-list.component.ts         # connect/disconnect, stale UI, (refresh)
│   ├── content-list.component.spec.ts
│   └── content.facade.ts                 # refresh({ silent }) for SSE reconcile
└── src/app/core/api/content.api.ts       # stream URL constant (if needed)

specs/contracts/content-ads-admin/contract.md   # pre-impl update
specs/manifest.yml                                # CHG-047 entry
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. **Separate admin content SSE hub** from kiosk `DisplaySseHub` (different subscribers, event types, lifecycle).
2. **Redis Pub/Sub** channel `pubsub:org:{orgId}:admin-content` for multi-replica fan-out (same pattern as CHG-041).
3. **Lightweight event** `content_inventory_changed`; client calls `ContentFacade.refresh()`.
4. **Single publish hook** `notify_admin_content_inventory_changed(org_id)` called from existing mutation paths + novelty consume.
5. **Frontend service** scoped to `ContentListComponent` lifecycle; 1 s debounce; pause while `cdkDrag` active; SSE reconciliation uses `refresh({ silent: true })` (no list skeleton).
6. **No new ADR** — reference ADR-0009; admin stream documented in change contract.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/admin-content-stream.md](./contracts/admin-content-stream.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

- `specs/contracts/content-ads-admin/contract.md` — SSE stream, live list behavior, refresh button, stale indicator

### Publish trigger matrix

| Trigger | Existing hook | Admin SSE publish |
|---------|---------------|-------------------|
| Admin CRUD / reorder | `notify_content_mutated` | yes (extend hook) |
| Public API upload | `notify_content_mutated` | yes |
| Ads mutations | `notify_content_mutated` | yes (harmless no-op for content list; same hook today) |
| Orchestrator novelty consume | `rotation_logic` DB update | yes (new call) |

## Phase 2: Task Planning Approach

Tasks will be ordered by user story:

| Phase | Stories | Focus |
|-------|---------|-------|
| 1 | Setup | Hub module, route registration, manifest/contract prep |
| 2 | US4 P2 | Wire **Actualizar** + manual `refresh()` path (quick win, unblocks operators today) |
| 3 | US1+US2 P1 | Backend stream + publish hooks + frontend connect/debounce/reconcile |
| 4 | US3 P2 | Novelty consume publish + filtered list regression |
| 5 | US4 P2 | Reconnect, 30 s stale banner, 401 → login |
| 6 | Polish | Drag defer (FR-015), burst coalesce tests, quickstart validation |

### Test strategy

- **Backend unit**: hub subscribe/publish, Redis fan-out mock, org isolation
- **Backend integration**: authenticated stream receives event after `POST /content`; 401/403 without role; reconnect ping
- **Frontend unit**: `AdminContentStreamService` debounce, drag pause, disconnect on destroy; list wires `(refresh)`
- **Manual**: [quickstart.md](./quickstart.md) — two-browser operator sync, public upload, novelty consume

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Second SSE hub (admin vs display) | Different auth, events, and lifecycle | Reusing `DisplaySseHub` couples kiosk session requirements to admin list |
| Redis Pub/Sub | Multi-replica fan-out | In-process only breaks when mutation and stream hit different pods (CHG-041 lesson) |
