---
description: "Task list for CHG-051 kiosk runtime performance"
---

# Tasks: Estabilidad del runtime del kiosk en eventos largos

**Input**: Design documents from `specs/changes/051-kiosk-runtime-performance/`  
**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/contract-deltas.md`, `quickstart.md`

**Tests**: Mandatory per TQ-002 — unit/integration/frontend specs for changed behavior; manual soak for SC-001.

## Format reference

```text
- [x] T001 [P] [US1] Description with exact file path
```

---

## Phase 1: SDD Governance & Context

**Purpose**: Contract-first gate before code changes.

- [x] T001 Read `specs/manifest.yml` CHG-051 entry and affected contracts `DISPLAY.RUNTIME`, `CONTENT.ADS.ADMIN`
- [x] T002 Read `specs/changes/051-kiosk-runtime-performance/context-pack.md` and `contracts/contract-deltas.md`
- [x] T003 Merge `contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md` (bounded media, video backdrop, SSE comments, auth debounce, OnPush, show_ads dedupe, display queue)
- [x] T004 Merge admin reconciliation delta into `specs/contracts/content-ads-admin/contract.md` (switchMap coalescing)
- [x] T005 [P] Amend `docs/adr/0007-top-content-media-fit.md` with a short section on single-video backdrop + CSS blur (decision locked: amend ADR-0007; do not create ADR-0014 unless media-retention scope expands beyond CHG-028)

**Checkpoint**: Contracts updated — implementation may begin.

---

## Phase 2: Foundational — Media cache (US1 + US3)

**Goal**: Bounded blob retention and explicit revocation (FR-001, FR-002, FR-004).  
**Independent test**: Unit tests prove third URL evicts first; after rotation cycle ≤ 2 top blobs retained.

### Tests

- [x] T006 [P] [US1] Add `frontend/src/app/display/display-media-cache.service.spec.ts` — retention of visible + 1 preload, eviction on third URL, `revokeObjectURL` called, iframe mode clears top blobs
- [x] T007 [P] [US3] Extend `frontend/src/app/display/display-screen.component.spec.ts` — assert single `<video>` for video content; backdrop is not a second `<video>` (SC-004)

### Implementation

- [x] T008 [US1] Implement bounded `MediaRetentionSet` logic in `frontend/src/app/display/display-media-cache.service.ts` (max visible + 1 preload top; visible ad window only; `release(url)` + `releaseAll()`)
- [x] T009 [US3] Refactor video template in `frontend/src/app/display/display-screen.component.ts` — one `<video>`; backdrop via CSS `background-image` host binding
- [x] T010 [US3] Add canvas frame capture + backdrop blob lifecycle in `frontend/src/app/display/display-screen.component.ts` (revoke on slide change; respect `prefers-reduced-motion` per ADR-0007)
- [x] T011 [US3] Update `frontend/src/app/display/display-screen.component.css` for video backdrop (`background-image`, blur) without second media element
- [x] T012 [US1] Update preload/content warm effects in `frontend/src/app/display/display-screen.component.ts` to respect cache eviction API

**Checkpoint G1**: `npm --prefix frontend run test -- --include='**/display-media-cache**'` green.

---

## Phase 3: User Story 2 — SSE fiable bajo estrés (P1)

**Goal**: Heartbeats do not churn state; auth debounce on reconnect; clean polling handoff; network recovery (FR-005, FR-008, FR-009, FR-011, SC-003).  
**Independent test**: Stream capture shows `: ping` comments only; `lastEvent` unchanged on ping; ≤ 1 auth/me per 5 s on reconnect simulation; 2 min offline → remote control ≤ 90 s (SC-003).

### Tests

- [x] T013 [P] [US2] Extend `frontend/src/app/display/display-stream.service.spec.ts` — ping/comment does not update application event signal; auth debounce 5 s single-flight on repeated `onerror`; `EventSource` URL preserves `ngsw-bypass` (FR-017); reconnect with `Last-Event-ID` does not re-apply an identical snapshot when viewer state is already synced (edge case)
- [x] T014 [P] [US2] Extend `backend/tests/integration/test_display_stream.py` — idle stream emits SSE comment ping, not JSON `type":"ping"`; sequence unchanged; Redis/shared replay buffer TTL and max length unchanged vs baseline (FR-013 regression guard)

### Implementation

- [x] T015 [US2] Change `backend/app/api/display_stream.py` to yield SSE comment ping (`: ping\n\n`) instead of `hub.publish(..., event_type="ping")`
- [x] T016 [US2] Extract shared `build_sse_ping_comment()` to `backend/app/sse/ping.py` and use it from `display_stream.py` and `admin_content/sse_hub.py` (reuse admin pattern; do **not** add a duplicate `build_ping_comment()` on `display_orchestrator/sse_hub.py`)
- [x] T017 [US2] Refactor `frontend/src/app/display/display-stream.service.ts` — separate heartbeat handling from `lastEvent`; 5 s debounce + in-flight guard on `verifyAuthOrRedirect`
- [x] T018 [US2] Fix SSE/polling handoff in `frontend/src/app/display/display-screen.component.ts` — stop `DisplayPollingService` promptly when `connected()` true (FR-009)
- [x] T032 [US2] Add SC-003 network recovery validation — extend `frontend/src/app/display/display-stream.service.spec.ts` or integration harness for 2 min offline → remote control reflected in ≤ 90 s after reconnect; document manual repro steps in `quickstart.md` § SC-003

**Checkpoint G2**: display stream unit + integration ping tests green; SC-003 manual or automated check documented.

---

## Phase 4: User Story 1 + 2 — UI efficiency (P1)

**Goal**: Minimal CD work per rotation event (FR-006, FR-007); client `show_ads` dedupe (FR-010).  
**Independent test**: Component specs pass; identical consecutive `show_ads` does not bump viewer state.

### Tests

- [x] T019 [P] [US1] Extend `frontend/src/app/display/display-viewer.controller.spec.ts` — identical `show_ads` fingerprint skipped; state updates on real change
- [x] T020 [P] [US1] Extend `frontend/src/app/display/display-screen.component.spec.ts` — no `detectChanges` spy on ping-only stream updates

### Implementation

- [x] T021 [US1] Add `showAdsFingerprint` dedupe in `frontend/src/app/display/display-viewer.controller.ts` before `applyShowAds` and ad warm
- [x] T022 [US1] Set `changeDetection: ChangeDetectionStrategy.OnPush` on `DisplayScreenComponent` in `frontend/src/app/display/display-screen.component.ts`
- [x] T023 [US1] Remove `syncContentRenderItems()` → `detectChanges()`; use signal/`markForCheck` via `stateVersion` only where needed in `frontend/src/app/display/display-screen.component.ts`
- [x] T024 [US1] Trim/consolidate constructor `effect()` blocks in `frontend/src/app/display/display-screen.component.ts` — branding refresh uses `untracked` or single subscription pattern

**Checkpoint G3**: frontend display specs green.

---

## Phase 5: User Story 5 — Cola SSE acotada en servidor (P2)

**Goal**: Display subscriber FIFO max 64, drop-oldest (FR-012, SC-006).  
**Independent test**: Hub unit test — flood 100 events, queue len ≤ 64.

### Tests

- [x] T025 [P] [US5] Extend `backend/tests/unit/test_display_sse_hub.py` — bounded queue drop-oldest at maxsize 64
- [x] T026 [P] [US5] Add slow-subscriber scenario to `backend/tests/integration/test_display_stream.py` — server memory/queue stable under flood

### Implementation

- [x] T027 [US5] Implement bounded `put` with drop-oldest in `backend/app/application/display_orchestrator/sse_hub.py` (`StreamSubscriber.events` maxsize=64)
- [x] T028 [US5] Document queue constant `DISPLAY_SSE_QUEUE_MAXSIZE = 64` in `backend/app/application/display_orchestrator/sse_hub.py` or `display_stream.py`

**Checkpoint G4**: `pytest backend/tests/unit/test_display_sse_hub.py backend/tests/integration/test_display_stream.py -v` green.

---

## Phase 6: User Story 4 — Admin reconciliación coalescida (P2)

**Goal**: One silent refresh in flight; debounce preserved (FR-014, SC-005).  
**Independent test**: Rapid inventory signals → single in-flight `GET /content` per debounce window.

### Tests

- [x] T029 [P] [US4] Extend `frontend/src/app/features/content/content-list.component.spec.ts` — rapid `inventoryChanged$` emits yield one effective refresh (switchMap); in-flight silent refresh cancelled when a newer signal arrives
- [x] T030 [P] [US4] Extend `frontend/src/app/features/content/admin-content-stream.service.spec.ts` — **required**: ≥1 test that inventory SSE triggers reconcile coalescing without overlapping in-flight `GET /content` (cancel prior refresh when superseded)

### Implementation

- [x] T031 [US4] Refactor `reconcileFromServer()` in `frontend/src/app/features/content/content-list.component.ts` to `switchMap` on `inventoryChanged$` with `takeUntilDestroyed`; cancel in-flight silent refresh when a newer inventory signal arrives (single effective refresh per debounce window)

**Checkpoint**: content-list + admin stream specs green.

---

## Phase 7: Polish & Validation

- [x] T033 Run narrow tests: `npm --prefix frontend run test -- --include='**/display-**'` and `pytest backend/tests/unit/test_display_sse_hub.py backend/tests/integration/test_display_stream.py -v`
- [x] T034 Run broader validation: `npm --prefix frontend run test`, `pytest backend/tests`, `npm --prefix frontend run build`
- [x] T035 Execute manual validation per `quickstart.md` (all required before T037):
  - **SC-001 proxy (pre-merge)**: ≥ 30 min rotation soak with heap snapshots at T+0 and T+30; document RAM growth vs 20 % rule
  - **SC-001 / SC-002 (release gate)**: 8 h continuous rotation; no manual browser reload required
  - **US3-3 visual**: side-by-side blur-fill comparison (before/after); record operator acceptance in checklist
- [x] T036 Update `specs/changes/051-kiosk-runtime-performance/checklists/requirements.md` with validation evidence (include T032 SC-003, T035 soak tiers, US3-3 visual sign-off)
- [x] T037 Mark `specs/changes/051-kiosk-runtime-performance/spec.md` status `implemented` and `specs/manifest.yml` CHG-051 status `implemented`; verify active contracts `DISPLAY.RUNTIME` and `CONTENT.ADS.ADMIN` reflect merged deltas from T003/T004 (no drift vs `contract-deltas.md`)
- [x] T038 Update `AGENTS.md` SPECKIT active plan to implemented / none

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005) ──blocks──► all implementation
Phase 2 (T006–T012) ──► G1
Phase 3 (T013–T018, T032) ──► G2 ──► independent of Phase 5/6
Phase 4 (T019–T024) ──depends on──► Phase 2 (T008+); T020 requires T017 (stream refactor); T019/T021–T024 may start after T008 in parallel with Phase 3
Phase 5 (T025–T028) ──► G4 ──► parallel with Phase 6 after Phase 1
Phase 6 (T029–T031) ──► parallel with Phase 5
Phase 7 (T033–T038) ──after──► all story phases
```

### User story completion order

| Story | Phase | Depends on |
|-------|-------|------------|
| US1 (memory) | 2, 4 | Phase 1 contracts |
| US3 (visual/video) | 2 | Phase 1 |
| US2 (SSE) | 3, 4 | Phase 1; T020 after T017 |
| US5 (server queue) | 5 | Phase 1 |
| US4 (admin) | 6 | Phase 1 |

### Parallel execution examples

**After Phase 1 completes:**

```text
Parallel track A: T006, T007, T013, T014, T025, T026, T029 (all [P] tests)
Parallel track B: T005 (ADR) independent
```

**After T008 media cache lands:**

```text
Parallel: T009–T011 (display template/CSS) || T015–T016 (backend ping helper)
Parallel: T019/T021 (show_ads dedupe) || Phase 3 stream work — but T020 waits for T017
```

**After Phase 3 (T017–T018, T032) completes:**

```text
Parallel: T020–T024 (OnPush / ping CD)
```

**After core kiosk phases:**

```text
Parallel: T027 (sse_hub) || T031 (content-list reconcile)
```

---

## Implementation strategy

### MVP (minimum viable for live-event risk)

Complete **Phase 1 + Phase 2 + Phase 3 + Phase 4** (T001–T024, T032):

- Bounded media cache + single video decoder
- SSE comment pings + auth debounce
- OnPush + show_ads dedupe

This addresses P0 production symptoms (RAM growth, browser freeze, SSE churn).

### Incremental delivery

1. **Sprint 1 (P0)**: Phases 1–4 → deploy to staging kiosk soak
2. **Sprint 2 (P1/P2)**: Phases 5–6 → server queue + admin coalescing
3. **Sprint 3**: Phase 7 validation + contract consolidation sign-off

---

## Task summary

| Metric | Count |
|--------|------:|
| **Total tasks** | 38 |
| Setup & governance | 5 |
| US1 + US3 (Phase 2) | 7 |
| US2 (Phase 3) | 7 |
| US1 UI (Phase 4) | 6 |
| US5 (Phase 5) | 4 |
| US4 (Phase 6) | 3 |
| Polish (Phase 7) | 6 |
| **Parallelizable [P]** | 14 |

### Independent test criteria by story

| Story | How to verify independently |
|-------|----------------------------|
| US1 | `display-media-cache.service.spec.ts`; 8 h soak SC-001 (manual) |
| US2 | `display-stream.service.spec.ts` + `test_display_stream.py` ping/auth; SC-003 (T032) |
| US3 | `display-screen.component.spec.ts` single `<video>` + visual lab check |
| US4 | `content-list.component.spec.ts` switchMap; SC-005 manual |
| US5 | `test_display_sse_hub.py` queue ≤ 64; SC-006 integration |
