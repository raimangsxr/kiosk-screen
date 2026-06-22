# Implementation Plan: Display Control Canonical

**Branch**: `019-display-control-canonical` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

## Summary

Consolidate the four cross-spec amendments to `display_control_state`
(006, 016, 017, 018) into a single canonical spec at
`specs/019-display-control-canonical/`. This is a documentation-only
PR: no runtime code changes, no new dependencies, no new tables.
A new contract file `contracts/audit-display-events.md` lists every
`DisplayEventType` referenced in any spec.

## Technical Context

- **Language/Version**: N/A (documentation-only).
- **Primary Dependencies**: Spec Kit `0.8.11` (no change).
- **Storage**: N/A.
- **Testing**: `/speckit.analyze` on the new spec to confirm no
  contradictions with archived 006/016/017/018.
- **Target Platform**: N/A.
- **Project Type**: N/A.
- **Performance Goals**: N/A.
- **Constraints**: Spec size budget per Principle VIII
  (`spec.md` ≤ 250 lines excluding frontmatter; this plan is a
  reference-only document).
- **Scale/Scope**: 1 spec.md, 1 plan.md, 1 tasks.md, 1 data-model.md,
  1 contracts/audit-display-events.md. Total: 5 new files.

## Constitution Check

*Re-checked after Phase 1 constitution v2.0.0.*

- **Spec traceability**: Plan references the approved canonical
  spec and the four amending specs (006, 016, 017, 018). ✓
- **Requirement clarity**: All 20 FRs map to one of the four
  amending specs. No `NEEDS CLARIFICATION` markers. ✓
- **Plan alignment**: Documentation-only; no behavior change. ✓
- **Simplicity**: No new dependencies; no new abstractions. ✓
- **Contracts**: `contracts/audit-display-events.md` lists every
  audit event type referenced in any spec. ✓
- **Testing**: `/speckit.analyze` self-review is the validation
  gate. ✓
- **Security, observability, accessibility**: N/A (doc-only). ✓
- **No speculative scope**: Out-of-scope list explicit. ✓
- **Conflict handling**: If a future amend-019 spec conflicts with
  006/016/017/018, the conflict is logged in
  `validation/implementation-conflicts.md` and the amend-019 spec's
  plan is updated. ✓
- **Capability boundary (Principle VII)**: This spec declares
  `capability: C5-remote-control`. The actual runtime code lives in
  C1 (kiosk display) and C5 (remote control). The cross-capability
  nature is documented in the spec's "Cross-capability surfaces"
  paragraph and in the `supersedes.md` chain. ✓
- **Supersession (Principle VI)**: This spec's `## Supersedes` block
  lists 006/016/017/018. Each amending spec's `supersedes.md` (already
  present for 018 and 016) and footer (already present in 017 and
  003) are in place. ✓
- **Size budget (Principle VIII)**: `spec.md` 282 lines excluding
  frontmatter (over the 250 budget). `oversize: true` justification
  in `## Oversize justification` block at the end. ✓
- **Conflict log clean**: `specs/019-display-control-canonical/validation/`
  is empty (the new spec has no prior work). ✓

## Project Structure

### Documentation (this feature)

```text
specs/019-display-control-canonical/
├── plan.md                            # This file
├── spec.md                            # Canonical user stories + FRs
├── data-model.md                      # Canonical display_control_state shape
├── contracts/
│   └── audit-display-events.md        # Every DisplayEventType, payload, producer
└── validation/                        # Empty; future amendments log here
```

### Source Code (repository root)

N/A. No code change.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `spec.md` 282 lines (over 250 budget) | The spec consolidates 4 amending specs (006, 016, 017, 018) and the FR-001..FR-020 set is irreducible without losing the canonical-anchor purpose. | Splitting into 4 sub-specs would defeat the purpose of a single anchor. |

## Oversize justification

The canonical spec needs to enumerate every content mode, every
navigation command, every audit event, and every cross-capability
surface in one place so an engineer answers the four canonical
questions without opening any other spec. Splitting into smaller
specs would re-introduce the distributed-spec tax this PR exists to
eliminate. The 282-line size is the cost of consolidation; the
savings (one spec instead of four, no cross-walks) is the benefit.