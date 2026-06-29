# Implementation Plan: Locale Switching at Build Time

**Branch**: `022-i18n-locale-switching` | **Date**: 2026-06-26
**Spec**: [spec.md](./spec.md)
**Migration**: none (Docker image is rebuilt; no schema or API
changes).

## Summary

The frontend ships two independent Angular builds (one per locale)
served by nginx under the URL prefixes `/es/` and `/en/`. The user
menu navigates to the new prefix instead of reloading the same
URL, so the browser fetches the bundle for the chosen locale.
nginx negotiates the root URL from `Accept-Language` and serves
the matching bundle.

## Technical Context

- **Language/Version**: TypeScript 5.8, Angular 20.
- **Primary Dependencies**: `@angular/localize` (already in use),
  Angular CLI build (already in use), nginx-unprivileged (already
  in use).
- **Storage**: `localStorage["kiosk_locale"]` (client-side only;
  no backend round-trip).
- **Testing**: Karma + Jasmine for the locale service and the user
  menu; `docker build` to confirm the image ships both bundles;
  manual smoke test documented in `docs/dev/local-lab.md`.

## Architecture

### Build layout

```
dist/
├── kiosk-screen/        # es-ES build (default)
│   └── browser/
│       └── es-ES/
│           ├── index.html   # <base href="/es-ES/">
│           └── ...
└── kiosk-screen-en/     # en-US build
    └── browser/
        └── en-US/
            ├── index.html   # <base href="/en-US/">
            └── ...
```

The Angular CLI's localized application builder emits each build
under `dist/<app>/browser/<locale-code>/index.html` and emits a
`<base href>` matching the locale code. We rely on this natural
behavior — no `baseHref` override needed.

### Runtime URL layout

```
https://<host>/
├── es-ES/               # es-ES bundle
│   ├── hall
│   ├── admin/
│   └── ...
└── en-US/               # en-US bundle
    ├── hall
    ├── admin/
    └── ...
```

### Switching flow

1. Operator picks a locale in `UserMenuComponent`.
2. `LocaleService.setLocale(locale)` writes `localStorage` and
   updates `<html lang>`.
3. `UserMenuComponent.selectLocale` calls
   `localeTargetPath(currentPath, locale)` to compute the
   destination URL, then delegates to `LocaleNavigator.navigateTo`.
4. Browser fetches the destination URL → nginx routes to the
   matching bundle → Angular router resolves the path under the
   bundle's `<base href>`.

### Nginx layout

```nginx
location = / {
  # 302 to /en-US/ or /es-ES/ based on Accept-Language
}
location /es-ES/ { alias /usr/share/nginx/html/es-ES; try_files ... /es-ES/index.html; }
location /en-US/ { alias /usr/share/nginx/html/en-US; try_files ... /en-US/index.html; }
location = /es-ES/index.html        { add_header Cache-Control "no-cache"; ... }
location = /es-ES/ngsw-worker.js    { add_header Cache-Control "no-cache"; ... }
location = /es-ES/ngsw.json         { add_header Cache-Control "no-cache"; ... }
location = /es-ES/manifest.webmanifest { add_header Cache-Control "no-cache"; ... }
# Same set duplicated for /en-US/...
location = /health { ... }
```

## Constitution Check

- **Spec traceability**: FR-1..FR-7 each map to a file in this plan.
- **Requirement clarity**: 7 FRs, 5 SCs.
- **Plan alignment**: two cross-cutting areas touched — Angular
  build config and nginx config. Both are mechanical; no business
  logic.
- **Simplicity**: no new runtime dependency, no runtime translation
  loader, no schema change.
- **Contracts**: a new contract `I18N.LOCALE` is created. No
  existing contract changes (the user menu still belongs to
  `ADMIN.SHELL.NAVIGATION`; the locale service is the only
  artifact newly covered by the new contract).
- **Testing**: Karma specs cover the new behavior; the existing
  spec suite must stay green.
- **Security**: no new surface; the auth cookie path is unchanged
  and survives the locale switch.
- **No speculative scope**: third locale, runtime loader, and
  backend-driven preference are explicitly out.
- **Conflict handling**: none (no audit events affected).

## Project Structure

```
specs/
├── changes/022-i18n-locale-switching/
│   ├── plan.md
│   ├── spec.md
│   ├── tasks.md
│   └── context-pack.md
└── contracts/i18n-locale/
    └── contract.md

frontend/
├── angular.json                                 # baseHref per build
├── Dockerfile                                   # two builds
├── nginx.conf                                   # /es/, /en/, redirect
└── src/app/core/
    ├── i18n/
    │   ├── locale.service.ts                    # + prefixFor()
    │   └── locale.service.spec.ts               # + prefixFor tests
    └── layout/
        └── user-menu.component.ts               # selectLocale navigates

docs/
├── adr/0007-locale-build-time-switching.md      # new ADR
└── dev/local-lab.md                             # + smoke test section
```

## Out of Scope

- Runtime translation loader.
- Per-user locale served by the backend.
- Translating operator-authored content.
- Third locale beyond `es-ES` and `en-US`.