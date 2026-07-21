# Implementation Plan: Per-Display Iframe Layout Profiles

**Branch**: `042-per-display-iframe-layout` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/042-per-display-iframe-layout/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-042 entry to be added at implementation)
- Active contracts read: `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `IFRAMES.VIDEO_END` (iframe baseline)
- Change specs read: `spec.md`, `context-pack.md`, clarifications session 2026-07-17
- Context pack read or created: `context-pack.md` (updated in this plan)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`; new ADR-0010 drafted
- Sibling contracts read: `../amrn-bull/specs/contracts/app-core/contract.md`, `../amrn-escalabirras-dual/specs/contracts/frontend-angular/contract.md`
- Code entrypoints verified:
  - `frontend/src/app/display/display-screen.component.ts` (iframe URL, top region)
  - `frontend/src/app/display/display-stream.service.ts` (kiosk register — label not yet sent)
  - `backend/app/api/display_stream.py` (`KioskRegisterRequest.label` already exists)
  - `backend/app/repositories/models/kiosk_connection.py` (`label` column exists)
  - `backend/app/repositories/models/iframe.py` (family override column to add)
- Tests identified:
  - new `backend/tests/unit/test_embed_density_resolver.py`
  - new `backend/tests/integration/test_display_layout_api.py`
  - extend `backend/tests/integration/test_display_stream.py` (layout in snapshot)
  - `frontend/src/app/display/display-screen.component.spec.ts` (iframe URL params, hidden panel)
  - new `frontend/src/app/display/display-layout.service.spec.ts`
  - sibling manual E2E per [quickstart.md](./quickstart.md)
- Archived or consolidated specs read: none

## Summary

Kiosk-screen gains **per-display vertical density** for embedded AMRN tournament apps.
Each physical screen claims a **stable display label**, receives an **effective
density** resolved as `local override → layout profile → organization default`,
persists it **authoritatively in PostgreSQL**, and passes it to iframes via a
shared **embed density protocol** (URL query param + `bull:config` postMessage).
Sibling repos **amrn-bull** and **amrn-escalabirras-dual** honor the override in
embed mode so global `app_height_px` changes do not affect calibrated kiosks.
Admin gains layout profile CRUD, profile assignment to online kiosks / display
labels, and operations visibility of density source per connected kiosk.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12+ (FastAPI), TypeScript / Angular 20 |
| **Primary dependencies** | FastAPI, SQLAlchemy, Alembic, PostgreSQL, Angular `EventSource`, iframe `postMessage` |
| **Storage** | PostgreSQL (`display_devices`, `display_layout_profiles`, org defaults, iframe family override); kiosk `localStorage` cache |
| **Testing** | pytest (unit + integration), Jasmine/Karma (display + admin) |
| **Target** | `/display` runtime, admin layout screens, sibling AMRN embed clients |
| **Performance** | Density apply on iframe load < 500 ms perceived; layout PATCH fan-out < 1 s (parity with `config_updated`) |
| **Constraints** | Hidden on-display tuning UI; joint acceptance with bull + escalabirras; live-event safe (no iframe reload storm) |
| **Scale** | 3–20 kiosks per org; 2 embedded app families in v1 |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass — `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION` |
| Manifest update planned | pass — CHG-042 entry in `manifest.yml` at implementation |
| Context pack present | pass — updated |
| Contract update before implementation | yes — `contracts/contract-deltas.md` |
| Tests for changed behavior | pass — resolver unit + layout API integration + display specs + E2E gate |
| Security / error exposure | pass — density controls hidden; admin RBAC `content_manager` |
| Observability / audit | pass — optional `display_layout_calibrated` audit event (Phase 2) |
| No unjustified archive reads | pass |
| Durable rationale in ADR | pass — ADR-0010 |

## Project Structure

### Documentation for this change

```text
specs/changes/042-per-display-iframe-layout/
├── spec.md
├── context-pack.md
├── plan.md                         ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── embed-density-protocol.md
│   ├── contract-deltas.md
│   └── sibling-app-deltas.md
├── checklists/requirements.md
└── tasks.md                        ← /speckit-tasks
```

### Source code (planned)

```text
backend/
├── app/
│   ├── application/display_layout/
│   │   ├── resolver.py             # effective density + family detection
│   │   └── service.py
│   ├── api/
│   │   ├── display_layout.py       # profiles, devices, overrides
│   │   └── display_stream.py       # register links label → display_device
│   └── repositories/models/
│       ├── display_device.py
│       ├── display_layout_profile.py
│       └── iframe.py               # + embed_app_family nullable
├── alembic/versions/               # 0016_display_layout_profiles
└── tests/
    ├── unit/test_embed_density_resolver.py
    └── integration/test_display_layout_api.py

frontend/
└── src/app/
    ├── display/
    │   ├── display-layout.service.ts
    │   ├── display-screen.component.ts   # iframe URL + hidden panel
    │   └── display-stream.service.ts     # send label on register
    └── features/
        ├── display-layout/               # admin profiles + assignment
        └── dashboard/                    # SC-005 density source column

../amrn-bull/frontend/                    # embed override (joint gate)
../amrn-escalabirras-dual/frontend/       # embed override (joint gate)
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md). All technical unknowns resolved:

- URL query `embed_app_height_px` + `bull:config` postMessage (dual channel)
- PostgreSQL authoritative storage; kiosk `localStorage` cache
- Stable `display_devices` keyed by org + label (extends existing register `label`)
- Host-based family detection with per-iframe admin override
- Joint delivery with sibling repos before CHG-042 complete

## Phase 1: Design & Contracts

Completed artifacts:

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| Embed protocol | [contracts/embed-density-protocol.md](./contracts/embed-density-protocol.md) |
| Contract deltas | [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Sibling deltas | [contracts/sibling-app-deltas.md](./contracts/sibling-app-deltas.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
| ADR | [docs/adr/0010-per-display-iframe-embed-density.md](../../docs/adr/0010-per-display-iframe-embed-density.md) |

### Active contract updates (before implementation)

Merge `contracts/contract-deltas.md` into:

1. `specs/contracts/display-runtime/contract.md`
2. `specs/contracts/display-config-session/contract.md`

Update iframe admin contract if consolidated under `IFRAMES.VIDEO_END` or add delta note for `embed_app_family` field.

### Implementation phases vs user stories

| Phase | User stories | Key deliverable |
|-------|--------------|-----------------|
| 1 | US-1 (core) | DB + resolver + iframe URL injection + sibling embed override |
| 2 | US-2 | Admin profiles CRUD + assignment + operations visibility |
| 3 | US-3 | Hidden on-display panel + local override PATCH + reset |
| 4 | Gate | E2E quickstart SC-001–SC-006 across 3 aspect ratios |

## Phase 2: Task Planning Approach

Tasks will be grouped by phase above. `/speckit-tasks` should:

1. Split **kiosk-screen** and **sibling** tracks with explicit joint gate task (TQ-004).
2. Contract merge tasks before code (constitution IV).
3. Map resolver unit tests to FR-004/FR-008 precedence rules.

### Test strategy

1. **Unit** — `embed_density_resolver`: precedence chain, family detection, bounds clamping.
2. **Integration** — layout profile CRUD; register with label creates/links `display_device`; three kiosks different overrides.
3. **Frontend** — iframe URL contains `embed_app_height_px`; hidden panel not in DOM until gesture; cache read on boot.
4. **Manual E2E** — [quickstart.md](./quickstart.md) three-browser calibration + bull + escalabirras.

### Phase gates

| Gate | Criterion |
|------|-----------|
| G1 → Phase 2 | Single kiosk: override density visible in bull iframe without global admin change |
| G2 → Phase 3 | Two profiles assigned; admin operations view shows density source |
| G3 → Complete | SC-006 E2E on bull + escalabirras; three aspect ratios SC-004 |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Cross-repo joint gate | Embed apps must honor override (TQ-004) | URL-only without sibling changes is ignored by current apps |
| Dual embed channel (URL + postMessage) | URL for first paint; postMessage for live tweak without reload | URL-only requires iframe reload on every nudge |
| New `display_devices` table | Label must survive ephemeral `kioskId` / SSE session | Reusing `kiosk_connections` alone loses history on disconnect |

## Estimated effort

| Phase | Estimate |
|-------|----------|
| Phase 1 — Core density + siblings | 3–4 days |
| Phase 2 — Admin profiles | 2 days |
| Phase 3 — On-display tuning | 1 day |
| Phase 4 — E2E + contracts | 1 day |
| **Total** | **~7–8 days** |
