# Supersedes: 003-admin-media-uploads

This document records the cross-spec amendments that 016 introduces
against the approved 003 spec. Each amendment produces a one-line
footer in the amended spec.

## Amendments

### A-101 — `embedded_web` content type removed

- **Amends**: `003 US1` Acceptance Scenario 3 (`003/spec.md`) and
  `003 FR-005` / `003 FR-006` (the `embedded_web` content type).
- **Replaced by**: `016 FR-008` through `016 FR-011` (drop the
  `embedded_web` content type; introduce a separate `iframes` table).
- **Effective behavior**: the Content admin form offers only `Photo`
  and `Video` as type options. Requests with `contentType='embedded_web'`
  are rejected with HTTP 400.
- **Test impact**: 003's iframe-related tests are obsolete; 016 T019
  covers the rejection.

### A-102 — `ApprovedEmbeddedDomain` table removed

- **Amends**: `003`'s reference to approved embedded domains
  (cross-referenced from `003/spec.md` and the readiness rules).
- **Replaced by**: `016 FR-021` and `016 FR-022` (table, model, CRUD
  endpoints, admin UI, and readiness check are all removed).
- **Effective behavior**: any iframe URL is valid until the iframe is
  deleted; the "Iframe domains" admin sidenav entry and the
  `/admin/domains` route are gone.
- **Test impact**: `010 T016` (the wiring of the readiness rule) and
  any iframe-domain-related tests are obsolete.

## Why not edit 003 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. The 003 spec is approved. 016 owns the new behavior;
003 keeps its original `embedded_web` documentation as historical
record and gains a one-line footer:

```
> Superseded by: 016-preconfigured-iframes-and-video-end (US2)
```

## Cross-references

- 003 spec directory:
  `specs/_archive/C2-content-and-ads/003-admin-media-uploads/`
- 016 spec directory: `specs/016-preconfigured-iframes-and-video-end/`
- Phase 3 of the SDD optimization plan:
  `sdd-optimization/08-refactoring-roadmap.md`
