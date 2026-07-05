# ADR-0007: Top content uses contain with blurred backdrop fill

## Status

Accepted (upon consolidation of `CHG-028`)

## Context

The display runtime (CHG-019, FR-009) scoped `object-fit: cover` to top-region photo and video so media filled the configured region. That choice crops content whenever the media aspect ratio differs from the effective region ratio, which varies with `topRegionRatio`, `bottomRegionRatio`, and viewport size.

Operators upload mixed-format photos and videos (16:9, 4:3, 9:16, square). Cropping hides parts of the primary content. The sponsor band already uses `object-fit: contain` without cropping; top content should preserve the full frame without distortion.

## Decision

1. **Top-region photos and videos render with `object-fit: contain`** on the foreground layer so the full frame is visible and proportions are preserved.
2. **A decorative backdrop layer** behind the foreground shows the same media with `object-fit: cover`, blur, and slight scale so letterbox/pillarbox bands are filled with a diffused version of the content (blur-fill pattern).
3. **Pinned iframes are unchanged in v1**: they continue to fill the top region edge-to-edge; `object-fit` does not apply to iframes.
4. **`prefers-reduced-motion: reduce`** degrades the backdrop to a solid `#102832` fill instead of blur, consistent with FR-008 of CHG-019.

This supersedes FR-009 of CHG-019 (`object-fit: cover` for top-region media).

## Consequences

- Mixed-aspect content is no longer cropped in the top region.
- Photo and video playback may use two decoders for the backdrop + foreground video pair; kiosk hardware should be validated at 4K.
- FR-009 in CHG-019 is historical; the active contract and this ADR own current fit behavior.
- No API or configuration changes; presentation-only frontend update.
