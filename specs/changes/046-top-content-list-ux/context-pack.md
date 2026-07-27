# Context Pack: CHG-046 Top Content List UX

**Change**: `specs/changes/046-top-content-list-ux/`  
**Status**: draft (plan complete)  
**Branch**: `046-top-content-list-ux`

## Read first (in order)

1. `specs/changes/046-top-content-list-ux/plan.md`
2. `specs/changes/046-top-content-list-ux/spec.md`
3. `specs/changes/046-top-content-list-ux/data-model.md`
4. `specs/changes/046-top-content-list-ux/contracts/contract-deltas.md`
5. `specs/changes/046-top-content-list-ux/research.md`

## Active contracts to update before coding

- `specs/contracts/content-ads-admin/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `frontend/src/app/features/content/content-list.component.ts` | Primary UI: compact table/cards, pagination, preview, reorder gating |
| `frontend/src/app/shared/ui/media-hover-preview/` | **New** — anchored full-res preview (hover/focus/tap) |
| `frontend/src/app/shared/util/client-pagination.ts` | **New** — slice + range label helpers |
| `frontend/src/app/shared/util/client-pagination-storage.ts` | **New** — localStorage page-size persistence |
| `frontend/src/app/features/content/content-form.component.spec.ts` | Extend list tests (pagination, preview, compact actions) |

## Tests

- `frontend/src/app/features/content/content-list.component.spec.ts` (**new** — extract from `content-form.component.spec.ts` list block)
- `frontend/src/app/shared/ui/media-hover-preview/media-hover-preview.component.spec.ts` (**new**)
- `frontend/src/app/shared/util/client-pagination.spec.ts` (**new**)
- `frontend/src/app/shared/util/client-pagination-storage.spec.ts` (**new**)
- Manual: `quickstart.md`

## Do not read by default

- `specs/archive/**`
- `frontend/src/app/features/ads/**` (ads list out of scope)
- Backend content APIs (no server changes)

## Problem summary

Frontend-only UX for the top content admin list: denser rows with icon actions + tooltips, full-resolution thumbnail preview on hover/focus/tap, client-side pagination with persisted page size, and reorder disabled unless **Todas** is selected.
