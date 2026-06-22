# specs/

This directory holds the Spec Kit feature directories. The layout is
being reorganized under the SDD optimization plan; this README captures
both the current layout and the future target.

## Current layout (until Phase 2 ships)

`specs/NNN-feature-name/` — one directory per feature, each containing
the standard Spec Kit artefacts (`spec.md`, `plan.md`, `tasks.md`,
`research.md`, `data-model.md`, `quickstart.md`, `checklists/`,
`contracts/`, optional `validation/`).

Active feature: `018-content-rotation-modes/` (see `.specify/feature.json`
and `AGENTS.md`).

## Future layout (Phases 2–5 of the SDD optimization plan)

```
specs/
├── _active/                                  # exactly one symlink to the active feature
├── _capabilities/
│   ├── C1-kiosk-display-runtime/
│   │   ├── overview.md
│   │   ├── index.specs.md
│   │   └── supersedes.md
│   ├── C2-content-and-ads/
│   ├── C3-admin-shell/
│   ├── C4-configuration-and-setup/
│   ├── C5-remote-control/
│   ├── C6-public-api-and-keys/
│   └── C7-event-branding/
├── _archive/
│   ├── C1-kiosk-display-runtime/             # 002, 006, 016, 018 (on closure)
│   ├── C2-content-and-ads/                   # 003, 009
│   ├── C3-admin-shell/                       # 004, 005, 010-014 (consolidated)
│   ├── C5-remote-control/                    # 015 (reality.md)
│   └── C7-event-branding/                    # 017 (on 018 closure)
└── README.md                                 # this file
```

Each capability directory contains ≤ 60-line `overview.md` plus
`index.specs.md` (mapping specs to capability) and `supersedes.md`
(cross-spec amendments). Agents read the active capability overview
first, before opening any feature directory.

Each archived spec dir keeps its original `spec.md`, `plan.md`,
`tasks.md`, etc. verbatim. A top-level `status.md` summarizes closure
state and points at the next live spec that owns the area.

## Where to start

When implementing, reviewing, or validating a feature:

1. Read `specs/_capabilities/<active-cap>/overview.md` (once the layout
   ships in Phase 5; before that, read `sdd-optimization/05-capability-map-from-code.md`).
2. Read the active feature's `tasks.md` (the current
   `specs/018-content-rotation-modes/tasks.md`).
3. Open `spec.md`, `plan.md`, `research.md`, `data-model.md`, or
   `contracts/` as needed for the active task.

The AGENTS.md preamble documents this flow.

## Spec Kit compatibility

All Spec Kit commands (`/speckit.constitution`, `/speckit.specify`,
`/speckit.clarify`, `/speckit.checklist`, `/speckit.plan`,
`/speckit.tasks`, `/speckit.analyze`, `/speckit.implement`) work with
this layout. The Speckit analyzer skill finds the expected artefacts
inside each feature directory, whether it is active or archived.

## Conventions

- One branch per feature, named `NNN-feature-name` to match the spec
  directory.
- One merge PR per feature.
- Closed features move to `_archive/<cap>/<NNN>/` within one housekeeping
  PR.
- Cross-spec amendments live in `<new-spec>/supersedes.md` and produce a
  one-line footer in the amended spec.

## See also

- `sdd-optimization/00-executive-summary.md` — overview.
- `sdd-optimization/07-target-speckit-structure.md` — detailed layout.
- `sdd-optimization/08-refactoring-roadmap.md` — phased PR plan.
- `sdd-optimization/10-future-speckit-governance.md` — sustainability rules.