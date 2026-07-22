# ADR-0011: Live Profile Calibration Preview

**Status**: Superseded by ADR-0012 (CHG-044)  
**Date**: 2026-07-21  
**Change**: CHG-043

## Context

CHG-042 added layout profiles and on-display local overrides. Operators calibrating
profiles in admin previously typed pixel values without seeing the physical display.
CHG-043 requires live preview on a connected test kiosk with debounced autosave, without
conflating preview with local overrides (US3).

## Decision

1. **Preview channel**: Targeted SSE `layout_updated` to one `previewKioskId` with
   `source: profile_preview`.
2. **Persistence**: Profile `densities` JSONB updated on debounced PUT; no write to
   `display_devices.local_overrides` during preview.
3. **Fanout scope**:
   - **Autosave** (`PUT` + `previewKioskId`): preview kiosk only (`profile_preview`).
   - **Apply** (`POST .../apply-assigned`): all assigned devices (`profile`).
   - **Assign** (`PATCH .../devices/{id}`): target device only (`profile`).
   Preview never writes `local_overrides`.
4. **Iframe mode**: Confirmation dialog, then admin triggers remote-control iframe mode so
   preview uses the real top-content region (FR-015).

## Consequences

- Kiosk must handle `profile_preview` like `profile` for embed density application.
- Reloading `/display` mid-preview reverts to assigned/override resolution until next preview SSE.
- CHG-042 org-wide fanout on profile PUT is removed; production fanout uses apply-assigned or device assignment paths only.

## Alternatives considered

- Admin embedded iframe: rejected (spec — physical kiosk only).
- Temporary local_override: rejected (breaks FR-008).
