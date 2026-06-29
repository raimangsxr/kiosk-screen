---
id: I18N.LOCALE
type: contract
status: active
source_of_truth: true
owns:
  - frontend/src/app/core/i18n/**
  - frontend/src/app/core/layout/user-menu.component.ts
  - frontend/angular.json
  - frontend/Dockerfile
  - frontend/nginx.conf
tests:
  - frontend/src/app/core/i18n/**/*.spec.ts
  - frontend/src/app/core/layout/user-menu.component.spec.ts
related_changes:
  - CHG-022
related_adrs:
  - docs/adr/0007-locale-build-time-switching.md
---

# Locale Switching Contract

## Purpose

This active contract is the current source of truth for
`I18N.LOCALE`. It defines how the operator switches the UI locale
between `es-ES` and `en-US`, how Angular builds ship per locale,
and how nginx serves them.

## Current behavior

- The frontend ships two independent Angular builds, one per
  supported locale. Each build is a separate `dist/.../browser`
  artifact with its own `<base href>`.
- `es-ES` is the source locale and the default for anonymous
  visitors. `en-US` is the only additional locale.
- The URL is canonical per locale: `/es-ES/<rest>` for Spanish and
  `/en-US/<rest>` for English. The locale is the first path segment.
- `GET /` returns a `302` redirect negotiated from the
  `Accept-Language` request header (`en*` → `/en-US/`, anything
  else or absent → `/es-ES/`).
- The operator's preference is stored client-side under
  `localStorage["kiosk_locale"]` and consumed by `LocaleService`.
- `LocaleService` exposes `locale()`, `isSpanish()`, `isEnglish()`
  as reactive signals, plus `prefixFor(locale)` returning the URL
  prefix (`'/es-ES/'` or `'/en-US/'`).
- The user menu navigates to the destination locale's URL prefix
  on selection; it does not reload the current URL.
- The auth cookie path is `/`, so the cookie is sent on both
  `/es-ES/` and `/en-US/` requests and the operator stays signed in
  across a locale switch.
- `index.html`, `ngsw-worker.js`, `ngsw.json`, and
  `manifest.webmanifest` are served with
  `Cache-Control: no-cache` under both prefixes.

## Public interfaces

- `AppLocale = 'es-ES' | 'en-US'` (TypeScript enum at
  `frontend/src/app/core/i18n/locale.service.ts`).
- `LocalePrefix = '/es-ES/' | '/en-US/'`.
- `LocaleService` — Angular service exposing `locale`,
  `isSpanish`, `isEnglish`, `setLocale(locale)`, `prefixFor(locale)`.
- `LocaleNavigator` — Angular service exposing
  `getCurrentPath()` and `navigateTo(url)` over `globalThis.location`.
  Swappable in tests so the user menu does not need to monkey-patch
  the browser's `Location`.
- `UserMenuComponent.selectLocale(locale)` — UI handler that
  persists the preference and navigates the browser.
- HTTP redirects: `GET /` → 302 to `/es-ES/` or `/en-US/`.

## Owned code paths

- `frontend/src/app/core/i18n/**`
- `frontend/src/app/core/layout/user-menu.component.ts`
- `frontend/angular.json`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

## Quality gates

- Any change to the locale switch flow must update the user menu
  spec and the locale service spec.
- New locales require an extension of `AppLocale`, `SUPPORTED_LOCALES`,
  `prefixFor`, `angular.json` configurations, the Dockerfile
  build steps, and the nginx location blocks — one change spec
  per added locale.
- Durable technical rationale belongs in `docs/adr/0007-locale-build-time-switching.md`.

## Non-goals

- Runtime translation loader (transloco, ngx-translate). Locale
  strings are baked into each build.
- Per-user locale served by the backend.
- Translating operator-authored content.
- Locale-aware content routing beyond the URL prefix.

## Change history

- CHG-022: initial contract.