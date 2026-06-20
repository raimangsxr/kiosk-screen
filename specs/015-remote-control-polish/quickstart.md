# Quickstart: Remote Control Admin Polish

## Prerequisites

- Node 20.x
- The local lab from `README.md` (backend on `:8000`, frontend on
  `:4200`).
- A seeded administrator account (`admin@example.com` / `admin`).
- The kiosk display running in one browser tab (`/display`).
- The admin shell running in a second browser tab (`/admin`).

## Steps

1. **Open the remote-control page**.
   - Sign in as `admin@example.com` / `admin`.
   - From the hall (`/hall`), tap or click "Open remote control",
     or open the admin sidenav and tap "Remote control" (the
     sidenav entry was added by spec 011).
   - You land on `/remote-control`. The surrounding admin shell
     provides the toolbar, back link, and user menu.

2. **Inspect the new layout**.
   - The page header reads "Remote control" with the
     "Administration" eyebrow.
   - The status pill is the first thing below the page header.
     It shows the current mode (Rotation / Iframe), the ads
     visibility (Visible / Hidden), the display session state
     (online / offline), and "Updated <time>".
   - The content-mode card has two radio buttons: Rotation and
     Iframe. The active mode is preselected. The Iframe radio
     shows a "Currently showing" badge on the iframe that is
     currently live on the display.
   - The ads card has a "Show ads" toggle, preselected according
     to the current state.

3. **Switch the mode**.
   - Tap "Rotation". A snackbar at the top of the page reads
     "Switched to rotation mode." and disappears after 3
     seconds. The status pill updates to show "Rotation".
   - Tap "Iframe". If there are iframes configured in the admin
     content section, a list of cards appears below the radio,
     each with the title and the shortened source URL. Pick one.
     A snackbar reads "Now showing: <title>.".
   - If no iframes are configured, the Iframe radio is disabled
     and the helper text "No iframes configured. Add one in the
     admin content section." appears with a primary action
     linking to `/admin/content/new`.

4. **Toggle ads**.
   - Tap "Show ads" to hide them. A snackbar reads "Ads are now
     hidden.". The status pill updates to "Hidden".
   - Tap again to restore. A snackbar reads "Ads are now
     visible.".

5. **Return to the hall**.
   - Use the surrounding admin shell's toolbar (back link) or
     the sidenav. You land on `/hall` or `/admin` depending on
     where the admin shell was reached from.

## Validation matrix

| Check | Viewport | Method |
| --- | --- | --- |
| Toolbar sticky | 360×640, 1280×800 | Scroll the page; the toolbar stays at the top. |
| No horizontal scroll | 360×640 | Visual inspection in Chrome DevTools. |
| Back button is first focusable | 360×640, 1280×800 | Press Tab from a fresh page load; the focus ring lands on the back button. |
| Snackbar appears and auto-dismisses | 360×640, 1280×800 | Trigger any action; the snackbar appears for ~3 s. |
| Snackbar copy matches the spec | 1280×800 | "Switched to rotation mode.", "Now showing: <title>.", "Ads are now visible.", "Ads are now hidden." |
| Iframe list is visible | 1280×800 | Configure at least one iframe in `/admin/content`; the list appears. |
| Empty-iframe disabled state | 1280×800 | Deactivate all iframes; the Iframe radio is disabled. |
| Error on initial load | 1280×800 | Stop the backend; refresh the page; the toolbar, the page header, and the error block are visible; the mode/ads controls are not. |
| Saving disables controls | 1280×800 | Throttle the network to "Slow 3G" in DevTools; trigger an action; the controls are disabled while the save is in flight. |

## Automated checks

- `npm --prefix frontend run test` — all frontend tests pass.
- `npm --prefix frontend run build` — no errors or new warnings.

## What this feature does NOT change

- The backend endpoints and schemas.
- The `RemoteControlFacade` and the `RemoteControlApi`.
- The route paths.
- The sidenav entry added by spec 011.
- The hall page, the admin shell, the dashboard, or the display.
