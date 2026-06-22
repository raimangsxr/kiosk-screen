# Index: C2-content-and-ads

Specs that touch content and ad entities.

## Active

- None.

## Archived

- `specs/_archive/C2-content-and-ads/003-admin-media-uploads/` —
  foundational uploads, mime + size validation, media storage.
- `specs/_archive/C2-content-and-ads/009-public-content-api/` —
  public REST upload + novelty queue.

## Cross-archived

- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/013-…/` —
  drag-and-drop reorder.
- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/014-…/` —
  drop the Client concept.
- `specs/_archive/C1-kiosk-display-runtime/016-…/` — drop the
  `embedded_web` content type.
- `specs/_archive/C1-kiosk-display-runtime/018-content-rotation-modes/` —
  recurring / fixed content and autodetect (archived 2026-06-22;
  tests deferred to 020).
- `specs/020-display-control-rotation-tests/` — closes the
  deferred test work from 018.

## Capabilities touched

- Primary: C2 (content & ads).
- Cross-capability: C1 (display runtime reads content state),
  C3 (admin shell renders content lists), C6 (public API uses the
  content table).