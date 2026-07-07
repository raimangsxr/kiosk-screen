# Implementation Plan: Independent Recurring Content Counters

**Branch**: `039-independent-recurring-counters` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/039-independent-recurring-counters/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-039 entry to add at implementation)
- Active contracts read: `CONTENT.ROTATION`
- Change specs read: `specs/changes/039-independent-recurring-counters/spec.md`, `context-pack.md`
- Context pack read or created: `context-pack.md`
- ADRs read: none required (`docs/adr/0001-token-aware-sdd-governance.md` governance only)
- Code entrypoints verified:
  - `frontend/src/app/display/recurring-cadence.service.ts`
  - `frontend/src/app/display/kiosk-rotation.controller.ts`
  - `frontend/src/app/display/display-rotation.service.ts`
  - `frontend/src/app/display/display-fingerprint.ts`
  - `frontend/src/app/features/content/content-form.component.ts`
- Tests identified:
  - `recurring-cadence.service.spec.ts`
  - `kiosk-rotation.controller.spec.ts`
  - `display-fingerprint.spec.ts` (unchanged unless cadence sync helpers added)
- Archived or consolidated specs read: none

## Summary

CHG-039 replaces the kiosk's single shared recurring cadence counter with
**per-item counters** that increment on every screen transition. Each
recurring sponsor fires when `counter >= N`, independently of other
recurring items. Simultaneous due items resolve one per tick by
`displayOrder`. Recurring-only events use filler rotation between due
fires. Pause and novelty bursts freeze counters; `jump_to` and hot cadence
edits reset only the affected item.

**Technical approach**: Frontend-only refactor of
`RecurringCadenceService` (pure functions) and `KioskRotationController`
(counter map state + `_advanceContentRegular` rewrite). No backend or API
changes. Update `CONTENT.ROTATION` contract before merge.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | TypeScript / Angular 20 (frontend only) |
| **Dependencies** | Angular signals — no new packages |
| **Storage** | In-memory `Map<contentId, number>` per kiosk session |
| **Testing** | Jasmine/Karma unit tests on cadence service + controller |
| **Target** | Chromium kiosk display runtime (`loop` mode) |
| **Performance** | O(r) per tick where r = recurring item count (typically < 20) |
| **Constraints** | Contract update before code; preserve CHG-027 novelty freeze |
| **Scope** | ~4–6 frontend files, 0 migrations |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contract identified | pass — `CONTENT.ROTATION` |
| Manifest update planned | pass — add CHG-039 at implementation |
| Context pack present | pass |
| Contract update before implementation | yes |
| Tests for changed behavior | pass — see Phase 2 |
| Security / error exposure | pass — no new surfaces |
| Observability / audit | pass — no audit changes |
| No unjustified archive reads | pass |

## Project Structure

### Documentation for this change

```text
specs/changes/039-independent-recurring-counters/
├── spec.md
├── context-pack.md
├── plan.md                    ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── recurring-cadence-behavior.md
├── checklists/requirements.md
└── tasks.md                   ← /speckit-tasks
```

### Source code touched

```text
frontend/
  src/app/display/recurring-cadence.service.ts          # rewrite pure API
  src/app/display/recurring-cadence.service.spec.ts     # new scenarios
  src/app/display/kiosk-rotation.controller.ts          # counter map + advance
  src/app/display/kiosk-rotation.controller.spec.ts     # update + new tests
  src/app/features/content/content-form.component.ts    # hint copy verify only

specs/
  contracts/content-rotation/contract.md                # update before code
  manifest.yml                                          # add CHG-039
```

### Active contract update (before implementation)

Merge [contracts/recurring-cadence-behavior.md](./contracts/recurring-cadence-behavior.md) into `specs/contracts/content-rotation/contract.md` — replace the single shared cadence bullet with per-item counter rules.

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. `Map<contentId, number>` owned by controller.
2. Increment every transition; due when `counter >= N`.
3. One due item per tick; simultaneous due resolved by `displayOrder`.
4. Filler queue when no regular content.
5. Hot cadence sync via per-id N tracking on poll.
6. Frontend-only; no backend changes.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/recurring-cadence-behavior.md](./contracts/recurring-cadence-behavior.md), [quickstart.md](./quickstart.md).

### `RecurringCadenceService` API (proposed)

| Method | Responsibility |
|--------|----------------|
| `regularQueue(items)` | Non-recurring, non-novelty items by `displayOrder` |
| `fillerQueue(items)` | Active recurring items by `displayOrder` |
| `incrementCounters(map, recurringIds)` | Return new map with +1 for each id |
| `dueItems(items, map)` | Items with `counter >= N`, sorted by `displayOrder` |
| `resetCounter(map, id)` | Set one id to 0 |
| `clearCounters()` | Empty map |
| `pruneCounters(map, activeRecurringIds)` | Remove stale keys |
| `cadenceChanges(prev, curr)` | Ids whose N changed → reset list |

### Controller integration points

| Location | Change |
|----------|--------|
| `cadenceCounter` signal | Replace with `recurringCounters` map signal |
| `_advanceContentRegular` | New increment → due → filler/regular flow |
| `bindInputs` effect | Prune map; reset on cadence change; clear when no recurring |
| `applyNavigationCommand('jump_to')` | Reset target recurring counter only |
| `shouldResetOnEmptyRecurring` | Extend to clear full map |

## Phase 2: Task Planning Approach

Tasks will map to user stories:

| Story | Tasks |
|-------|-------|
| US-1 Independent cadence | Service: increment, due, `>= N`; controller wiring; test A=6/B=30 |
| US-2 Delay normal | Due path skips regular cursor; test A,B,C,X pattern |
| US-3 Filler | `fillerQueue` + cursor; recurring-only test |
| US-4 Controls | Pause freeze; `jump_to` per-id reset; hot N reset; novelty no-op |
| Contract + manifest | Update before implementation code |

### Test strategy

| Scenario | Test file |
|----------|-----------|
| Pure cadence math | `recurring-cadence.service.spec.ts` |
| End-to-end rotation ticks | `kiosk-rotation.controller.spec.ts` |
| Simultaneous due (tick 30/31) | `kiosk-rotation.controller.spec.ts` |
| Recurring-only filler | `kiosk-rotation.controller.spec.ts` |
| Pause / jump_to / cadence poll | `kiosk-rotation.controller.spec.ts` |
| Legacy shared-counter tests | Update or remove superseded expectations |

Remove or rewrite tests asserting `counter > N` and `pickRecurringItem` smallest-cadence-only behavior.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |

## Next command

`/speckit-tasks` — generate `tasks.md` from this plan and user stories.
