# Implementation Plan: Live Density Profile Calibration

**Branch**: `043-live-density-preview` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/043-live-density-preview/spec.md`

## Context Grounding

- Manifest read: yes — CHG-043 entry added in this plan
- Active contracts read: `DISPLAY.CONFIG_SESSION`, `DISPLAY.RUNTIME`, `IFRAMES.VIDEO_END` (iframe list)
- Change specs read: `spec.md`, `context-pack.md`; parent `042-per-display-iframe-layout/spec.md`
- Context pack read or created: `context-pack.md` (updated)
- ADRs read: `docs/adr/0010-per-display-iframe-embed-density.md`; new ADR-0011 drafted in research
- Code entrypoints verified:
  - `frontend/src/app/features/display-layout/display-layout-profiles.component.ts` (replace form with calibration workspace)
  - `frontend/src/app/display/display-density-panel.component.ts` (slider pattern reuse)
  - `frontend/src/app/display/display-layout.service.ts` (`applyLayoutUpdated`, iframe URL build)
  - `frontend/src/app/display/display-screen.component.ts` (`layout_updated` effect)
  - `frontend/src/app/features/remote-control/remote-control.facade.ts` (`setIframeMode`)
  - `backend/app/application/display_layout/service.py` (`_publish_layout_to_device`, profile CRUD)
  - `backend/app/api/display_layout.py` (admin profile routes)
- Tests identified:
  - `backend/tests/integration/test_display_layout_api.py` (preview fanout, targeted kiosk)
  - `backend/tests/unit/test_embed_density_resolver.py` (unchanged; regression)
  - new `frontend/src/app/features/display-layout/display-layout-calibration.facade.spec.ts`
  - extend `display-layout-profiles.component.spec.ts`
  - manual quickstart Phase 1–3
- Archived or consolidated specs read: none

## Summary

Extend CHG-042 admin profile management with a **live calibration workspace**: the operator
selects a **connected test kiosk** and a **preconfigured iframe**, switches the kiosk to
iframe mode, and tunes density with **sliders**. Each resting adjustment after **~500 ms
debounce** autosaves the profile and pushes a **targeted `layout_updated` SSE** to the
test kiosk only (`source: profile_preview` — no `local_overrides` write). The kiosk applies
density via existing embed protocol (URL param + `bull:config`) in the real top-content region.
Other kiosks assigned to the profile are **not** updated on autosave (FR-012); production
fanout happens via **Aplicar a pantallas asignadas** (`POST .../apply-assigned`) or on
assignment confirm in the assign flow (FR-013, FR-014).

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12+ (FastAPI), TypeScript / Angular 20 |
| **Primary dependencies** | FastAPI, SQLAlchemy, existing SSE hub (CHG-041), Angular Material slider, RxJS `debounceTime` + `switchMap` |
| **Storage** | No new tables; `display_layout_profiles.densities` JSONB updated on autosave |
| **Testing** | pytest integration (preview endpoint), Jasmine facade/unit, manual quickstart |
| **Target** | `/admin/display-layout` calibration UI; `/display` test kiosk; remote control iframe mode |
| **Performance** | Preview visible on kiosk within 2 s of slider rest (SC-001); debounce 500 ms; one PUT per resting value |
| **Constraints** | FR-008: no local override during preview; FR-012: autosave preview targets test kiosk only; FR-013: explicit apply for assigned displays; Spanish copy; content_manager RBAC |
| **Scale** | 1 test kiosk per calibration session; 2 families (bull, escalabirras) |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass — `DISPLAY.CONFIG_SESSION`, `DISPLAY.RUNTIME` |
| Manifest update planned | pass — CHG-043 entry |
| Context pack present | pass — updated |
| Contract update before implementation | yes — `contracts/contract-deltas.md` |
| Tests for changed behavior | pass — integration + facade specs + quickstart |
| Security / error exposure | pass — admin RBAC; preview limited to org kiosks |
| Observability / audit | pass — reuse profile update/apply paths; no new audit event type required |
| No unjustified archive reads | pass |
| Durable rationale in ADR | pass — ADR-0011 (preview vs override) |

## Project Structure

### Documentation for this change

```text
specs/changes/043-live-density-preview/
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
backend/
├── app/
│   ├── application/display_layout/
│   │   └── service.py              # preview_layout_on_kiosk; narrow profile fanout
│   └── api/
│       └── display_layout.py       # PUT profile + previewKioskId; POST apply-assigned
└── tests/
    └── integration/test_display_layout_api.py

frontend/
└── src/app/features/display-layout/
    ├── display-layout-profiles.component.ts   # shell → calibration workspace
    ├── display-layout-calibration.component.ts  # sliders, kiosk/iframe pickers, status
    ├── display-layout-calibration.facade.ts   # debounced autosave + remote control
    └── display-layout.api.ts                  # preview + autosave helpers
```

## Phase 0: Outline & Research

See [research.md](./research.md). Key decisions:

- Preview via targeted SSE `layout_updated` with `source: profile_preview` — not `local_overrides`
- Debounced PUT profile + `previewKioskId` query param triggers single-kiosk preview fanout only (FR-012)
- Production fanout to assigned devices via `POST .../apply-assigned` or existing `PATCH .../devices/{id}` on assign confirm (FR-013, FR-014)
- Confirmation dialog before remote-control iframe switch; `setIframeMode` on accept (FR-015)
- Reuse `MatSlider` pattern from `display-density-panel.component.ts`

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

Active contract merges (before implementation):

- `specs/contracts/display-config-session/contract.md` — live calibration admin flow
- `specs/contracts/display-runtime/contract.md` — `profile_preview` source + targeted SSE

ADR: `docs/adr/0011-live-profile-calibration-preview.md`

## Phase 2: Task Planning Approach

Tasks map to user stories:

| Story | Tasks |
|-------|-------|
| US1 Create + live sliders | Calibration component, debounced autosave, preview fanout, autosave status chip, iframe dialog |
| US2 Edit existing | Load profile; **Aplicar a pantallas asignadas**; stale concurrent edit notice |
| US3 Assign + fine-tune | Pre-select kiosk; `PATCH` assign triggers production fanout to target (FR-014) |

Test strategy:

1. Unit: debounce coalescing (10 moves → 1 save)
2. Integration: PUT profile with `previewKioskId` emits layout_updated to one kiosk only
3. Component: sliders disabled until kiosk + iframe selected
4. Manual: quickstart with physical display

Gates:

- **G1**: Slider move → kiosk iframe resizes within 2 s without local override row change
- **G2**: Autosave persists; reload admin shows matching values
- **G3**: Second kiosk with different profile unchanged during test-kiosk preview

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Targeted preview fanout + apply-assigned endpoint | FR-008/FR-012/FR-013 require preview without override and without affecting assigned kiosks on autosave | Fanout to assigned devices on every autosave would disrupt live event displays during calibration |
| Remote control from layout admin | Test kiosk must show real top region in iframe mode | Embedded admin iframe preview would not match 5:1 layout (spec clarification) |
