# Implementation Plan: Remote Control Admin Polish

**Branch**: `015-remote-control-polish` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-remote-control-polish/spec.md`

**Note**: This plan stops at design. It does not authorize implementation until tasks are generated and analyzed.

## Summary

Rewrite the `/remote-control` admin page so the operator can run a kiosk from a phone or a desktop without ambiguity. The new layout is mobile-first and built on existing Angular Material 3 components: a sticky top toolbar with a back button to the hall, a status pill that summarizes the current state, a content-mode card with a `mat-radio-group` (Rotation / Iframe), an iframe list rendered as `mat-radio-button` cards (title + shortened source URL), and an ads card with a `mat-slide-toggle`. Every successful action emits a `MatSnackBar` (3 s, "Dismiss" action). The technical approach is a single-component rewrite of `remote-control.component.ts`; the `RemoteControlFacade`, `RemoteControlApi`, backend endpoints, and route paths are unchanged.

## Technical Context

**Language/Version**: TypeScript with Angular 20.3.x and TypeScript 5.8 for the frontend. No backend changes.

**Primary Dependencies**: Angular standalone components, Angular Material 20.2 (cards, buttons, icons, snack-bar, radio, slide-toggle, toolbar), RxJS, Angular Router, Angular CDK, Jasmine/Karma.

**Storage**: N/A. The remote-control state already lives in the backend and is consumed through the existing facade signals.

**Testing**: `npm --prefix frontend run test` (Jasmine + Karma in `ChromeHeadlessNoSandbox`). Manual smoke validation on viewport sizes 360×640 and 1280×800.

**Target Platform**: Browser-based Angular admin application.

**Project Type**: Web application with separate frontend and backend packages; this feature touches only the frontend.

**Performance Goals**: No new perf goals. The page is a thin write-through control panel; backend polling remains the source of truth.

**Constraints**: Mobile-first (≤ 599.98 px), reuse existing `--mat-sys-*` tokens, reuse existing Material icons, no new icon font, no new shared UI component, no `date-fns` or other time library. The "Kiosk Screen" brand lockup reuses the markup from `hall.component.ts:26-32`.

**Scale/Scope**: One component file, one test file, zero backend changes, zero route changes, zero facade changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. Plan references `spec.md` FR-001 through FR-017 and SC-001 through SC-008.
- **Requirement clarity**: PASS. Four clarifications answered in `spec.md` (no `[NEEDS CLARIFICATION]` markers remain).
- **Plan alignment**: PASS. The plan covers only the remote-control page rewrite; it does not move the route, change the backend, or add a shared component.
- **Simplicity**: PASS. A single component rewrite is the smallest change that satisfies the spec. No new abstractions, no new dependencies, no new files beyond tests.
- **Contracts**: PASS. The only "contract" touched is the existing Angular Material control surface (radio group, slide toggle, snackbar). The backend HTTP contract is unchanged and is documented in `specs/006-remote-control-display/contracts/`.
- **Testing**: PASS. New component tests cover all four user stories; existing facade and API tests remain valid.
- **Security, observability, accessibility**: PASS. Administrator-only access is enforced by the existing `sessionGuard` on `/remote-control` and is not changed. Accessibility: the back button is the first focusable element with `aria-label="Back to hall"`; the radio group uses a `fieldset`/`legend` for screen readers; the status pill uses `aria-live="polite"`; the snackbar uses `MatSnackBar` defaults which expose `role="status"`.
- **No speculative scope**: PASS. The "Out of Scope" section in the spec lists 10 excluded items (no backend changes, no new shared components, no confirm dialog, no WebSocket, etc.).
- **Conflict handling**: PASS. Implementation must stop if the rewrite requires a backend change, a new dependency, a route move, or a new shared component, and must update the spec/plan before proceeding.

## Phase 0: Research

Research output is captured in [research.md](./research.md). Key decisions:

- Use the existing `mat-radio-group` for the Rotation / Iframe mode choice and render the iframe list as nested `mat-radio-button` items. This pattern is consistent with the existing Material 3 admin surface and keeps the operator on one control.
- Use `mat-chip-set` + `mat-chip` for the status pill. The chip is the smallest Material 3 surface that fits mode + ads visibility + display online + "Updated <time>" in one row, and supports the `aria-live="polite"` announcement.
- Inline a tiny `relativeTime(updatedAt)` pure function in the component instead of adding `date-fns`. The function covers "just now", "N minutes ago" up to 60 minutes, and an absolute short format beyond that.
- Use `MatSnackBar` (already provided through `provideAnimationsAsync`) with `duration: 3000` and `panelClass: ['app-snackbar']`. No custom snackbar component.
- Disable the radio group, the iframe list, and the ads toggle when `facade.saving()` is true. Add a "Saving…" suffix to the status pill.
- Reuse the `app-page-header`, `app-admin-state`, and `MatSnackBar` patterns from the rest of the app. No new shared component.

## Phase 1: Design

Design outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

(No new contracts: the backend HTTP contract is unchanged. The plan reuses the contracts documented in `specs/006-remote-control-display/contracts/`.)

## Proposed Architecture

### Frontend

```text
frontend/src/app/
├── features/
│   └── remote-control/
│       ├── remote-control.component.ts        (rewrite)
│       └── remote-control.component.spec.ts   (update)
└── shared/
    └── (no new files)
```

Rules:

- The `RemoteControlComponent` is the only file rewritten. Its public surface (selector `app-remote-control`, standalone, no input/output) is unchanged.
- The `RemoteControlFacade` and `RemoteControlApi` are NOT modified. The new component reads from the existing signals (`state`, `iframeOptions`, `loading`, `saving`, `error`).
- The `mat-toolbar` is inlined in the component template (no `app-remote-toolbar`). The toolbar mirrors the brand lockup in `hall.component.ts:26-32` and the user menu reuses `UserMenuComponent`.
- The `mat-radio-group` uses the `change` event on the group (not on each radio) to fire the facade call. The selected iframe is the radio's value.
- The snackbar pattern matches `display-config.component.ts:341`, `api-keys-list.component.ts:201-241`, and `content-list.component.ts:370-390`.
- The relative time helper is a private pure function `relativeTime(iso: string): string` defined at the bottom of the component file.
- The mobile-first layout uses a single column at ≤ 599.98 px. The toolbar and the status pill remain sticky.
- The back button uses `mat-icon-button` with `routerLink="/hall"` and is the first interactive element on the page (so it is the first focus stop after `Tab`).

### Backend

No backend changes. The endpoints, the schemas, and the service layer are untouched. The plan does NOT change the response of `/api/display/remote-control/state` or `/api/display/remote-control/iframe-options`.

## API And UI Contracts

Backend: unchanged. See `specs/006-remote-control-display/contracts/backend-contract.md` for the existing contract.

UI: the page-level contract is captured in `spec.md` acceptance scenarios. The component-level contract is:

- Inputs: none.
- Outputs: none.
- State: reads from `RemoteControlFacade` signals only.
- Side effects: navigates to `/hall` on the back button; emits snackbars on action success; delegates all writes to the facade.

## Data Model And Migration

No data model changes. No migration.

## Security Model

- Administrator-only access is enforced by `sessionGuard` on `/remote-control` in `app.routes.ts:25`. The rewrite does not move or rename the route.
- Inputs at the component boundary are limited to the iframe id (a string the backend has already validated) and the boolean ads visibility. No new validation surface.
- The snackbar and status pill are status-only. They do not leak user-controlled content.

## Observability

- Errors are surfaced as `app-admin-state` blocks (existing pattern) and the facade already records the backend `error` signal. No new logging is added.
- The page does not add a polling loop. The status pill reflects the most recent `facade.refresh()` result.

## Accessibility

- The back button is the first focusable element (`<button mat-icon-button ...>` before the page header). It has `aria-label="Back to hall"`.
- The mode radio group is wrapped in a `<fieldset>` with a `<legend>` for screen readers.
- The iframe list radios have individual labels with title and source URL. The source URL is wrapped in a `<span class="remote-control__iframe-url">` with `aria-hidden="false"` so it is announced.
- The status pill has `aria-live="polite"` so changes are announced.
- The "Saving…" suffix on the status pill also uses `aria-live="polite"`.
- The snackbar uses `MatSnackBar` defaults (which set `role="status"` or `role="alert"` depending on the action).
- Every interactive control has a visible focus ring (the existing global `:focus-visible` rule).

## Testing Strategy

- **Frontend unit tests** (`remote-control.component.spec.ts`):
  - Renders the toolbar with the back button as the first focusable element.
  - Renders the page header with the eyebrow "Hall" and the title "Remote control".
  - Renders the status pill with the current mode, ads visibility, and a human-readable updated time.
  - Renders the Rotation and Iframe radio group with the active mode preselected.
  - When `iframeOptions()` is empty, the Iframe radio is disabled and the helper text + CTA are visible.
  - When `iframeOptions()` has items, each item is rendered with its title and a shortened source URL.
  - Picking the Rotation radio calls `facade.setLoopMode()`.
  - Picking an iframe radio calls `facade.setIframeMode(id)`.
  - Toggling the ads toggle calls `facade.setAdsVisible(boolean)`.
  - On success of any of the three actions, the snackbar is shown with the expected text and 3000 ms duration.
  - On error, the inline `app-admin-state` error block is rendered and no snackbar is shown.
  - On `facade.refresh()` error, the mode/ads controls are not rendered and the error block is.
  - When `facade.saving()` is true, the radio group, the iframe list, and the ads toggle are disabled, and the status pill shows the "Saving…" suffix.
  - The back button navigates to `/hall` (`routerLink`).
- **Existing tests that must continue to pass**:
  - `remote-control.facade.spec.ts` (5 tests, no change).
  - `app.routes.spec.ts` (route still resolves).
- **Manual smoke** (Chrome DevTools, viewports 360×640 and 1280×800):
  - Toolbar sticky at the top.
  - Status pill shows the right mode + ads + updated time.
  - Radio group is reachable by keyboard, focus ring visible.
  - Snackbar appears and dismisses after 3 s.
  - Back button returns to `/hall`.
  - No horizontal scroll on 360 px viewport.

## Local Development Setup

- Use the existing local lab startup from `README.md`.
- Sign in as an administrator and open the kiosk display in one browser tab.
- Open `/remote-control` in a second tab and exercise every action.

## Risks And Assumptions

- **Risk**: A future Angular Material update may change the `mat-radio-group` / `mat-radio-button` DOM. **Mitigation**: the tests assert user-visible text and the snackbar, not the internal DOM structure of the radio group.
- **Risk**: The `relativeTime` helper is duplicated if a second page ever needs it. **Mitigation**: the helper stays private to the component for now; the spec's Out of Scope list explicitly defers a shared pipe.
- **Risk**: The toolbar inlined in the component is not the same as the admin toolbar. **Mitigation**: the spec's Out of Scope list explicitly defers a shared `app-remote-toolbar`; the inlined toolbar matches the visual contract documented in the spec.
- **Assumption**: The existing `mat-radio-group` / `mat-radio-button` accessibility semantics (fieldset/legend handling) are sufficient.
- **Assumption**: The existing `MatSnackBar` provider is already wired by `provideAnimationsAsync()` in `app.config.ts`.
- **Assumption**: No new icons are required (`arrow_back`, `loop`, `cast_connected`, `check_circle`, `campaign`, `visibility_off`, `arrow_forward` are all already in the registered icon font).

## Project Structure

### Documentation (this feature)

```text
specs/015-remote-control-polish/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/app/
└── features/
    └── remote-control/
        ├── remote-control.component.ts        (rewrite)
        └── remote-control.component.spec.ts   (update)
```

**Structure Decision**: Use the existing two-package web application layout. The feature touches exactly two files in `frontend/src/app/features/remote-control/`. No backend changes, no shared component, no new dependency, no new route.

## Complexity Tracking

No constitution violations or unjustified complexity are planned.

## Post-Design Constitution Check

- **Spec traceability**: PASS. The plan walks through every user story and FR in the spec.
- **Requirement clarity**: PASS. No `[NEEDS CLARIFICATION]` markers remain.
- **Plan alignment**: PASS. The plan covers only the page rewrite; the route, the facade, the API, and the backend are explicitly out of scope.
- **Simplicity**: PASS. The smallest change that satisfies the spec is a single-component rewrite plus its spec update. No new abstractions, no new dependencies, no new shared components.
- **Contracts**: PASS. The HTTP contract is unchanged; the UI contract is captured in the spec's acceptance scenarios.
- **Testing**: PASS. Frontend unit tests cover every acceptance scenario; existing facade and route tests remain valid; manual smoke covers responsive layout.
- **Security, observability, accessibility**: PASS. Administrator-only access, safe error rendering, keyboard navigation, `aria-live` regions, and the first-focusable back button are planned.
- **No speculative scope**: PASS. The spec's Out of Scope list is respected; the plan does not introduce a WebSocket, a confirm dialog, a shared toolbar, or a time pipe.
- **Conflict handling**: PASS. The plan instructs the implementer to stop and update the spec if any of the out-of-scope items become necessary.
