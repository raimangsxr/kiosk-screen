# Data Model: Administration Site Completion

No new persisted entities are expected. The feature organizes and completes administration workflows around existing entities.

## Administration Section

Represents a visible navigation destination within the administration site.

**Attributes**
- `label`: Human-readable section name.
- `destination`: Internal navigation destination.
- `summary`: Optional short status text for dashboard display.
- `quick_action`: Optional primary action for sections that support creation or configuration.
- `active_state`: Whether the section is currently selected.

**Validation Rules**
- Every required administration section must have a visible navigation entry.
- Navigation labels must be consistent across dashboard, shell navigation, and readiness guidance.

## Administration Dashboard

Represents the administrator entry screen after login.

**Attributes**
- `setup_status`: Summary of whether the kiosk is ready, blocked, or has warnings.
- `readiness_blockers`: Blocking setup issues, if any.
- `readiness_warnings`: Non-blocking setup issues, if any.
- `quick_actions`: Shortcuts to required setup actions.
- `section_summaries`: Counts or status indicators for key sections.

**Validation Rules**
- Dashboard status must not contradict the readiness section.
- Quick actions must navigate to visible administration sections.
- Dashboard must not expose secrets, internal file paths, or raw session data.

## Admin Form State

Represents client-side state for administration forms.

**Attributes**
- `initial_values`: Values loaded or initialized when the form opens.
- `current_values`: Values currently shown in the form.
- `is_dirty`: Whether current values differ from initial values.
- `is_saving`: Whether a save/upload operation is in progress.
- `last_result`: Success or failure message state.

**Validation Rules**
- Dirty forms must warn before navigation away.
- Save buttons must not allow invalid or incomplete required values.
- Error messages must be clear and non-sensitive.

## Managed Records

Existing managed records remain in force:

- Main Content Item
- Client Ad Item
- Client
- Approved Domain
- Display Configuration
- User
- Role Assignment
- Readiness Status

**Shared List Requirements**
- Lists show name/title, type where relevant, active status where relevant, order where relevant, and media/source presence where relevant.
- Empty lists provide a usable empty state and action when creation is supported.
- Content and ad records can be deleted when existing backend deletion succeeds.
- Clients and approved domains can be deactivated/reactivated; hard deletion is allowed only when no active dependent ads or iframe content would be broken.
- Users can be created and edited with email, display name, active status, and existing role assignments. Password reset and creation of new role types are outside this feature.

## State Transitions

### Form State
- Pristine -> Dirty when the administrator changes a field.
- Dirty -> Saved after a successful save and list/detail refresh.
- Dirty -> Discarded when the administrator confirms navigation away.
- Saving -> Error when validation, authorization, upload, or storage failure occurs.
- Concurrent successful saves use last-save-wins behavior; the latest successful persisted state must be shown after refresh.

### Dashboard Setup Status
- Unknown -> Ready when required setup is complete and no blockers remain.
- Unknown -> Blocked when readiness blockers exist.
- Unknown -> Warning when non-blocking warnings exist.

## Data Ownership

- All administration data remains scoped to the existing organization model.
- Administrators can manage all kiosk configuration and administration data in this feature.
- Non-administrator role-specific administration variants are outside this feature scope.
