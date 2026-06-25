# ADR-0005: Branding overlay layout — full-width flex with `space-between`

## Status

Accepted (will be upon consolidation of `CHG-019`)

## Context

The kiosk renders a branding overlay anchored at the top of the viewport when event name, organizer name, or organizer logo is configured (CHG-008 / `EVENT.BRANDING`). The overlay is owned by the display component and rendered inside `.top-region`.

The historical CSS positioned the two children of the overlay as independent absolutely-positioned elements: `.branding-overlay__logo` at `top: 10px; left: 10px` and `.branding-overlay__event-name` at `top: 10px; right: 10px`. The container itself was tagged with `id="branding-overlay"` only, not the `.branding-overlay` class, so the container's `display: inline-flex` rule never applied. The children happened to not collide because they were at opposite edges of the viewport, but they were not inside the same layout container.

CHG-019 US5 requires the children to render inside the same overlay container with no overlap across the supported landscape viewports (1280×720, 1920×1080, 2560×1440, 3840×2160). The user also confirmed the visual intent: the organizer logo stays at the left edge of the viewport and the event name stays at the right edge of the viewport, both inside the same flex container.

## Decision

The branding overlay container is a full-width flex container with `justify-content: space-between`:

```css
.branding-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}
```

The children lose their independent absolute positioning and become flex children:

```css
.branding-overlay__logo {
  height: clamp(36px, 6vh, 80px);
  max-width: min(40vw, 360px);
  object-fit: contain;
  flex-shrink: 0;
}

.branding-overlay__event-name {
  padding: 8px 14px;
  border-radius: 6px;
  background: rgb(0 0 0 / 68%);
  color: #fff;
  font: 700 clamp(16px, 1.6vw, 28px)/1.2 system-ui, sans-serif;
  display: inline-flex;
  align-items: center;
  max-height: clamp(36px, 6vh, 80px);
}
```

The container's `class="branding-overlay"` is added to the existing `<div id="branding-overlay">` element so the rule set applies. The template change is additive — no new elements are introduced.

## Consequences

- **Visual layout is preserved.** With `justify-content: space-between`, the logo is pushed to the left edge of the container (which spans `top: 10px; left: 10px; right: 10px`) and the event name is pushed to the right edge. The two children appear at the same vertical positions they had under the historical absolute layout.
- **Single source of truth for layout.** Both children are now flex children of the same container, so any future overlay layout change happens in one place (the container rule) instead of two (the two child rules).
- **Predictable at narrow widths.** The `space-between` rule degrades gracefully: at narrow viewports the children collapse toward the centre; the `gap: 10px` ensures they never touch. The fluid typography (`clamp(16px, 1.6vw, 28px)`) keeps the event name readable.
- **The dark pill background on the event name is preserved.** The visual signature of the event-name pill is a UX feature; the layout change does not strip it.
- **One contract change.** `EVENT.BRANDING` references this ADR and adds a bullet to `## Current behavior` describing the layout.
