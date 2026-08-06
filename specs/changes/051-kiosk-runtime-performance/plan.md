# Implementation Plan: Estabilidad del runtime del kiosk en eventos largos

**Branch**: `051-kiosk-runtime-performance` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/051-kiosk-runtime-performance/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-051 entry to add at implementation gate)
- Active contracts read: `DISPLAY.RUNTIME`, `CONTENT.ADS.ADMIN`
- Change specs read: `spec.md`, `context-pack.md`, clarifications session 2026-08-06
- Context pack read or created: `context-pack.md` (updated)
- ADRs read: `ADR-0007` (blur-fill), `ADR-0009` (SSE orchestration)
- Code entrypoints verified:
  - `frontend/src/app/display/display-media-cache.service.ts`
  - `frontend/src/app/display/display-screen.component.ts`
  - `frontend/src/app/display/display-stream.service.ts`
  - `frontend/src/app/display/display-viewer.controller.ts`
  - `frontend/src/app/features/content/content-list.component.ts`
  - `backend/app/api/display_stream.py`
  - `backend/app/application/display_orchestrator/sse_hub.py`
- Tests identified:
  - `frontend/src/app/display/display-media-cache.service.spec.ts` (new)
  - `frontend/src/app/display/display-stream.service.spec.ts` (extend)
  - `frontend/src/app/display/display-screen.component.spec.ts` (extend)
  - `frontend/src/app/features/content/admin-content-stream.service.spec.ts` (extend)
  - `backend/tests/unit/test_display_sse_hub.py` (extend)
  - `backend/tests/integration/test_display_stream.py` (extend)
- Archived or consolidated specs read: none

## Summary

Fix cumulative memory growth and main-thread saturation on `/display` during
multi-hour live events without changing orchestration authority or SSE protocol
semantics for `show_ads`. The work bundles:

1. **Bounded media retention** — at most visible top content + one preload blob;
   visible sponsor window only; explicit `revokeObjectURL`.
2. **Single video decoder** — one `<video>`; backdrop via CSS from a captured
   poster/frame (not a second `<video>`).
3. **SSE hygiene** — display heartbeats as SSE comments (not application
   events); ignore heartbeats on client; debounced auth refresh on reconnect.
4. **UI efficiency** — `OnPush`, remove manual `detectChanges`, dedupe `show_ads`
   application, narrow reactive effects.
5. **Server queue cap** — display subscriber FIFO max 64, drop-oldest.
6. **Admin coalescing** — cancel/coalesce overlapping `refresh({ silent: true })`
   on inventory SSE.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12+ (FastAPI), TypeScript / Angular 20 |
| **Primary dependencies** | FastAPI, Angular signals/effects, `EventSource`, `queue.Queue` |
| **Storage** | No schema changes; in-memory blobs (client), per-connection queues (server) |
| **Testing** | pytest (SSE hub), Vitest/Jasmine (display + admin stream specs) |
| **Target** | Kiosk `/display` (P0); admin content list (P2) |
| **Performance goals** | SC-001: RAM growth ≤ 20 % from min 30 to 8 h; SC-004: one active video decoder |
| **Constraints** | No `show_ads` protocol change; display-only bounded queue; preserve CHG-028 look |
| **Scale** | 1–20 kiosks per org; 20+ content items; 8 h continuous rotation |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass — `DISPLAY.RUNTIME`, `CONTENT.ADS.ADMIN` |
| Manifest update planned | pass — add CHG-051 entry before implementation complete |
| Context pack present | pass — `context-pack.md` |
| Contract update before implementation | yes — `contracts/contract-deltas.md` |
| Tests for changed behavior | pass — unit + integration per TQ-002 |
| Security / error exposure | pass — no new endpoints; auth debounce reduces abuse |
| Observability / audit | pass — no audit schema change; optional debug metrics deferred |
| No unjustified archive reads | pass |
| Durable rationale in ADR | pass — amend ADR-0007 at T005 (no ADR-0014 unless scope expands) |

## Project Structure

### Documentation for this change

```text
specs/changes/051-kiosk-runtime-performance/
├── spec.md
├── context-pack.md
├── plan.md                         ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contract-deltas.md
├── checklists/requirements.md
└── tasks.md                        ← /speckit-tasks
```

### Source code (planned)

```text
frontend/src/app/display/
├── display-media-cache.service.ts    # bounded retention + revoke
├── display-media-cache.service.spec.ts
├── display-stream.service.ts         # ping ignore, auth debounce
├── display-viewer.controller.ts      # show_ads fingerprint dedupe
├── display-screen.component.ts       # OnPush, video backdrop, fewer effects
├── display-screen.component.css      # backdrop via CSS var / class
└── display-screen.component.spec.ts

frontend/src/app/features/content/
├── content-list.component.ts         # switchMap reconcile
└── content.facade.ts                 # (optional) expose cancel token

backend/app/api/
└── display_stream.py                 # comment ping, not hub.publish

backend/app/sse/
└── ping.py                           # shared build_sse_ping_comment()

backend/app/application/display_orchestrator/
└── sse_hub.py                        # bounded Queue(maxsize=64), drop-oldest put

backend/tests/
├── unit/test_display_sse_hub.py
└── integration/test_display_stream.py
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md). Resolved:

- Retention window: visible + 1 preload (spec clarification)
- Queue policy: drop-oldest, max 64 events, display stream only
- Video blur-fill: single `<video>` + CSS backdrop from captured frame
- `show_ads`: client dedupe only; protocol unchanged
- Auth refresh debounce: 5 s, single-flight
- OnPush + effect consolidation on display screen

## Phase 1: Design & Contracts

Completed artifacts:

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| Contract deltas | [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

### Active contract updates (before implementation)

Merge `contracts/contract-deltas.md` into:

1. `specs/contracts/display-runtime/contract.md`
2. `specs/contracts/content-ads-admin/contract.md` (reconciliation coalescing only)

Update `specs/manifest.yml` with CHG-051 entry (`status: draft` → `implemented` at close).

### Implementation phases vs user stories

| Phase | User stories | Key deliverable |
|-------|--------------|-----------------|
| 1 | US1, US3 | Media cache bounds + video single-decoder + blob revoke |
| 2 | US2 | SSE ping comments, client ignore, auth debounce, polling/SSE handoff |
| 3 | US2, US1 | OnPush, effect trim, `show_ads` dedupe, remove `detectChanges` |
| 4 | US5 | Server bounded queue + tests |
| 5 | US4 | Admin reconcile coalescing |
| 6 | All | Contract verification at close, manifest, soak validation (SC-001/002/003) |

## Phase 2: Task Planning Approach

Tasks in `/speckit-tasks` will map phases 1–6 to concrete files. Suggested grouping:

1. **P0 kiosk memory** — `DisplayMediaCacheService`, video template/CSS, specs
2. **P0 SSE client** — `DisplayStreamService`, `display_stream.py` ping
3. **P0 UI perf** — `DisplayScreenComponent` OnPush + effects
4. **P1 server queue** — `sse_hub.py` + integration test
5. **P2 admin** — `content-list` reconcile `switchMap`
6. **Gate** — contract verification (merged at T003; re-checked at T037), manifest, quickstart soak tiers

### Test strategy

1. **Unit** — media cache evicts third URL; stream ignores ping; auth debounce;
   viewer skips identical `show_ads` fingerprint; hub drops oldest at maxsize;
   `ngsw-bypass` preserved on EventSource URL.
2. **Component** — display screen renders one video element; backdrop not `<video>`.
3. **Integration** — display stream comment pings do not advance sequence; Redis
   replay buffer policy unchanged (FR-013); slow subscriber queue bounded under
   load test; SC-003 network recovery (automated where feasible + manual).
4. **Manual** — [quickstart.md](./quickstart.md): 30 min pre-merge soak (SC-001
   proxy), **8 h release gate** (SC-001/SC-002), SC-003 network recovery,
   US3-3 visual sign-off.

### Phase gates

| Gate | Criterion |
|------|-----------|
| G1 → Phase 2 | Media cache unit tests green; ≤ 2 top blobs after rotation cycle |
| G2 → Phase 3 | Ping does not bump `lastEvent`; comment visible in stream capture |
| G3 → Phase 4 | Display screen spec: single video decoder assertion |
| G4 → Phase 5 | Hub queue test: len ≤ 64 under flood |
| G5 → Done | SC-001 30 min proxy + 8 h release soak documented; SC-003 passed; contracts verified vs deltas |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Canvas frame capture for video backdrop | FR-003 requires blur fill without second decoder | Second `<video>` caused measured 2× RAM/CPU |
| OnPush on large display component | FR-006/007; 15 effects + default CD blocked SSE processing | Minor template-only tweaks insufficient |
| Bounded server queue with drop-oldest | FR-012; slow client must not grow unbounded RAM | Unbounded queue caused burst collapse in analysis |

## Estimated effort

| Phase | Estimate |
|-------|----------|
| 1–3 (kiosk P0) | 2–3 days |
| 4–5 (server + admin) | 1 day |
| 6 (contracts + soak) | 0.5–1 day |
| **Total** | **~4–5 days** |
