# UI Contract: Remote Control Display

## Hall Entry

- Hall exposes a remote control destination only to administrator users.
- Non-administrator users do not get a usable remote control entry point.
- Existing hall destinations remain available.

## Administrator Remote Control Screen

### Required Controls

- Content mode selector with:
  - `Loop`
  - `Iframe`
- Iframe selector, visible or enabled when iframe mode is selected.
- Ads visibility toggle.

### Required States

- Loading current remote state.
- Loading iframe options.
- Saving/applying immediate update.
- Saved/current state.
- Safe error state.
- No active display session.
- No eligible iframe options.

### Behavior

- Changing mode, selected iframe, or ads visibility sends an immediate update.
- The screen reflects the latest successful current state.
- Invalid update errors do not present stale success.
- Close-together valid updates resolve to the latest valid state.
- The screen does not allow arbitrary URL entry.

### Accessibility

- Controls have visible labels.
- Keyboard users can reach and operate every control.
- Focus state is visible.
- Saving and error status are available as visible status feedback.

## Running Display

### Loop Mode With Ads Visible

- Uses existing eligible content rotation in the content region.
- Uses existing eligible ads region.
- Existing Escape-to-hall behavior remains unchanged.

### Iframe Mode With Ads Visible

- Shows selected iframe in the content region.
- Keeps the ads region visible.

### Loop Mode With Ads Hidden

- Uses existing eligible content rotation.
- Hides ads region.
- Content occupies full display height.

### Iframe Mode With Ads Hidden

- Shows selected iframe.
- Hides ads region.
- Iframe/content occupies full display height.

### Hot Configuration Application

- Running display applies changed polling interval without manual refresh.
- Running display applies changed content timing, ad timing, animation, visible ad count, and display enablement without manual refresh.
- Active rotation/layout state is recalculated when effective configuration changes.

### Fallback And Recovery

- If selected iframe becomes invalid or unavailable, display shows safe visible fallback and remains recoverable from later valid remote control changes.
- If polling temporarily fails, display continues with last safe state or fallback and resumes updates when polling recovers.

## Manual Smoke Contract

Manual validation uses one display session and one administrator control session:

1. Open display.
2. Open remote control as administrator.
3. Switch loop to iframe.
4. Hide ads and verify full-height content.
5. Show ads and verify regular layout.
6. Switch back to loop.
7. Change polling interval in configuration and verify subsequent updates use it.
8. Change display timing or ad count and verify display hot-applies it.
9. Verify non-administrator cannot use remote control.
10. Verify Escape returns display to hall.
