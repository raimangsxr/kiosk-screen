# Index: C4-configuration-and-setup

Specs that touch kiosk and event configuration.

## Active

- `specs/017-event-branding/` — event configuration module
  (`event_configurations` table, branding overlay, sponsor title).

## Archived

- `specs/_archive/C1-kiosk-display-runtime/002-kiosk-screen/` —
  foundational timing knobs.
- `specs/_archive/C2-content-and-ads/003-admin-media-uploads/` —
  rotation config endpoints.
- `specs/_archive/C1-kiosk-display-runtime/006-remote-control-display/`
  — polling interval config.
- `specs/_archive/C1-kiosk-display-runtime/016-preconfigured-iframes-and-video-end/`
  — `videoEndDelaySeconds` knob.
- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/010-…/` —
  relabel Readiness to Setup check; wire the empty rules.

## Capabilities touched

- Primary: C4 (configuration & setup).
- Cross-capability: C1 (knobs drive runtime), C3 (configuration
  forms are admin pages), C7 (event configuration is the entry point
  for branding).