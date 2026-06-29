# ADR-0007: Locale switching at build time

- **Status**: accepted.
- **Date**: 2026-06-26.
- **Deciders**: kiosk screen maintainers.
- **Related specs**: `specs/contracts/i18n-locale/contract.md`,
  `specs/changes/022-i18n-locale-switching/spec.md`,
  `specs/changes/022-i18n-locale-switching/plan.md`.

## Context

The kiosk screen frontend is built on `@angular/localize`, which substitutes
`$localize` template strings at build time. The user menu in the admin shell
exposes a "Language" picker (`Español` / `English`) that updates a signal,
writes `localStorage["kiosk_locale"]`, and changes `<html lang>`. Until this
change, picking a locale had no observable effect on the rendered text:

- The Docker image (`frontend/Dockerfile`) only built the default `production`
  configuration (Spanish). The `en-US` configuration in `angular.json` was
  never compiled in the image.
- `frontend/nginx.conf` had no path by which an English bundle could be
  served — the single `location /` block rewrote everything to
  `dist/kiosk-screen/browser`.
- The user menu's `selectLocale` finally called `globalThis.location.reload()`,
  which re-fetched the same Spanish bundle the browser was already on.

The bug was reported as "regardless of the language I select, the texts
stay in English" (the operator's deployment was using the en-US build by
accident; the same root cause produced the opposite symptom in other
deployments).

Three paths forward were considered:

1. **Build-time switching with two bundles served under URL prefixes
   `/es/` and `/en/`**, with nginx `Accept-Language` negotiation for the
   bare root and a `<base href>` per bundle.
2. **Runtime translation loader** (transloco, `@ngx-translate/core`)
   loaded over HTTP and applied to every `$localize` template at runtime.
3. **Hybrid**: keep build-time `@angular/localize` but split the bundles
   lazily via a single bundle that fetches translation files at runtime.

## Decision

We adopt **option 1**.

- `frontend/angular.json` declares `localize` per build: the default
  `production` build is `es-ES`, the `en-US` configuration is `en-US`.
  Each Angular CLI build emits its bundle under
  `dist/<app>/browser/<locale>/index.html` with a matching
  `<base href="/<locale>/">` (the CLI's natural behavior — no manual
  `baseHref` override).
- `frontend/Dockerfile` runs both builds and copies each
  `dist/.../browser/<locale>` to
  `/usr/share/nginx/html/es-ES` and `/usr/share/nginx/html/en-US`
  respectively.
- `frontend/nginx.conf` serves `/es-ES/` from the Spanish bundle and
  `/en-US/` from the English bundle, duplicates the
  `Cache-Control: no-cache` blocks for `index.html`, `ngsw-worker.js`,
  `ngsw.json`, and `manifest.webmanifest` under both prefixes, and
  returns `302` from `GET /` negotiated from `Accept-Language`
  (`en*` → `/en-US/`, anything else → `/es-ES/`).
- `LocaleService` exposes `prefixFor(locale)` and a `prefix` signal;
  the pure helper `localeTargetPath(currentPath, targetLocale)`
  builds the destination URL.
- `LocaleNavigator` is an injectable service that wraps
  `globalThis.location` (`getCurrentPath`, `navigateTo`). It is
  swappable in tests so `UserMenuComponent` does not need to
  monkey-patch the browser's `Location`.
- `UserMenuComponent.selectLocale` calls
  `navigator.navigateTo(localeTargetPath(navigator.getCurrentPath(), locale))`
  instead of `globalThis.location.reload()`. The destination URL
  serves the matching bundle directly — no flash, no intermediate
  reload, no blank frame.

## Consequences

- **Two independent bundles per deploy.** The image grows by roughly the
  size of one extra bundle, and CI builds twice. Acceptable for a
  two-locale product; future locales would compound this — at three or
  four locales a runtime loader starts to look more attractive.
- **URL becomes canonical per locale.** Operators who bookmark `/es-ES/hall`
  and pick "English" still land on the same logical page at `/en-US/hall`
  because `localeTargetPath` strips the leading locale segment before
  prepending the new prefix.
- **Auth cookie survives a locale switch.** The session cookie is scoped
  at path `/`; both `/es-ES/` and `/en-US/` requests send it, so a
  signed-in operator does not bounce through `/login` after picking a
  locale.
- **No new runtime dependency.** `@angular/localize` already provides
  per-locale builds; nginx is already in the stack; no new library.
- **`@angular/localize/init` is still in the polyfills array per build.**
  Each build carries its source locale into the `LOCALE_ID` provider, so
  date / number / currency pipes keep working without runtime switching.
- **Service Worker (`ngsw-worker.js`, `ngsw.json`) is per-prefix.** The
  duplicated `=` location blocks in `nginx.conf` keep
  `Cache-Control: no-cache` on these assets for both prefixes, so a
  locale switch cannot serve stale cached assets.
- **Out of scope:** runtime translation loader, per-user locale served
  by the backend, third locale, translating operator-authored content.
  Each is a separate change spec when the need arises.