# Context Pack: CHG-022 Locale Switching at Build Time

## Task classification

- Type: change to existing UI surface and infra config
- Affected contract: `I18N.LOCALE` (new)
- Requires contract update: yes (new contract)
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/i18n-locale/contract.md`
- `specs/changes/022-i18n-locale-switching/spec.md`
- `specs/changes/022-i18n-locale-switching/plan.md`
- `specs/changes/022-i18n-locale-switching/tasks.md`

## Optional context

Read only if the task explicitly touches the area:

- `docs/adr/0001-token-aware-sdd-governance.md`
- `docs/adr/0002-display-runtime-region-ratios.md`
- `frontend/angular.json`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `frontend/src/app/core/i18n/locale.service.ts`
- `frontend/src/app/core/layout/user-menu.component.ts`
- `frontend/src/app/app.config.ts`
- `specs/contracts/admin-shell-navigation/contract.md`

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is
  explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `frontend/angular.json` — baseHref + localize per build.
- `frontend/Dockerfile` — second build step for `en-US`.
- `frontend/nginx.conf` — `/es/`, `/en/`, `Accept-Language` redirect.
- `frontend/src/app/core/i18n/locale.service.ts` — add `prefixFor`.
- `frontend/src/app/core/layout/user-menu.component.ts` —
  `selectLocale` navigates to the new prefix.

## Tests

- `npm --prefix frontend run test`
- Narrow specs first when possible:
  - `frontend/src/app/core/i18n/locale.service.spec.ts`
  - `frontend/src/app/core/layout/user-menu.component.spec.ts`
- Build verification:
  - `npm --prefix frontend run build`
  - `npm --prefix frontend run build -- --configuration en-US`
- Image verification:
  - `docker build -f frontend/Dockerfile frontend`
  - inspect `/usr/share/nginx/html/es/index.html` and
    `/usr/share/nginx/html/en/index.html`.

## Implementation constraints

- Do not introduce a runtime translation loader; the source of
  truth for the bundle per locale stays `@angular/localize`.
- Do not change the `LOCALE_ID` provider contract; each build ships
  its own `LOCALE_ID` via `@angular/localize/init`.
- Do not change the auth cookie path or session guard; the locale
  switch must keep the operator signed in.
- Keep the existing `LocaleService` signal API
  (`locale()`, `isSpanish()`, `isEnglish()`); `prefixFor` is the
  only addition.
- Preserve the `kiosk_locale` `localStorage` key for backwards
  compatibility with any saved preference from earlier builds.