# Implementation Plan: Administración de pantallas registradas

**Input**: Feature specification from `specs/changes/049-display-device-admin/spec.md`  
**Branch**: `049-display-device-admin` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`specs/manifest.yml` — `DISPLAY.CONFIG_SESSION`)
- Active contracts read: `specs/contracts/display-config-session/contract.md`
- Change specs read: CHG-049 (active), CHG-045 (display device CRUD), CHG-035 (admin mobile patterns)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: none required (admin UX on existing APIs)
- Code entrypoints verified: `display-device.api.ts`, `iframe.facade.ts`, `iframe-form.component.ts`, `admin-navigation.service.ts`, `app.routes.ts`, `api-keys-list.component.ts` (list CRUD pattern)
- Tests identified: new display-devices list + facade specs; update `iframe-form.component.spec.ts`
- Archived or consolidated specs read: none

## Summary

Add a **dedicated admin screen** at `/admin/displays` for managing registered display devices (list, pre-create, rename, delete) with live connection status refreshed every ~30 s. Centralize lifecycle actions here and **remove** create/delete controls from the iframe scale matrix (scales + «Gestionar pantallas» link only). **No backend API changes** — reuse existing `GET/POST/PATCH/DELETE /api/admin/display-devices` and `GET /api/admin/display/kiosks/live`.

## Technical Context

**Language/Version**: TypeScript / Angular 19+ (frontend primary); Python / FastAPI (no server changes)  
**Primary Dependencies**: Angular Material (`MatTable`, `MatDialog`, `MatSnackBar`), RxJS (`interval`, `forkJoin`, `switchMap`), `AdminListComponent`, `ConfirmDialogService`, `DisplayDeviceApiService`, `LiveKiosksApiService`  
**Storage**: PostgreSQL `display_devices` (unchanged); client-side merge only  
**Testing**: Angular unit specs; existing `backend/tests/integration/test_display_devices_api.py` unchanged  
**Target Platform**: Admin browser (desktop + compact mobile via `AdminListComponent`)  
**Project Type**: Full-stack web app — **this change is frontend-primary** (contract + manifest updates only)  
**Performance Goals**: List load & mutations ≤30 s operator time (SC-002); connection status refresh ≤30 s (SC-006)  
**Constraints**: Spanish UI; `CONTENT_MANAGEMENT_ROLES` gate; no new endpoints; iframe form lifecycle removal per clarifications  
**Scale/Scope**: Tens of displays per org (≤50 typical); full client-side sort; no pagination required initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `DISPLAY.CONFIG_SESSION` |
| Manifest update needed and planned | pass — add CHG-049 in tasks |
| Context pack created/updated | pass |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass |
| Security and user-facing error exposure considered | pass — existing auth roles; API errors via `adaptApiError` / snackbar |
| Observability/audit impact considered | pass — none (no new server mutations) |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (no NEEDS CLARIFICATION; see [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/049-display-device-admin/
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
frontend/
├── src/app/app.routes.ts
├── src/app/features/admin-shell/admin-navigation.service.ts
├── src/app/features/display-devices/              # NEW feature folder
│   ├── display-devices-list.component.ts
│   ├── display-devices-list.component.spec.ts
│   ├── display-devices.facade.ts
│   ├── display-devices.facade.spec.ts
│   └── display-device-rename-dialog.component.ts
├── src/app/features/iframes/
│   ├── iframe-form.component.ts                   # remove lifecycle UI; add link
│   ├── iframe-form.component.spec.ts              # update tests
│   └── iframe.facade.ts                           # remove precreate/delete device methods

specs/contracts/display-config-session/contract.md  # pre-impl update
specs/manifest.yml                                   # CHG-049 entry
```

**Not touched**: `backend/app/api/display_devices.py`, Alembic migrations, kiosk `display/**` runtime.

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Route `/admin/displays`; nav label **Pantallas** in Configuración group.
2. New `DisplayDevicesFacade` merging device list + live kiosks by **label**.
3. `interval(30_000)` + `takeUntilDestroyed` for connection refresh while view open.
4. Inline create form in list header; rename via `MatDialog`; delete via `ConfirmDialogService` with connected warning.
5. Remove iframe form create/delete; link to `/admin/displays`.
6. No backend or ADR changes.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

1. `specs/contracts/display-config-session/contract.md` — merge deltas from `contracts/contract-deltas.md`.
2. `specs/manifest.yml` — add CHG-049 under `DISPLAY.CONFIG_SESSION.related_changes`.

## Phase 2: Task Planning Approach

Tasks are ordered to satisfy **FR-009 before lifecycle mutations**: iframe decoupling (US4) runs immediately after scaffold, before pre-create/rename/delete on `/admin/displays`.

| Phase | Stories | Focus |
|-------|---------|-------|
| 1 | Setup | Contract delta merge, manifest |
| 2 | — | Routes, nav, facade, list shell |
| 3 | US4 | Iframe form cleanup (blocking for US2/US3) |
| 4 | US1 | List inventory, connection merge, 30 s poll |
| 5 | US2 | Inline pre-create form + validation |
| 6 | US3 | Rename dialog + delete confirmation |
| 7 | Polish | Specs, quickstart validation, build |

### Test strategy

| Layer | Coverage |
|-------|----------|
| `display-devices-list.component.spec.ts` | List render, empty state, create, rename dialog open/cancel, delete confirm, connected chip, 403 error state |
| `display-devices.facade.spec.ts` | Label merge, alphabetical sort, `fakeAsync` poll tick updates `connected` (SC-006) |
| `iframe-form.component.spec.ts` | No create/delete buttons; «Gestionar pantallas» link present |
| Backend | Regression only — existing `test_display_devices_api.py` |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
