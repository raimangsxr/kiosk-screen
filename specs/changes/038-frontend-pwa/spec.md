---
id: CHG-038
type: change
status: implemented
modifies:
  - OPS.PLATFORM
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Frontend Progressive Web App

**Feature Branch**: `038-frontend-pwa` (delivered in commit `208d0a9`)

**Created**: 2026-07-07

**Status**: Implemented

**Input**: Transform the Angular frontend into an installable PWA with service worker caching, web manifest, app icons, dynamic branding icon from event logo, document title from event name, and an update banner when a new build is available.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `OPS.PLATFORM`
- Contract update required before implementation: yes

## User Scenarios & Testing

### User Story 1 — Kiosk can be installed as a standalone app (Priority: P1)

Venue staff install the kiosk UI on a dedicated display device. The app registers a service worker in production, ships a web manifest, and provides standard icon sizes for home-screen installation.

**Independent Test**: Production build serves `manifest.webmanifest`, `ngsw-worker.js`, and icon assets; service worker registers after bootstrap stabilizes.

**Acceptance Scenarios**:

1. **Given** a production build, **When** the app loads, **Then** `provideServiceWorker` registers with `registerWhenStable:30000` and is disabled in dev mode.
2. **Given** `ngsw-config.json`, **When** assets are prefetched, **Then** app shell and static assets are cached per Angular SW policy.
3. **Given** `manifest.webmanifest`, **When** the user installs the PWA, **Then** name, icons, theme, and display mode are defined.

---

### User Story 2 — Branding reflects the active event (Priority: P1)

When event branding loads, the document title and favicon/apple-touch icon update from the organizer logo and event name.

**Acceptance Scenarios**:

1. **Given** branding with `eventName` and `organizerLogoUrl`, **When** branding loads, **Then** `document.title` is `{eventName} · Kiosk Screen`.
2. **Given** logo load failure, **When** icon is resolved, **Then** a default PWA icon is used.
3. **Given** event config sync in another tab, **When** a change event fires, **Then** branding refreshes and icon/title update.

---

### User Story 3 — Operators are notified of app updates (Priority: P2)

When a new service worker version is available, a non-blocking banner prompts the user to reload.

**Acceptance Scenarios**:

1. **Given** a waiting service worker, **When** `SwUpdate` reports `VERSION_READY`, **Then** the update banner is shown.
2. **Given** the user accepts reload, **When** `activateUpdate()` succeeds, **Then** the page reloads to the new version.

## Functional Requirements

- **FR-001**: Production builds MUST enable Angular service worker via `ngsw-config.json`.
- **FR-002**: The app MUST ship `manifest.webmanifest` and multi-size icons under `public/icons/`.
- **FR-003**: `PwaBrandingIconService` MUST sync document title and icon link from event branding.
- **FR-004**: `PwaUpdateService` and update banner MUST surface available SW updates in production.
- **FR-005**: Service worker MUST be disabled in development mode.

## Success Criteria

- **SC-001**: Unit tests cover branding icon rendering and update service behavior.
- **SC-002**: `OPS.PLATFORM` contract documents owned PWA paths and golden-path behavior.
- **SC-003**: Production nginx image serves SW and manifest without cache-breaking misconfiguration for `ngsw.json`.

## Non-goals

- Offline kiosk display operation without backend (SW caches shell only).
- Multi-locale PWA paths (CHG-022 cancelled).
- Push notifications.
