# Implementation Plan: Estabilidad del renderizado fotográfico del kiosk

**Input**: [spec.md](spec.md)  
**Branch**: `053-fix-kiosk-render-load` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)

## Context Grounding

- Manifest read: yes, `specs/manifest.yml`
- Active contracts read: `DISPLAY.RUNTIME`
- Change specs read: CHG-053 only; CHG-051 context was used earlier solely to verify the deployed implementation and its pending manual gates
- Context pack: `specs/changes/053-fix-kiosk-render-load/context-pack.md`
- ADRs read: ADR-0007, ADR-0009
- Code entrypoints verified: `display-screen.component.ts/.css`, `display-media-cache.service.ts`, `display-viewer.controller.ts`
- Tests identified: the corresponding three `*.spec.ts` files
- Archived or consolidated specs read: none

## Summary

Replace the dual-original photo blur-fill and continuous viewport filter with one original foreground plus one captured 320 px decorative raster. Enforce visible-plus-one top-media retention at command, queue, in-flight completion, failure, and teardown boundaries. Isolate SSE command effects, make fallback state reactive, and deduplicate sponsor windows by visible meaning rather than command identity. Preserve server orchestration, the CHG-050 readiness gate, novelty semantics, video playback, and the existing transition DSL.

## Technical Context

**Language/Version**: TypeScript 5.8, Angular 20.3.25  
**Primary Dependencies**: Angular Signals, HttpClient, browser Canvas/Object URL APIs, RxJS 7.8  
**Storage**: none; browser-memory cache only  
**Testing**: Angular/Karma/Jasmine with ChromeHeadlessNoSandbox  
**Target Platform**: Chromium kiosk browser, landscape 720p–4K  
**Project Type**: Angular frontend within FastAPI + Angular web application  
**Performance Goals**: 10-minute production-profile stability; ≥50% mean renderer CPU improvement vs 1.9.0; no sustained >1-core equivalent >30 s; ≤1 original photo plus one small backdrop; ≤2 retained top resources  
**Constraints**: no SSE/backend protocol change; one active original media element; one queued preload; preserve reduced motion, gate, novelty, iframe, and fixed-mode semantics  
**Scale/Scope**: 15 high-resolution top photos rotating mostly every 3 s; 15 visible sponsors from 35 eligible

## Constitution Check

- Active contract identified and read: pass — `DISPLAY.RUNTIME`
- Manifest update needed and planned: pass — CHG-053 registered and related
- Context pack created/updated: pass
- Contract update required before implementation: yes — completed in planning
- Tests planned for changed behavior: pass — component, cache, viewer, fallback lifecycle
- Security and user-facing error exposure considered: pass — no new errors or external inputs
- Observability/audit impact considered: pass — no event schema change; `media_error` semantics preserved
- No archived or superseded specs used without justification: pass

Post-design re-check: pass. The contract and ADR now describe the selected bounds; no new public API, persistence, or protocol is introduced.

## Project Structure

### Documentation for this change

```text
specs/changes/053-fix-kiosk-render-load/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/contract-deltas.md
├── checklists/
└── tasks.md
```

### Source code touched

```text
frontend/src/app/display/
├── display-screen.component.ts
├── display-screen.component.css
├── display-screen.component.spec.ts
├── display-media-cache.service.ts
├── display-media-cache.service.spec.ts
├── display-viewer.controller.ts
└── display-viewer.controller.spec.ts
```

## Phase 0: Outline & Research

- Select a backdrop representation that preserves blur-fill without a second original decoder or persistent full-screen filter.
- Define retention semantics for queue pruning, late completions, failed probes, and teardown races.
- Identify the narrow reactive dependencies for command application and fallback polling.
- Keep the existing legacy content transition because Angular forbids mixing it with native enter/leave in one component; sponsor reduced-motion is handled in CSS.
- Define automated resource-bound tests and a reproducible manual production-profile run.

## Phase 1: Design & Contracts

- Model the top-media retention window, derived backdrop, cache operation lifecycle, and visible sponsor window in `data-model.md`.
- Update `DISPLAY.RUNTIME` before source implementation.
- Amend ADR-0007 to replace the photo dual-layer exception with a bounded captured artifact.
- Record frontend-only contract deltas; no backend/OpenAPI delta.
- Provide narrow, full-suite, production-build, and manual profile commands in `quickstart.md`.

## Phase 2: Task Planning Approach

- Tests precede implementation for each user story.
- US1 owns DOM/CSS/canvas and reduced-motion behavior.
- US2 owns controller preload slicing plus queue/in-flight/probe/teardown cache lifecycle.
- US3 owns sponsor equivalence and reactive fallback/command isolation.
- Narrow specs run first, followed by the complete frontend suite and `ng build`.
- Manual 10-minute and long-soak tasks remain unchecked until measured evidence exists.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Existing legacy Angular animation DSL retained | Avoid mixing animation systems or widening a production hotfix | Migrating the transition is unrelated behavior and increases visual-regression risk |

