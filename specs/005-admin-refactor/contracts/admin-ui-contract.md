# Admin UI Contract: Administration Refactor

## Purpose

Define the observable administration experience that must be preserved or intentionally replaced during the refactor.

## Global Navigation Contract

- Authenticated users land on the hall after login.
- The hall exposes kiosk mode and administration options.
- Administration exposes persistent navigation to:
  - dashboard
  - content
  - ads
  - clients
  - approved domains
  - display configuration
  - readiness
  - users and roles
- Administration exposes a clear action to enter kiosk mode from every section.
- Kiosk mode returns to the hall when Escape is pressed.

## Shared Administration State Contract

Every administration list or form must expose these states where applicable:

- loading
- ready
- empty
- saving
- saved
- validation error
- permission error
- dependency conflict
- upload/storage error
- unexpected recoverable failure

## List Contract

Every administration list must provide:

- meaningful page title
- primary create action when creation is supported
- row status for active/inactive or readiness-relevant state
- row actions that match permitted behavior
- empty state with next action
- safe error state
- refresh after successful mutation

## Form Contract

Every create/edit form must provide:

- clear title and mode
- visible labels
- required field validation
- domain-specific validation
- dirty-change warning before navigation loss
- save progress state
- save success state
- safe failure state
- cancel or back navigation

## Capability Contracts

### Content

Must support image, video, and iframe content with title, source or upload, active state, ordering, rotation time, rotation animation, animation duration, availability metadata when present, and safe save/delete behavior.

### Ads

Must support image ads with client association, label, upload, active state, ordering, rotation time, rotation animation, animation duration, availability metadata when present, and safe save/delete behavior.

### Clients

Must support list, create, edit, active/inactive state, delete when safe, and deactivate/reactivate when active ads block delete.

### Approved Domains

Must support list, create, edit, active/inactive state, delete when safe, and deactivate/reactivate when active iframe content blocks delete.

### Display Configuration

Must support name, enabled state, main content timing, ad timing, rotation animations, animation durations, inline ad count, and event duration.

### Readiness

Must show blockers and warnings with navigation or direction to the section that resolves them.

### Users And Roles

Must support list, create, edit, active/inactive state, and assignment of existing role types only.

## Accessibility Contract

- All interactive controls must be keyboard reachable.
- Focus state must be visible.
- Form fields must have labels.
- Status and error messages must be exposed through appropriate semantics.
- Administration must be readable and usable at 1024x768 and 1440x900.

## Contract Change Rule

Any changed or replaced flow must include:

- old observable behavior
- new observable behavior
- reason for change
- migration or compatibility note
- validation evidence
