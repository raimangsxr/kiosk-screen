# Admin UI Contract: API Keys Section

**Date**: 2026-06-18
**Spec**: [spec.md](../spec.md)
**Status**: Authoritative for the implementation phase.

This contract defines the user-facing behavior of the new admin section that manages API keys. It describes what the operator sees and does, without prescribing component internals (the implementation lives under `frontend/src/app/features/api-keys/`).

## Section Location

- Route: `/admin/api-keys`
- Parent shell: existing admin shell (`/admin`).
- Navigation: appears in the admin side navigation between "Users & Roles" and "Display Configuration" (or wherever the existing admin nav places new top-level sections; the final position is determined at implementation time).
- Roles allowed: `administrator`. Other roles see an empty section with an "Insufficient permissions" message (consistent with the existing admin pattern).

## List View

When the operator opens the section, they see a list of all API keys in the organization, newest first.

### Columns

| Column | Source | Notes |
|---|---|---|
| Label | `label` | Editable via the create/edit flow. |
| Prefix | `keyPrefix` | The first 14 chars of the key (e.g., `ksk_live_AbCdEfGh`). Non-secret. |
| Status | `isActive` | "Active" (green) or "Revoked" (gray). |
| Created | `createdAt` | Localized date/time. |
| Last rotated | `lastRotatedAt` | "Never" if null. |
| Last used | `lastUsedAt` | "Never" if null. Updated only on successful uploads. |
| Actions | — | Buttons: "Rotate", "Revoke". |

### Empty State

When the org has no keys, the list shows an admin-state component (consistent with `admin-state` pattern in the rest of the admin):
- Title: "No API keys yet"
- Message: "Create a key to let external systems upload content to your kiosk."
- Primary action: "Create key" (opens the create dialog).

### Loading / Error States

- Loading: the existing skeleton/spinner pattern.
- Error: safe error message; "Retry" button calls `refresh()`.
- Empty data with an error: error takes priority (consistent with the rest of the admin).

## Create Dialog

Triggered by the "Create key" button. Modal dialog.

### Fields

- **Label** (text input, required, max 120 chars)
- Description text above the field: "A human-readable name to identify this key. Choose something your team will recognize, like 'Mobile app' or 'Partner integration'."

### Submit

- Button: "Create" (primary).
- On submit: calls `POST /api/admin/api-keys`. On 201, the dialog transitions to a "key created" state showing the raw key. On 4xx, shows the safe error message.

### "Key Created" State (raw key reveal)

This is the only screen that ever shows the raw key. The flow:

1. A panel appears with a warning banner: "Copy this key now. You will not be able to see it again."
2. A read-only field shows the raw key (e.g., `ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX`).
3. A "Copy" button copies the raw key to the clipboard. The button shows a confirmation ("Copied") for 2 seconds.
4. A primary "Done" button closes the dialog and refreshes the list.

The dialog cannot be dismissed by clicking outside or pressing Escape while the raw key is on screen. The "Done" button is the only way out. (The user can still close the tab; the key is recoverable only by rotating.)

### Cancel During Create

Before the "Create" button is clicked, the dialog can be cancelled normally (Escape, click outside, "Cancel" button). After clicking "Create" and receiving a 201, the cancel options are disabled until "Done" is clicked.

## Rotate Action

Triggered by the "Rotate" button on a row. Confirmation dialog:

- Title: "Rotate this key?"
- Message: "The current value of this key will stop working immediately. The new value will be shown once. Are you sure?"
- Buttons: "Cancel" (secondary), "Rotate" (primary, warning color).

On confirm: calls `POST /api/admin/api-keys/{id}/rotate`. On 200, transitions to the same "key rotated" state as create, showing the new raw key with copy + done. On 409 (already revoked), the list is refreshed and a toast says "This key has already been revoked."

## Revoke Action

Triggered by the "Revoke" button on a row. Confirmation dialog:

- Title: "Revoke this key?"
- Message: "External systems using this key will no longer be able to upload. This cannot be undone."
- Buttons: "Cancel" (secondary), "Revoke" (primary, danger color).

On confirm: calls `DELETE /api/admin/api-keys/{id}`. On 204, the list is refreshed. A success toast says "Key revoked."

## Accessibility

- The list is a Material table with proper `aria-label`s and sortable headers (sorting is out of scope; just labels).
- All buttons are keyboard reachable; dialogs trap focus and restore focus on close.
- Color is not the only signal: status uses both text ("Active" / "Revoked") and color.
- The raw key reveal panel uses `aria-live="polite"` to announce the warning to screen readers when the panel appears.

## States (Facade Contract)

The `ApiKeysFacade` exposes the same shape as the other admin facades (e.g., `UsersFacade`):

```ts
class ApiKeysFacade {
  readonly keys: Signal<readonly ApiKeyRecord[]>;
  readonly loading: Signal<boolean>;
  readonly saving: Signal<boolean>;
  readonly error: Signal<ApplicationErrorContract | null>;
  readonly empty: Signal<boolean>;
  readonly ready: Signal<boolean>;

  refresh(): Observable<ApiKeyRecord[]>;
  create(label: string): Observable<{ record: ApiKeyRecord; rawKey: string }>;
  rotate(id: string): Observable<{ record: ApiKeyRecord; rawKey: string }>;
  revoke(id: string): Observable<void>;
  clearError(): void;
}
```

The create and rotate methods return the raw key as part of the success payload. The component captures it before showing the reveal panel; the facade does not store it.

## Routing

- `/admin/api-keys` → `ApiKeysListComponent` (the list + the create/rotate/revoke dialogs as child overlays).
- No nested routes; the section is a single page with modal dialogs.

## Dependencies

- The new feature reuses:
  - `AdminStateComponent` for empty/error/loading states.
  - `mapAdminError` for safe error message mapping.
  - The existing `ApplicationErrorContract` shape from `shared/contracts/admin-contracts.ts`.
  - Material dialog (`MatDialog`), table (`MatTable`), form field (`MatFormField`), button (`MatButton`), and snack bar (`MatSnackBar`) components.
  - The existing `core/api/` style for the API service.

The feature does not introduce new third-party dependencies.
