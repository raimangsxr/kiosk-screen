# Implementation Plan: Recuperación automática de rotación de anuncios en kioskos

**Input**: Feature specification from `specs/changes/057-fix-ad-rotation-recovery/spec.md`  
**Branch**: `057-fix-ad-rotation-recovery` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`CONTENT.ROTATION`, `DISPLAY.RUNTIME`)
- Active contracts read:
  - `specs/contracts/content-rotation/contract.md`
  - `specs/contracts/display-runtime/contract.md`
- Change specs read: CHG-057 (active), CHG-041 (orchestrator), CHG-051 (reaper, polling fallback), CHG-053 (show_ads dedupe)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`
- Code entrypoints verified:
  - Backend: `display_stream.open_display_stream`, `display.display_state_route`, `hooks.ensure_display_orchestrator`, `service.advance_ad`, `service.ensure_ad_rotation`, `remote_control.apply_remote_state`, `snapshot_builder.build_snapshot_payload`, `reaper.reap_idle_orchestrators`
  - Frontend: `display-stream.service.ts`, `display-screen.component.ts` (`seedViewerFromState`, fallback polling effect), `display-viewer.controller.ts` (`applyShowAds`), `display.api.ts` (`equalByDisplayFingerprint`), `display-fingerprint.ts`
- Tests identified: new integration/unit for stream ensure, state ensure, ads visibility rearma, reaper reconnect; frontend viewer + polling specs
- Archived or consolidated specs read: none

## Summary

Fix four independent causes of frozen sponsor rotation without page refresh: (1) reactivate orchestrator on SSE reconnect and polled `GET /display/state` when inactive; (2) re-arm ad rotation when remote control restores `adsVisible`; (3) extend polled display state with orchestrator `currentTop` / `currentAds` and sync client on fallback; (4) decouple sponsor **animation** from **media dedupe** so equivalent `show_ads` windows still animate when configured animation ≠ `none`.

## Technical Context

**Language/Version**: Python 3.12 (FastAPI), TypeScript / Angular 19+  
**Primary Dependencies**: `DisplayOrchestrator`, `OrchestratorRegistry`, `DisplaySseHub`, `DisplayPollingService`, `DisplayViewerController`  
**Storage**: PostgreSQL (unchanged); Redis orchestrator state (read for polled runtime fields)  
**Testing**: `pytest backend/tests`, `npm --prefix frontend run test`  
**Target Platform**: Kiosk `/display` runtime  
**Project Type**: Full-stack web app  
**Performance Goals**: SC-001–SC-004; no duplicate orchestrator timers (FR-008); poll ensure must be idempotent  
**Constraints**: Silent kiosk UX (FR-010); server-owned rotation; contract update before code; respect pause/fixed/iframe (US1 scenario 4, FR-007)  
**Scale/Scope**: Backend ensure hooks + `DisplayStateSchema` extension; frontend polling sync + animation split; no admin UI changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `CONTENT.ROTATION`, `DISPLAY.RUNTIME` |
| Manifest update needed and planned | pass — `CHG-057` entry during implement |
| Context pack created/updated | pass — [context-pack.md](./context-pack.md) |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass — see Phase 2 |
| Security and user-facing error exposure considered | pass — existing auth on `/display/state` and stream |
| Observability/audit impact considered | pass — silent recovery; optional existing reconnect banners only |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (decisions in [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/057-fix-ad-rotation-recovery/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── app/api/
│   ├── display.py                # ensure on GET /state; extend DisplayStateSchema
│   ├── display_stream.py         # ensure on GET /stream open
│   └── schemas.py                # currentTop, currentAds on DisplayStateSchema
├── app/application/display_orchestrator/
│   ├── hooks.py                  # (optional) extract ensure_if_inactive helper
│   ├── runtime_state.py          # NEW — shared currentTop/currentAds builder
│   ├── service.py                # advance_ad: cancel timer when ads hidden; ensure on show
│   ├── remote_control.py         # ensure_ad_rotation on adsVisible false→true
│   └── snapshot_builder.py       # delegate to runtime_state builder
└── tests/
    ├── integration/test_display_ad_rotation_recovery.py   # NEW
    └── unit/test_ad_rotation_recovery.py                  # NEW

frontend/
├── src/app/core/api/display.api.ts           # DisplayState runtime fields; fingerprint
├── src/app/display/
│   ├── display-fingerprint.ts                  # rotation position in poll fingerprint
│   ├── display-viewer.controller.ts            # animation vs media dedupe split
│   ├── display-screen.component.ts             # seedViewerFromState + poll sync
│   └── display-viewer.controller.spec.ts
└── display-screen.component.spec.ts

specs/contracts/{content-rotation,display-runtime}/contract.md
specs/manifest.yml
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. `ensure_display_orchestrator` on SSE stream open and `GET /display/state` (clarification Q4).
2. Full rotation recovery in loop-unpaused mode; sponsors-only when pause/fixed/iframe (clarification Q1).
3. Polled state carries `currentTop` / `currentAds` (same shape as SSE snapshot fields).
4. `advance_ad` early return when `adsVisible` false must cancel ad timer, not leave orphaned fire-and-die; `ensure_ad_rotation` on adsVisible restore.
5. Client: bump `adAnimationRun` on every `show_ads` when animation ≠ `none`; keep media warm dedupe on fingerprint.
6. Silent kiosk recovery (clarification Q5).

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

### Active contract updates (before code)

- `CONTENT.ROTATION` — ensure hooks, ads visibility rearma, polled runtime fields
- `DISPLAY.RUNTIME` — fallback sync from extended state; animation dedupe split

### ADR

No new ADR — extends ADR-0009 orchestration model; rationale in `research.md` §R6.

## Phase 2: Task Planning Approach

Map tasks to user stories:

| Story | Backend | Frontend | Tests |
|-------|---------|----------|-------|
| US1 P1 — Network reconnect | `ensure` on stream open + state route; reaper + reconnect + pause-mode integration tests | — | SSE reconnect after reaper; pause: ads only (FR-007) |
| US2 P1 — adsVisible restore | `advance_ad` timer fix; `apply_remote_state` → `ensure_ad_rotation` | — | hide/show ads rotation resumes |
| US3 P2 — Fallback sync | `ensure` on GET `/state`; extend schema + runtime builder | `seedViewerFromState`, fingerprint, poll apply | polled state advances ads/top |
| US4 P2 — Few sponsors animate | — | `applyShowAds` animation split | duplicate fingerprint still animates |

**Test strategy**

1. Unit: `advance_ad` with `adsVisible: false` cancels timer; `ensure_ad_rotation` after visibility restore; zero ads (FR-009); no duplicate timers after repeated ensure (FR-008).
2. Integration: register → bootstrap → simulate reaper idle → stream reconnect → `show_ads` events resume within 2× ad duration.
3. Integration: remote-control pause → reaper → reconnect → `show_ads` without new `show_content` (US1 scenario 4).
4. Integration: PUT remote-control hide ads → wait tick → show ads → `show_ads` within one ad duration.
5. Integration: GET `/display/state` after reaper returns advancing `currentAds` / `currentTop` across polls (US3).
6. Frontend unit: `applyShowAds` same fingerprint + animation `fade` increments `adAnimationRun`; media retain skipped.
7. Frontend unit: `equalByDisplayFingerprint` includes runtime fields (`display.api.spec.ts`, `display-fingerprint.spec.ts`).
8. Regression: CHG-053 media dedupe still skips redundant `retainAds` on identical fingerprint.

**Implementation order**

1. Contract deltas + manifest entry (TQ-001/TQ-003)
2. Backend `runtime_state` + schema extension
3. Backend ensure hooks (stream, state) + ads visibility fix
4. Frontend poll fingerprint + seed/sync
5. Frontend animation split
6. Tests + quickstart validation

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extend deprecated `GET /display/state` | Clarification Q2/Q4 require polled rotation sync + ensure | Client-side ad timers violate server-owned rotation (assumption) |
| `ensure` on every poll when inactive | FR-005 mandates reactivation before response | One-shot register-only ensure leaves fallback-only kiosks frozen after reaper |
