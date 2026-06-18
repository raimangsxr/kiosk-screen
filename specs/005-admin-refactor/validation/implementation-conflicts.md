# Implementation Conflicts

FR-020 is an active stop-the-line gate. If implementation reality conflicts with the approved spec, plan, or tasks, record the conflict here before the affected implementation continues.

| Date | Task | Conflict | Stop Point | Artifact Update | Approval Evidence | Resolution |
|------|------|----------|------------|-----------------|-------------------|------------|
| 2026-06-17 | T117 | Angular build exits with code -1 and no actionable diagnostics after bundle startup output, even when run from `frontend/` with Node 22 forced in PATH. | Final acceptance cannot mark frontend production build as passed. | Recorded failure in `validation/final-acceptance.md`. | None yet. | Open; investigate Angular CLI builder/runtime environment before final acceptance. |
