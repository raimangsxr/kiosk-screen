---
id: CHG-024
type: change
status: implemented
modifies:
  - EVENT.BRANDING
  - DISPLAY.RUNTIME
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Event Config Realtime Sync

**Feature Branch**: `024-event-config-realtime-sync`
**Created**: 2026-06-29
**Status**: Implemented

**Input**: User description: "En el módulo de Event del panel de administración, todos los cambios se deben reflejar en el display sin necesidad de refrescar, y los inputs de tamaño y posición deben ser sliders para poder iterar visualmente mientras el display se actualiza en tiempo real."

## User Scenarios & Testing

### User Story 1 — Layout changes propagate to the kiosk without manual refresh (Priority: P1)

The operator opens the Event configuration form in one browser tab and the kiosk `/display` in another tab (or on the kiosk machine itself). When the operator changes any branding layout value in the admin form, the kiosk display reflects the new value without requiring a manual reload and without waiting for the next 3-5 s polling cycle.

**Why this priority**: today the operator must wait up to `remoteControlPollingSeconds` (default 5 s) for the display to catch up; for visual iteration this delay is too long and breaks the workflow.

**Independent Test**: with both the admin form and `/display` open in the same browser, change any layout slider in the admin; the corresponding value on the kiosk branding overlay reflects the change within ~500 ms (a single debounce + round-trip), and the operator does not need to refresh the display tab.

**Acceptance Scenarios**:

1. **Given** the admin form and `/display` are both open in the same browser, **When** the operator moves the `logoSize` slider from 6 to 12, **Then** the kiosk overlay logo height visibly grows within 1 s and no manual reload is performed.
2. **Given** the admin form is open in tab A and `/display` is open in tab B, **When** the operator moves any layout slider in tab A, **Then** tab B's overlay reflects the change within ~1 s without the operator interacting with tab B.
3. **Given** the operator drags a slider continuously for several seconds, **When** the operator releases the slider, **Then** the kiosk reflects the final value (not intermediate values) and at most one save request is issued for the drag.

### User Story 2 — Layout fields are sliders, not number inputs (Priority: P1)

All ten branding layout fields in the admin form (logoSize, logoX, logoY, logoTransparency, logoBorderRadius, eventNameSize, eventNameX, eventNameY, eventNameTransparency, eventNameBorderRadius) are rendered as Material sliders instead of `<input type="number">` so the operator can visually iterate while watching the kiosk update in real time. Each slider keeps the documented min/max/step range and shows its current numeric value.

**Why this priority**: number inputs require typing exact values, which breaks the visual iteration loop; sliders let the operator see the change immediately as they drag.

**Independent Test**: open the Event configuration form; every layout field renders as a slider with the field label, current value, and the documented range; no number input remains in the branding layout section.

**Acceptance Scenarios**:

1. **Given** the admin form is loaded with a saved event configuration, **When** the operator views the branding layout section, **Then** all ten fields render as Material sliders, each showing its current numeric value and the documented min/max range.
2. **Given** a slider is rendered, **When** the operator drags the thumb, **Then** the value updates continuously, the slider snaps to the configured step, and the value indicator shows the current value.
3. **Given** the operator uses keyboard arrows on a focused slider, **When** the operator presses Left/Right or Up/Down, **Then** the value increments/decrements by the configured step.

### User Story 3 — Explicit Save still works for non-layout fields (Priority: P2)

The Save button remains for the non-layout fields (eventName, organizerName, eventDurationMinutes, logo file upload, remove-logo checkbox). Layout sliders auto-save independently. Both paths update the backend record, emit the cross-tab notification, and refresh the kiosk branding.

**Why this priority**: removing the Save button would change too much existing UX and risk surprising the operator; auto-saving only the layout keeps the iteration loop tight without touching the rest of the form.

**Independent Test**: change the event name in the text input, click Save; the backend updates, the snackbar shows "Event configuration saved.", and the kiosk overlay shows the new event name within ~1 s.

**Acceptance Scenarios**:

1. **Given** the operator edits `eventName` in the text input, **When** the operator clicks Save, **Then** the form submits, the success snackbar appears, and the kiosk reflects the new event name within ~1 s.
2. **Given** the operator edits only a layout slider (no Save click), **When** the operator releases the slider, **Then** no snackbar appears, no form-submit happens, and the kiosk reflects the change.
3. **Given** the operator uploads a new logo file, **When** the operator clicks Save, **Then** the new logo is uploaded, the form is repopulated from the response, and the kiosk reflects the new logo.

### User Story 4 — Auto-save errors surface without disrupting the iteration loop (Priority: P2)

If a layout auto-save fails (network error, validation error, server unavailable), the form shows a small error indicator on the affected section without losing the operator's pending value, without showing a toast, and without blocking further slider movements. The next successful auto-save clears the error.

**Why this priority**: silent failures erode trust; disruptive failures (toasts, page reloads) break the iteration loop the operator is trying to establish.

**Independent Test**: with the backend rejecting PUT /event-configuration, move a slider; the layout section shows a small "Error — will retry" indicator, the slider keeps its new value, and the operator can continue moving sliders.

**Acceptance Scenarios**:

1. **Given** a previous auto-save failed, **When** the operator moves another slider, **Then** the new auto-save attempts and on success the error indicator is cleared.
2. **Given** the backend is unavailable, **When** the operator moves a slider, **Then** the error indicator shows and the slider value is retained; on the next successful save the indicator clears.
3. **Given** an auto-save error, **When** the operator navigates away from the page, **Then** no retry storm fires (the subscription is unbound on destroy).

## Requirements

### Functional Requirements

- **FR-001**: The Event configuration form MUST render all ten branding layout fields as Material sliders, preserving the documented `min`, `max`, `step`, and unit per field.
- **FR-002**: Each layout slider MUST auto-save its value to the backend with a debounce of 300-500 ms after the last change; intermediate values MUST NOT trigger separate save requests during a continuous drag.
- **FR-003**: The auto-save MUST be skipped when the layout values equal the last saved values (distinct comparison); pristine form or programmatic `patchValue` MUST NOT trigger auto-save.
- **FR-004**: After every successful layout save (auto or explicit), the frontend MUST notify a cross-tab channel (BroadcastChannel + localStorage fallback) so any open `/display` tab refreshes its branding immediately.
- **FR-005**: The `/display` route MUST subscribe to the cross-tab channel and refresh the EventBranding snapshot within one event loop turn of receiving a notification, in addition to the existing polling cycle.
- **FR-006**: The explicit Save button MUST remain for the non-layout fields (eventName, organizerName, eventDurationMinutes, logo file, removeLogo). Layout auto-save MUST NOT also trigger an explicit Save submit.
- **FR-007**: Layout auto-save failures MUST surface as a non-blocking indicator on the affected section; the slider MUST retain its pending value; no toast or page navigation MUST happen on auto-save error.
- **FR-008**: The new cross-tab channel name MUST NOT collide with the existing `kiosk-display-control-sync` channel used by the remote control flow.
- **FR-009**: Layout auto-save MUST NOT bypass the existing dirty-form guard; navigating away with a pending in-flight save MUST warn the operator via the existing guard.
- **FR-010**: The 10 layout fields MUST keep their existing range validators (`min`, `max`) so out-of-range values are rejected by the form regardless of slider position.

### Traceability & Quality Requirements

- **TQ-001**: Auto-save behavior MUST be covered by a Karma spec: drag the slider, assert the facade is called once after the debounce window, assert the cross-tab notification is emitted.
- **TQ-002**: The display-side subscription MUST be covered by a Karma spec: simulate a cross-tab notification, assert `EventBrandingService.refresh()` is called.
- **TQ-003**: The contracts `EVENT.BRANDING` and `DISPLAY.RUNTIME` MUST be updated before implementation with the new live-update behavior; the change history MUST list CHG-024.
- **TQ-004**: No new backend changes; the existing `PUT /event-configuration` and `GET /event-branding` endpoints are reused unchanged.
- **TQ-005**: No new external dependencies; only Angular Material `MatSliderModule` is added (already in `@angular/material`).

## Key Entities

- **`EventConfigLayoutValue`** (frontend form value): unchanged, owned by `event-config.facade.ts`. Ten numeric fields, `number | null`.
- **`EventConfigSyncService`** (new): a `providedIn: 'root'` service analogous to `DisplayControlSyncService`. Exposes `changes$` (Observable) and `notifyEventConfigChanged()`. Uses BroadcastChannel `kiosk-event-config-sync` and localStorage key `kiosk-event-config-sync-event`.

## Success Criteria

- **SC-001**: With both the admin form and `/display` open, dragging any layout slider causes the kiosk overlay to reflect the new value within 1 s in 95% of cases (measured by integration test with mocked debounce + HTTP).
- **SC-002**: The 10 layout fields render as sliders with no `<input type="number">` remaining in the layout section; verified by DOM assertion in the component spec.
- **SC-003**: A single continuous drag of a slider triggers exactly one PUT /event-configuration request, verified by spy count.
- **SC-004**: The explicit Save button still saves all non-layout fields and emits a success snackbar, verified by the existing `submit()` path.
- **SC-005**: A failed auto-save shows the error indicator, retains the pending value, and clears the indicator on the next successful save; verified by spec with a mocked failing facade.

## Assumptions

- The operator uses the admin form and the kiosk `/display` in the same browser (cross-tab) or the kiosk polls and catches up within the polling interval (cross-machine).
- The existing `EventBrandingService.refresh()` is the single entry point for refreshing branding on the display; we reuse it from the new notification subscriber.
- The backend `PUT /event-configuration` accepts a payload with only the layout JSON fields and no file (regression risk: nil). The existing `event_configuration_service.py` already handles partial updates.
- The Angular Material `MatSliderModule` is already in `node_modules` (no new dependency).

## Supersedes

- None.

## Superseded by

- None yet.