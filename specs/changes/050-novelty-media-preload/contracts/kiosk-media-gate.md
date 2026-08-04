# Contract Delta: Kiosk Media Gate (CHG-050)

Merge into `specs/contracts/content-rotation/contract.md` and `specs/contracts/display-runtime/contract.md` (kiosk viewer section) before implementation.

## Display gate behavior

Applies to **all** top `show_content` in loop mode (novelty and regular).

1. On `show_content`, kiosk stores payload as **pending** (replaces any older pending — latest wins).
2. Kiosk keeps **committed** content visible until pending media reaches **ready**:
   - Image: blob cached + decode probe success.
   - Video: blob cached + `canplaythrough` on off-DOM video element.
3. On ready, commit pending → viewer (`DisplayViewerController.applyShowContent`).
4. If download fails or gate wait exceeds **30 s**, post `media_error` and keep committed content until next `show_content`.

## Multi-kiosk

- Gate is **per kiosk**; server rotation continues independently.
- Server advance on first `media_error` applies to all kiosks.

## Mode guards

Gate and novelty warm inactive when paused, fixed content, or iframe mode (FR-009).

## Removed behavior

- Rendering remote `mediaUrl` before blob ready (fallback that caused black frames).

## Owned frontend paths

- `frontend/src/app/display/display-content-gate.service.ts` (new)
- `frontend/src/app/display/display-media-cache.service.ts` (scheduler + ready probes)
- `frontend/src/app/display/display-screen.component.ts` (wire gate instead of direct apply)
