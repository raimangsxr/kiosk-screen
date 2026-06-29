---
id: CHG-022
type: change
status: cancelled
cancelled_reason: Product decision to drop multi-language UI; the frontend ships Spanish only.
modifies:
  - I18N.LOCALE
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: false
depends_on: []
---
# Feature Specification: Locale Switching at Build Time (CANCELLED)

**Feature Branch**: `022-i18n-locale-switching`
**Spec Directory**: `specs/changes/022-i18n-locale-switching/`
**Created**: 2026-06-26
**Status**: In Progress

**Input**: The user reports that selecting a language from the user
menu (Spanish / English) does not actually change the UI strings —
the chosen preference is persisted and `<html lang>` is updated, but
the rendered text remains in the build's source locale. The root
cause is that `@angular/localize` substitutes messages at build
time, the Docker image only ships the default (`es-ES`) bundle, and
`nginx` has no path by which to serve an English bundle even if it
were built.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Switching to English actually shows English (Priority: P1)

A logged-in operator clicks the user menu, picks "English", and the
UI immediately swaps to English: navigation labels, button copy,
form errors, dialog titles, the auth login screen — everything
sourced from `@angular/localize` or from the `LOCALE_ID` pipes.

**Why this priority**: the bug as reported. Without it the user menu
is misleading.

**Independent Test**: from `/es/hall`, open the user menu, pick
"English". The browser navigates to `/en/hall` and renders the
English copy for the hall page, the user menu itself, and the
authenticated toolbar.

**Acceptance Scenarios**:

1. **Given** the operator is at `/es-ES/hall`, **When** they choose
   "English" from the user menu, **Then** the browser navigates to
   `/en-US/hall` and the hall copy is rendered in English.
2. **Given** the operator is at `/es-ES/admin/content`, **When** they
   choose "English", **Then** the browser navigates to
   `/en-US/admin/content` and the content list copy is in English.
3. **Given** the operator reloads `/en-US/hall` after switching,
   **When** the page boots, **Then** the rendered locale is English
   without any flash of Spanish content.
4. **Given** the operator picks "Español" while at `/en-US/admin`,
   **When** the switch happens, **Then** the browser navigates to
   `/es-ES/admin` and the dashboard copy is in Spanish.

### User Story 2 — Root URL lands on a sensible locale (Priority: P1)

An anonymous visitor hits `http://<host>/` without ever having
selected a locale. nginx negotiates the default from the
`Accept-Language` header (`en*` → `/en/`, anything else or absent →
`/es/`) with a 302 redirect so the URL becomes canonical.

**Why this priority**: a kiosk URL pasted on a clipboard must lead
to a working page; today it serves whatever single bundle the Docker
image ships.

**Acceptance Scenarios**:

1. **Given** an unauthenticated browser with no saved preference and
   `Accept-Language: es-ES,es;q=0.9`, **When** it requests `/`,
   **Then** nginx returns `302` to `/es-ES/` and the SPA boots in
   Spanish.
2. **Given** an unauthenticated browser with
   `Accept-Language: en-US,en;q=0.9`, **When** it requests `/`,
   **Then** nginx returns `302` to `/en-US/` and the SPA boots in
   English.
3. **Given** an unauthenticated browser with no `Accept-Language`
   header, **When** it requests `/`, **Then** nginx returns `302`
   to `/es-ES/` (the project's primary locale, defined as
   `DEFAULT_LOCALE` in `LocaleService`).

### User Story 3 — Auth session survives a locale switch (Priority: P2)

The auth cookie is `HttpOnly` and is not bound to a path prefix.
Switching from `/es/...` to `/en/...` does not invalidate the
session.

**Acceptance Scenarios**:

1. **Given** an operator is signed in and at `/es-ES/admin/content`,
   **When** they switch to English, **Then** the browser lands on
   `/en-US/admin/content` without redirecting through `/login`.

### User Story 4 — Service Worker and `index.html` are not cached across switches (Priority: P2)

Each `index.html` carries `Cache-Control: no-cache`, and so do the
Service Worker scripts (`ngsw-worker.js`, `ngsw.json`,
`manifest.webmanifest`). The duplicated blocks under `/es/` and
`/en/` keep the same policy so a locale switch cannot serve stale
assets.

**Acceptance Scenarios**:

1. **Given** any browser fetches `/es-ES/index.html`, **When** nginx
   responds, **Then** the response carries
   `Cache-Control: no-cache`.
2. **Given** any browser fetches `/en-US/index.html`, **When** nginx
   responds, **Then** the response carries
   `Cache-Control: no-cache`.

## Functional Requirements

- **FR-1**: `LocaleService` MUST expose `prefixFor(locale: AppLocale)`
  returning the URL prefix for each locale (`'es-ES' → '/es-ES/'`,
  `'en-US' → '/en-US/'`).
- **FR-2**: `UserMenuComponent.selectLocale(locale)` MUST persist the
  preference via `LocaleService.setLocale` and then navigate the
  browser to `prefixFor(locale) + restOfPath` (where `restOfPath` is
  the current pathname with its existing locale prefix stripped,
  falling back to `''` when the path is the root). It MUST NOT
  call `globalThis.location.reload()` directly — the destination
  URL serves the correct bundle, no reload is needed.
- **FR-3**: `nginx` MUST serve the `es-ES` bundle from
  `/usr/share/nginx/html/es-ES/` and the `en-US` bundle from
  `/usr/share/nginx/html/en-US/`, with matching `location /es-ES/`
  and `location /en-US/` blocks. The `=` location blocks for
  `index.html`, `ngsw-worker.js`, `ngsw.json`, and
  `manifest.webmanifest` MUST be duplicated under both prefixes
  with `Cache-Control: no-cache`.
- **FR-4**: `nginx` MUST return `302` from `location = /` based on
  `Accept-Language`: `en*` → `/en-US/`, anything else or absent →
  `/es-ES/`. The redirect target is a single trailing slash; the SPA
  router then resolves the rest.
- **FR-5**: `frontend/Dockerfile` MUST build both configurations
  (default `production` for `es-ES`, and `--configuration en-US`)
  and MUST copy `dist/kiosk-screen/browser/es-ES` to
  `/usr/share/nginx/html/es-ES/` and
  `dist/kiosk-screen-en/browser/en-US` to
  `/usr/share/nginx/html/en-US/`.
- **FR-6**: `frontend/angular.json` MUST declare `localize: ["es-ES"]`
  for the default build and `localize: ["en-US"]` for the `en-US`
  configuration, so each Angular CLI build emits its bundle under
  the matching `dist/.../browser/<locale>/` subfolder.
- **FR-7**: The behavior contract for `I18N.LOCALE` is updated
  before implementation lands (per AGENTS.md policy 7).
- **FR-8**: `LocaleNavigator` MUST expose `getCurrentPath()` and
  `navigateTo(url)` over `globalThis.location`, so `UserMenuComponent`
  can stay declarative and tests can swap the navigation target
  without monkey-patching the browser's `Location`.

## Key Entities

- `AppLocale` (`'es-ES' | 'en-US'`) — the source-of-truth enum that
  drives `LocaleService`, the URL prefix, and the build target.
- `LocalePrefix` (`'/es/' | '/en/'`) — URL prefix per locale,
  exposed via `LocaleService.prefixFor`.

## Success Criteria

- **SC-1**: `npm --prefix frontend run build` produces
  `dist/kiosk-screen/browser/index.html` whose `<base href>` is
  `/es/` and whose UI strings are in Spanish.
- **SC-2**: `npm --prefix frontend run build -- --configuration en-US`
  produces `dist/kiosk-screen-en/browser/index.html` whose
  `<base href>` is `/en/` and whose UI strings are in English.
- **SC-3**: `docker build -f frontend/Dockerfile frontend` produces
  an image where `/usr/share/nginx/html/es/index.html` and
  `/usr/share/nginx/html/en/index.html` both exist and point to
  their respective `<base href>`.
- **SC-4**: Karma specs cover `LocaleService.prefixFor` and
  `UserMenuComponent.selectLocale` URL computation. All existing
  specs stay green.
- **SC-5**: `docs/dev/local-lab.md` documents the manual smoke
  test for switching locale end-to-end.

## Assumptions

- Two locales (`es-ES` and `en-US`) are sufficient for the kiosk
  product. Adding more locales later will require extending the
  prefix map and another build configuration — both are mechanical.
- A full URL navigation (instead of `reload()` on the same URL) is
  acceptable: it lands the browser on the correct bundle without an
  intermediate blank frame.
- The auth cookie path is `/`, so it is sent on both `/es/` and
  `/en/` requests.
- `@angular/localize/init` already carries the source locale per
  build, so `LOCALE_ID` and date/number pipes are correct without
  any runtime locale switching.

## Non-goals

- Runtime translation loader (transloco, ngx-translate). Out of
  scope for this change.
- Per-user locale preference served by the backend. Out of scope;
  the preference stays client-side in `localStorage["kiosk_locale"]`.
- Translating operator-authored content (admin content, ads). Only
  the UI bundle is translated; data entered via the admin shell
  stays as the operator wrote it.
- More than two locales. Adding a third locale requires a
  follow-up change spec.

## Supersedes

None.

## Superseded by

None yet.