# Tasks: Locale Switching at Build Time

**Input**: Design documents from
`specs/changes/022-i18n-locale-switching/`.

**Prerequisites**: plan.md (required), spec.md (required for user
stories).

**Tests**: Tests are mandatory for the new switch behavior. Each
user story carries at least one Karma spec that asserts a
measurable success criterion (SC-1..SC-5).

**Organization**: Tasks are grouped by user story to enable
independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, ...)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/`, `frontend/`
- Paths shown below assume the kiosk-screen web app structure.

## Phase 1: SDD Governance & Context

**Purpose**: Confirm the active change, the new contract, and the
minimal context before any implementation change is made.

- [ ] T001 Verify the working branch `022-i18n-locale-switching`
      and the active change artefacts at
      `specs/changes/022-i18n-locale-switching/{spec.md,plan.md,tasks.md,context-pack.md}`.
- [ ] T002 [P] Read `specs/manifest.yml` and confirm
      `I18N.LOCALE` is registered and `CHG-022` has status
      `in-progress` with `read_by_default: true`.
- [ ] T003 [P] Read `specs/contracts/i18n-locale/contract.md` as the
      active source of truth for the locale switching contract.
- [ ] T004 [P] Keep `specs/changes/022-i18n-locale-switching/context-pack.md`
      synchronized with mandatory specs, optional specs, code
      entrypoints, tests, and excluded paths.
- [ ] T005 Add `docs/adr/0007-locale-build-time-switching.md`
      capturing the rationale for the two-build approach (avoiding
      a runtime translation loader) and the nginx routing choice.

## Phase 2: Foundational (Blocking prerequisites)

**Purpose**: Land the two cross-cutting primitives every user
story depends on: the `prefixFor` helper in `LocaleService` and the
`<base href>` config in `angular.json`.

- [ ] T006 [P] [US1] Add `prefixFor(locale: AppLocale)` to
      `LocaleService` at
      `frontend/src/app/core/i18n/locale.service.ts`:
      `'es-ES' → '/es-ES/'`, `'en-US' → '/en-US/'`. Export the
      return type as `LocalePrefix`.
- [ ] T007 [P] [US1] Add Karma spec coverage for `prefixFor` in
      `frontend/src/app/core/i18n/locale.service.spec.ts`
      (one case per locale).
- [ ] T008 [P] [US1] Add `LocaleNavigator` to
      `frontend/src/app/core/i18n/locale.service.ts` with
      `getCurrentPath()` and `navigateTo(url)` so the user menu can
      stay declarative and tests can swap the navigation target.

## Phase 3: User Story 1 — Switch actually shows the new locale (Priority: P1)

**Goal**: Picking "English" or "Español" from the user menu
navigates to the matching bundle; the rendered strings are in the
new locale on first paint.

**Independent Test**: from `/es/hall`, open the user menu, pick
"English". The browser navigates to `/en/hall` and the UI strings
are in English without a flash of Spanish content.

- [ ] T009 [US1] Modify `UserMenuComponent.selectLocale` in
      `frontend/src/app/core/layout/user-menu.component.ts` to:
      1. Persist via `LocaleService.setLocale(locale)`.
      2. Compute `currentPath = navigator.getCurrentPath()`.
      3. Call
         `navigator.navigateTo(localeTargetPath(currentPath, locale))`.
      Replace the existing `globalThis.location.reload()` call.
- [ ] T010 [P] [US1] Update the helper comment in
      `user-menu.component.ts:190-203` so it no longer claims
      "a full reload is the only way to land the chosen locale";
      the new wording must state that the destination URL serves
      the correct bundle directly.
- [ ] T011 [P] [US1] Add Karma specs in
      `frontend/src/app/core/layout/user-menu.component.spec.ts`:
      - Selecting "English" while at `/es-ES/hall` calls
        `navigator.navigateTo('/en-US/hall')`.
      - Selecting "English" while at `/es-ES/admin/content/42` calls
        `navigator.navigateTo('/en-US/admin/content/42')`.
      - Selecting "Español" while at `/en-US` calls
        `navigator.navigateTo('/es-ES/')`.
      - No-op when the chosen locale is already active (no
        `navigator.navigateTo`).

### Tests for User Story 1

- [ ] T012 [P] [US1] Run `npm --prefix frontend run test` and
      confirm all `core/i18n` and `core/layout` specs stay green.

## Phase 4: User Story 2 — Root URL negotiates locale (Priority: P1)

**Goal**: nginx returns a 302 from `GET /` to `/es/` or `/en/`
based on the `Accept-Language` header, so anonymous visitors land
on a working page.

- [ ] T013 [US2] Rewrite `frontend/nginx.conf` so it:
      - Serves the `es-ES` bundle from
        `/usr/share/nginx/html/es-ES/` under `location /es-ES/`.
      - Serves the `en-US` bundle from
        `/usr/share/nginx/html/en-US/` under `location /en-US/`.
      - Duplicates the `=` location blocks for
        `/es-ES/index.html`, `/es-ES/ngsw-worker.js`,
        `/es-ES/ngsw.json`, `/es-ES/manifest.webmanifest` (and the
        `/en-US/...` equivalents) with `Cache-Control: no-cache`.
      - Adds `location = /` returning `302` to `/en-US/` if
        `$http_accept_language ~ '^en'` and to `/es-ES/` otherwise.
      - Keeps `location = /health` returning the static
        `{"status":"ok"}` body.
- [ ] T014 [US2] Update `frontend/Dockerfile` so it:
      - Runs the default `npm run build -- --configuration production`
        (es-ES).
      - Runs
        `npm run build -- --configuration en-US`.
      - Copies `dist/kiosk-screen/browser/es-ES` to
        `/usr/share/nginx/html/es-ES`.
      - Copies `dist/kiosk-screen-en/browser/en-US` to
        `/usr/share/nginx/html/en-US`.

### Tests for User Story 2

- [ ] T015 [US2] Run
      `docker build -f frontend/Dockerfile frontend` and inspect:
      - `/usr/share/nginx/html/es-ES/index.html` exists and contains
        `<base href="/es-ES/">`.
      - `/usr/share/nginx/html/en-US/index.html` exists and contains
        `<base href="/en-US/">`.
      - `/etc/nginx/conf.d/default.conf` contains the new
        `location /es-ES/` and `location /en-US/` blocks plus the
        `= /` redirect.

## Phase 5: User Story 3 — Auth survives the switch (Priority: P2)

**Goal**: The auth cookie remains valid across the URL prefix
change so the operator does not bounce through `/login`.

- [ ] T016 [US3] Document in `docs/dev/local-lab.md` (Smoke test
      section, step 4) that the auth cookie is intentionally issued
      at path `/` and is sent on both `/es-ES/...` and `/en-US/...`
      requests, so a locale switch keeps the operator signed in.

### Tests for User Story 3

- [ ] T017 [US3] Manual verification during the smoke test: sign
      in at `/es-ES/admin`, switch to English, confirm the browser
      lands on `/en-US/admin` without redirecting through `/login`.

## Phase 6: User Story 4 — No-cache headers on every locale's bootstrap assets (Priority: P2)

**Goal**: `index.html`, the Service Worker scripts, and the web
app manifest are not cached across locale switches.

- [ ] T018 [US4] Verify in `nginx.conf` (already drafted in T013)
      that the duplicated `=` location blocks for both `/es-ES/` and
      `/en-US/` carry `add_header Cache-Control "no-cache";`.

### Tests for User Story 4

- [ ] T019 [US4] Manual verification during the smoke test: load
      `/es-ES/index.html` and `/en-US/index.html` in the browser dev
      tools and confirm `Cache-Control: no-cache` on both
      responses.

## Phase 7: Documentation & smoke test

**Purpose**: Make the manual switch verifiable by any operator.

- [ ] T020 Add a new section "Smoke test: locale switching" to
      `docs/dev/local-lab.md` documenting:
      1. Build the Docker image.
      2. Run the container and open `http://localhost:8080/`.
      3. Confirm nginx returns `302` to `/es-ES/` (or `/en-US/` if the
         browser default is English).
      4. Confirm the hall, login, and admin pages render in the
         matching locale.
      5. From the user menu, pick the other locale; confirm the
         browser lands on the matching prefix and the UI strings
         are in the new locale.
      6. Sign in at `/es-ES/admin`, switch to English, confirm the
         browser lands on `/en-US/admin` without redirecting through
         `/login`.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7.

## Implementation Strategy

Single-contributor path:

1. Phase 1: 10 min (governance + ADR).
2. Phase 2: 30 min (helper, tests, angular.json).
3. Phase 3: 45 min (user-menu logic + tests).
4. Phase 4: 30 min (nginx + Dockerfile + docker build).
5. Phase 5 + 6 + 7: 30 min (smoke test doc + manual verification).