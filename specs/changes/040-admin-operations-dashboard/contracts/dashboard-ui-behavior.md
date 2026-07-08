# Contract Delta: Admin Operations Dashboard

**Date**: 2026-07-08  
**Target active contracts**: `ADMIN.SHELL.NAVIGATION`, `READINESS.SETUP`  
**Change**: CHG-040

Merge into active contracts before implementation.

---

## ADMIN.SHELL.NAVIGATION — additions / replacements

### Dashboard purpose (replaces legacy grid description)

The admin dashboard at `/admin` is an **operations center**, not a duplicate of sidenav navigation. It answers readiness, live display status, recent activity, and programmed content order.

### Dashboard sections (above the fold order)

1. **Operations summary** — readiness chip; display online/offline; remote-control mode (rotación / iframe / fijo); ads visible/hidden; last updated; pinned content title in fixed mode; actions: Abrir display, Control remoto.
2. **Readiness alerts** — blockers and warnings with resolve navigation (same route heuristics as `/admin/readiness`). Omitted when ready with no warnings.
3. **Content queue** — active top content in `displayOrder` with labels for regular, recurrente (cada N), and fijo elegible; pinned item highlighted in fixed mode. Excludes novelty items from the list.
4. **Recent activity** — bounded list (≤15) of display audit events, newest first, with severity and timestamp. Section-level empty and error states; does not fail the whole page.

### Removed dashboard behavior

- Legacy **section-summary card grid** (Contenido, Anuncios, Evento, Iframes, Pantalla, Usuarios counts) MUST NOT be shown.
- Static **quick-action card grid** duplicated from sidenav MUST NOT be shown as primary navigation.

### Partial degradation

When an upstream source fails, only that section shows degraded/unavailable state; other sections continue to render. The operations hero shows a section-level retry control when the live-status source fails (re-fetches live slice without full page reload). Overall page MUST NOT blank except auth/session failure.

### Copy and layout

- All dashboard operator copy is Spanish.
- Dashboard MUST NOT introduce horizontal page scroll on compact or expanded admin viewports.
- Long content and event titles in queue/activity rows use ellipsis truncation; hero pinned title wraps up to two lines.

### Unchanged

- Grouped sidenav (Operación / Configuración / Acceso) remains canonical navigation.
- Dedicated `/admin/readiness` page is not removed.
- Hall routing unchanged.

---

## READINESS.SETUP — additions

### Dashboard readiness surfacing

- The dashboard MUST surface the same blocker and warning messages returned by readiness evaluation.
- Each blocker and warning on the dashboard MUST include a navigation control to the appropriate admin resolution route (equivalent intent to the readiness page "Resolver" / "Revisar" actions).
- Dashboard readiness failure (endpoint unavailable) MUST show a recoverable error in the readiness section without preventing other dashboard sections from rendering when their sources succeed.

---

## DISPLAY.EVENTS.AUDIT — read-only dependency (no contract change required)

Dashboard consumes `GET /events` for the activity excerpt. No new event types or producers.

---

## Quality gate

- `frontend/src/app/features/dashboard/**/*.spec.ts` covers fold/degrade, hero, alerts, queue order, activity empty/error, absence of legacy grid.
- Manual: blocked readiness → one-click resolve from dashboard.
