# Research: CHG-049 Display Device Admin

**Date**: 2026-08-03

## R1 — Admin route and navigation

**Decision**: Route `/admin/displays`; navigation item **Pantallas** in the **Configuración** group with summary «Inventario y etiquetas de quioscos conectados».

**Rationale**: Matches existing English URL segments (`/admin/content`, `/admin/iframes`, `/admin/configuration`) with Spanish labels in `AdminNavigationService`. Distinct from `/admin/configuration` («Pantalla» = kiosk timing/animation settings).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| `/admin/pantallas` | Breaks English route convention used across admin |
| Sub-route under `/admin/configuration` | Conflates device registry with display timing config |
| `/admin/screens` | Less aligned with domain term `display_devices` in API |

---

## R2 — Backend surface

**Decision**: No new endpoints. Use existing:

- `GET/POST/PATCH/DELETE /api/admin/display-devices`
- `GET /api/admin/display/kiosks/live` for connection enrichment

**Rationale**: FR-007 and contract CHG-045 already expose full CRUD. Connection status is derived client-side (spec assumption).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| `GET /admin/display-devices?includeConnected=true` | Unnecessary server work; live kiosks endpoint already exists |
| SSE for device list | Overkill for ≤50 rows and 30 s refresh SLA |

---

## R3 — Connection status merge

**Decision**: `DisplayDevicesFacade` loads devices and live kiosks via `forkJoin`; builds `Set<string>` of connected labels from `liveKiosks[].displayLabel` (non-null); maps each device to `connected: labels.has(device.label)`.

**Rationale**: Same label-matching semantics as `iframe_service.py` / iframe scale matrix. No device id on live kiosks endpoint today.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Match by kiosk id | Live endpoint returns `kioskId` + `displayLabel` only; no `displayDeviceId` |
| Extend live kiosks API with device id | Out of scope; client merge sufficient |

---

## R4 — Periodic refresh

**Decision**: On list component init, call `facade.startPolling(30_000)` using `interval(30_000).pipe(startWith(0), switchMap(() => facade.refresh()), takeUntilDestroyed(destroyRef))`. Stop implicitly on destroy.

**Rationale**: Meets SC-006 / FR-002 clarification without SSE. `takeUntilDestroyed` aligns with Angular best practices in this codebase.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Manual refresh only | Fails SC-006 |
| Reuse dashboard facade | Couples unrelated features; dashboard loads many slices |
| `setInterval` in component | Prefer RxJS + `DestroyRef` for cleanup |

---

## R5 — Create UX

**Decision**: Inline header form inside `adminListActions` slot: `mat-form-field` (label) + «Añadir pantalla» button; disabled when empty; snackbar on success/error; clear field on success.

**Rationale**: Clarification session answer; matches prior iframe pre-create pattern but at list level. Faster than modal for sequential pre-creation during event setup.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Modal create (like API keys) | Rejected in clarification |
| Primary action route to `/displays/new` | Single-field entity does not need dedicated page |

---

## R6 — Rename UX

**Decision**: `DisplayDeviceRenameDialogComponent` opened via `MatDialog` with `data: { deviceId, label }`; PATCH on save; list refreshes on close with result.

**Rationale**: Clarification session answer; consistent with `ApiKeysApiKeyCreateDialogComponent` pattern.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Inline row edit | Rejected in clarification |
| Navigate to edit page | Unnecessary for one field |

---

## R7 — Delete UX

**Decision**: `ConfirmDialogService.confirm()` with destructive flag; message includes connected warning when `row.connected === true`: «Esta pantalla está conectada ahora mismo.» Reuse delete copy pattern from iframe form (without scale-specific text).

**Rationale**: FR-005, FR-006; existing `ConfirmDialogService` used across admin.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Block delete when connected | Spec allows delete with warning only |
| Soft-delete | No backend support |

---

## R8 — Iframe form decoupling

**Decision**: Remove from `iframe-form.component.ts`: pre-create field/button, per-row delete button, `precreateDevice()`, `deleteDevice()`. Add `routerLink="/admin/displays"` link «Gestionar pantallas» in matrix header. Remove `precreateDisplayDevice` / `deleteDisplayDevice` from `IframeFacade`.

**Rationale**: FR-009 / clarification A — single lifecycle entry point. **Implementation order**: complete decoupling **before** shipping create/delete on `/admin/displays` (tasks Phase 3 blocks Phases 5–6).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Keep shortcuts | Rejected in clarification |
| Keep facade methods unused | Dead code; confuses future maintainers |

---

## R9 — List layout and mobile

**Decision**: `AdminListComponent` with desktop `mat-table` columns: label, connection status (`StatusChipComponent`), last seen, actions (rename, delete). Compact card layout via `#adminListCards` template on mobile (CHG-035 pattern).

**Rationale**: Consistent with `api-keys-list`, `iframe-list`, `content-list`. No pagination (edge case >20 uses scroll).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Table only on mobile | Violates CHG-035 admin mobile ergonomics |
| Virtual scroll | Unnecessary at expected scale |

---

## R10 — Sort order

**Decision**: Client-side sort `devices.sort((a, b) => a.label.localeCompare(b.label, 'es'))` after fetch.

**Rationale**: Spec acceptance scenario 1 (alphabetical by label).

---

## R11 — ADR / observability

**Decision**: No new ADR; no server observability changes.

**Rationale**: Frontend admin UX on existing APIs; constitution V — rationale captured here.
