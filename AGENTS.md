# Kiosk Screen Agent Instructions

Kiosk Screen is a FastAPI + Angular web application for live event kiosk displays. The backend owns authentication, configuration, display state, media, audit events, and admin APIs. The frontend owns the admin shell and the kiosk runtime UI.

## Token-aware SDD policy

1. Start every SDD task from `specs/manifest.yml`.
2. Do not scan all specs by default.
3. Treat `specs/contracts/**/contract.md` as the source of truth for current behavior.
4. Treat `specs/changes/**` as incremental records. Consolidated changes are historical unless the manifest or a context pack says otherwise.
5. Read `context-pack.md` for the active change before planning or implementation.
6. Do not read `specs/archive/**` unless explicitly justified.
7. If behavior changes, update the affected active contract before implementation.
8. `supersedes` means replacement only. Use `modifies`, `extends`, or `depends_on` for weaker relationships.
9. Keep `specs/manifest.yml` synchronized with new contracts, moved paths, and change status.
10. Run narrow tests first, then broader validation.

## Active SDD work

- Recently implemented: CHG-044 (iframe CSS scale), CHG-041 (display orchestration SSE), CHG-040 (admin operations dashboard), CHG-024 (event config sync), CHG-027 (novelty rotation), CHG-028 (blur-fill), CHG-035 (admin mobile), CHG-036 (sponsor strip), CHG-037 (hall version), CHG-038 (PWA), CHG-039 (independent recurring counters)
- Other in-progress changes (not active): `019-display-responsive-runtime`, `021-kiosk-runtime-refactor`, `025-ci-argocd-bump-caller`, `026-platform-standardization`
- Active plan: none
- Recently consolidated: `023-event-branding-layout` → `EVENT.BRANDING` + `DISPLAY.RUNTIME`
- Cancelled: `022-i18n-locale-switching` (multi-language UI dropped; frontend ships Spanish only); CHG-042/043 (embed density — superseded by CHG-044)

## Spec Kit flow

Use the full flow for feature work:

`/speckit.specify` -> `/speckit.clarify` -> `/speckit.checklist` -> `/speckit.plan` -> `/speckit.tasks` -> `/speckit.analyze` -> `/speckit.implement`

New change specs are created under `specs/changes/NNN-<slug>/`. Current behavior is consolidated into `specs/contracts/**/contract.md` after acceptance.

## High-value validation commands

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```

For local setup and troubleshooting, read `docs/dev/local-lab.md` instead of loading this file into every task.

<!-- SPECKIT START -->
**Active plan**: none — CHG-044 implemented (`specs/changes/044-iframe-css-scale/`)
<!-- SPECKIT END -->
