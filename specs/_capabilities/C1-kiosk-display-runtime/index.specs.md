# Index: C1-kiosk-display-runtime

Specs that touch the kiosk display runtime.

## Active

- `specs/020-display-control-rotation-tests/` — closes the
  deferred test work from 018 (rotation bug fixes, pause / resume,
  recurring content, fixed content, extension autodetect).

## Archived

- `specs/_archive/C1-kiosk-display-runtime/002-kiosk-screen/` —
  foundational: 4fr/1fr layout, rotation timing, operator session.
- `specs/_archive/C1-kiosk-display-runtime/006-remote-control-display/` —
  remote control: `contentMode ∈ {loop, iframe}`, polling interval,
  `selectedIframeId`.
- `specs/_archive/C1-kiosk-display-runtime/016-preconfigured-iframes-and-video-end/`
  — `embedded_web` content type removed; iframes become a separate
  entity; `videoEndDelaySeconds`; fullscreen on remote control.

## Capabilities touched

- Primary: C1 (kiosk display runtime).
- Cross-capability: C2 (content & ads via `top_content_items`),
  C4 (display configuration knobs), C5 (remote control surface),
  C7 (branding overlay).