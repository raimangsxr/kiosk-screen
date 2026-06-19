# Data Model: Remote Control Admin Polish

This data model documents the UI-only view models and the contract
that the rewritten `RemoteControlComponent` consumes. No backend data
model changes are introduced.

## StatusPillViewModel

A UI-only derived model rendered by the rewritten component. Not
persisted.

### Fields

- `mode`: `'rotation' | 'iframe'`. Maps from `RemoteControlState.contentMode`.
- `modeLabel`: `'Rotation' | 'Iframe'`. Display label for the chip.
- `modeIcon`: `'loop' | 'cast_connected'`. Material icon for the chip.
- `modeKind`: `'neutral' | 'primary'`. Passed to `StatusChipComponent`.
- `adsVisible`: `boolean`. Maps from `RemoteControlState.adsVisible`.
- `adsLabel`: `'Visible' | 'Hidden'`. Display label for the chip.
- `adsIcon`: `'campaign' | 'visibility_off'`. Material icon for the chip.
- `adsKind`: `'success' | 'neutral'`. Passed to `StatusChipComponent`.
- `displayOnline`: `boolean | null`. `null` when the backend has
  not reported the field yet. Maps from
  `RemoteControlState.displaySessionActive`.
- `displayLabel`: `'Display online' | 'Display offline' | 'Display status unknown'`.
- `displayIcon`: `'sync'`. Material icon for the chip.
- `displayKind`: `'success' | 'neutral' | 'warning'`.
- `updatedAt`: `string | null`. Maps from
  `RemoteControlState.updatedAt`. Raw ISO 8601.
- `updatedLabel`: `string`. Human-readable result of the
  `relativeTime(updatedAt)` helper.
- `saving`: `boolean`. Maps from `RemoteControlFacade.saving()`.
- `savingSuffix`: `'' | ' · Saving…'`. Suffix appended to the status
  pill when `saving` is `true`.

### Derivation

The view model is a `computed()` over the facade signals
(`state`, `saving`, `iframeOptions`, `error`). It is not stored in
a signal of its own; the component reads the facade signals
directly and derives the labels in the template (or in a small
`computed()` for the `updatedLabel`).

## IframeListViewModel

A UI-only derived list of one entry per configured iframe. Not
persisted.

### Fields

- `id`: `string`. Maps from `RemoteControlIframeOption.id`.
- `title`: `string`. Maps from `RemoteControlIframeOption.title`.
- `url`: `string`. Maps from
  `RemoteControlIframeOption.sourceReference`, truncated to
  48 characters with an ellipsis when longer.
- `selected`: `boolean`. `true` when this iframe is the current
  `selectedContentId` and the current mode is `'iframe'`.

### Derivation

The view model is a `computed()` over `facade.iframeOptions()` and
`facade.state()?.selectedContentId`. The component reads the
`computed()` directly in the template.

## ErrorViewModel

A UI-only derived model for the inline error block. Not persisted.

### Fields

- `kind`: `'load' | 'update'`. Whether the error came from the
  initial `refresh()` or from a save.
- `title`: `string`. Display title.
- `message`: `string`. Display message; sanitized by
  `adaptApiError()`.

### Derivation

The component reads `facade.error()` (which is already a
sanitized `ApplicationErrorContract` from the facade's
`adaptApiError()` call) and the `updateError` local signal
(which is set to `true` in the `error` callback of each save
subscription). The two signals are joined in the template:
`load` if `facade.error() !== null` and `state() === null`,
otherwise `update`.

## State transitions

This feature does not introduce new backend state transitions. The
existing transitions in
`specs/006-remote-control-display/data-model.md` apply unchanged.

## Validation rules

- `mode='iframe'` requires at least one iframe in the
  `IframeListViewModel`. When the list is empty, the Iframe radio
  is disabled and no iframe is selected. The status pill still
  reflects the current mode (which can be `iframe` only if there
  was a previously selected iframe that is no longer eligible;
  this is an edge case covered by `spec.md`).
- `url` is the source URL truncated to 48 characters; the
  truncation is purely cosmetic. The full URL is the source of
  truth and is sent to the backend unchanged.

## Relationships

```text
RemoteControlComponent
  ├── reads: RemoteControlFacade.state
  ├── reads: RemoteControlFacade.iframeOptions
  ├── reads: RemoteControlFacade.saving
  ├── reads: RemoteControlFacade.error
  ├── emits: RemoteControlFacade.setLoopMode
  ├── emits: RemoteControlFacade.setIframeMode(id)
  ├── emits: RemoteControlFacade.setAdsVisible(boolean)
  ├── reads: MatSnackBar (success)
  └── navigates: /hall (back button)
```

The component is the only consumer of the facade signals in this
feature. No other component, service, or guard is affected.
