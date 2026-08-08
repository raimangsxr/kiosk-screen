# Implementation Plan: Video Burst Recovery

**Input**: Feature specification from `/specs/changes/059-fix-video-burst/spec.md`
**Branch**: `059-fix-video-burst` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

## Context Grounding

- Manifest read: yes
- Active contracts read: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`
- Change specs read: `CHG-059`; earlier context packs for CHG-050, CHG-051, CHG-053 and CHG-056 were read to trace the regression
- Context pack read or created: `specs/changes/059-fix-video-burst/context-pack.md`
- ADRs read: none; no durable architecture boundary changes
- Code entrypoints verified: media cache, content gate, novelty tracker/readiness, viewer controller, display screen
- Tests identified: six focused Angular specs listed in `context-pack.md`
- Archived or consolidated specs read: none

## Summary

Route every media preparation through one deduplicated FIFO scheduler capped at three active operations. Separate “probe-ready” state from ownership of a presentation blob so all pending novelties can report readiness without retaining all files in memory. Revalidate and retain the source before any regular or novelty command is committed, retry transient failures after a short cooldown, remount repeated video commands, and report a visible video error once against the command that created that element.

## Technical Context

**Language/Version**: TypeScript 5.x, Angular 20.3
**Primary Dependencies**: Angular core, HttpClient, RxJS; no new dependencies
**Storage**: in-memory per-display cache; browser Blob URLs
**Testing**: Angular/Karma with ChromeHeadless
**Target Platform**: Chromium kiosk browser
**Project Type**: FastAPI + Angular web application; frontend-only implementation with unchanged backend protocol
**Performance Goals**: at most 3 simultaneous fetch/probe operations and at most 2 retained top presentation blobs
**Constraints**: live-event safety, FIFO novelty semantics, no blank novelty commit, no request storm, unchanged SSE/event payloads
**Scale/Scope**: burst test of 10+ mixed novelties and retention test across 100 rotations

## Constitution Check

*GATE: Passed before Phase 0 and rechecked after Phase 1.*

- Active contract identified and read: pass (`DISPLAY.RUNTIME`, `CONTENT.ROTATION`)
- Manifest update needed and planned: pass; `CHG-059` registered
- Context pack created/updated: pass
- Contract update required before implementation: yes; completed in both affected contracts
- Tests planned for changed behavior: pass
- Security and user-facing error exposure considered: pass; no new user-facing diagnostics or paths
- Observability/audit impact considered: pass; existing `media_error` event reused without payload changes
- No archived or superseded specs used without justification: pass

## Project Structure

### Documentation for this change

```text
specs/changes/059-fix-video-burst/
├── spec.md
├── context-pack.md
├── checklists/
├── plan.md
├── research.md
├── data-model.md
├── contracts/runtime-contract.md
├── quickstart.md
└── tasks.md
```

### Source code touched

```text
frontend/src/app/display/
├── display-media-cache.service.ts
├── display-media-cache.service.spec.ts
├── display-content-gate.service.ts
├── display-content-gate.service.spec.ts
├── display-screen.component.ts
├── display-screen.component.spec.ts
├── display-viewer.controller.ts
└── display-viewer.controller.spec.ts
```

## Phase 0: Outline & Research

- Define a single scheduling boundary that every `ensureReady` caller must cross.
- Separate verified download/decode readiness from retained presentation ownership.
- Define deterministic cooldown retry behavior and stale lifecycle cleanup.
- Bind video-element lifetime and error reports to the originating command ID.

See [research.md](research.md).

## Phase 1: Design & Contracts

- No persisted entity or backend schema changes; document cache state transitions in [data-model.md](data-model.md).
- Preserve existing SSE and kiosk-event schemas; document client runtime invariants in [contracts/runtime-contract.md](contracts/runtime-contract.md).
- Update `DISPLAY.RUNTIME` and `CONTENT.ROTATION` before implementation (completed).
- No ADR required because ownership boundaries and public protocols remain unchanged.

## Phase 2: Task Planning Approach

- US1 covers the global scheduler, non-retained completion cleanup, bounded presentation cache, and fresh render identity.
- US2 covers failure cooldown/retry and command-scoped visible video errors.
- Tests precede implementation within each story, followed by focused suite and production build.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
