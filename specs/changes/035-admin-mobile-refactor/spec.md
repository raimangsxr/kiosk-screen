---
id: CHG-035
type: change
status: implemented
modifies:
  - ADMIN.SHELL.NAVIGATION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---
# Feature Specification: Admin Mobile-First Refactor

**Created**: 2026-07-06

**Status**: Implemented

**Input**: Complete admin frontend refactor with unified mobile-first layout, grouped drawer navigation, new UI primitives, Spanish copy, and full mobile parity for all list screens. Nav search filter was removed in CHG-037.

## User Scenarios

### User Story 1 — Compact viewport navigation (Priority: P1)

An operator on a phone or narrow window opens `/admin`. The shell shows a hamburger menu, grouped sidenav, and toolbar title plus subtitle on deep routes.

**Acceptance**:

1. Viewport ≤599px: sidenav `over`, menu button visible, backdrop on open.
2. Narrow desktop window (~500px) without handset flag: menu button still visible (uses `isCompact()`).
3. Navigation groups: Operación, Configuración, Acceso.

### User Story 2 — Unified admin UI primitives (Priority: P1)

All admin screens use `AdminPage`, `AdminList`, `AdminFormShell`, and `AdminActionBar`.

**Acceptance**:

1. Lists show cards on compact/tablet (`prefersCards()`), tables on expanded desktop.
2. Primary create action uses FAB on compact.
3. Bulk actions use sticky bar when items selected on compact.
4. Confirmations use bottom sheet on compact, dialog on expanded.

### User Story 3 — Mobile list parity (Priority: P1)

Content and ads lists support selection, bulk actions, and reorder (up/down buttons) in card view.

**Acceptance**:

1. Iframes list has card view with edit/delete.
2. No horizontal page scroll on any admin route.

### User Story 4 — Spanish copy (Priority: P2)

All admin UI strings are Spanish.

## Non-goals

- Hall, login, kiosk display runtime changes.
- Backend API changes.
- Multi-language i18n framework.
