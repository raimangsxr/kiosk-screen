# Research: Event Branding Layout

**Date**: 2026-06-28
**Spec**: [spec.md](./spec.md)

## Decision: Viewport-relative units (vh / vw / %)

- **Decision**: All numeric layout fields are interpreted as
  viewport-relative units in CSS (`vh` for vertical, `vw` for
  horizontal). The Pydantic validators enforce ranges in those
  same units (size 1..50, x 0..100, y 0..100, transparency
  0..100 percent, borderRadius 0..50).
- **Rationale**: The kiosko browser runs at 1280×720 to
  3840×2160. Viewport-relative units scale identically to the
  existing fluid CSS that CHG-019 is introducing; pixels would
  require a per-resolution table. The percentage for
  transparency is universally understood.
- **Alternatives considered**:
  - Pixels: simple but requires per-resolution tweaking when the
    operator upgrades the display.
  - `em` / `rem`: tied to font size, not viewport; the size of
    the logo is not coupled to the kiosk's typography scale.
  - Container queries: overkill for a kiosk with known
    landscape aspect ratios; CHG-019 explicitly deferred them.

## Decision: Top-left of overlay container as anchor

- **Decision**: Both elements are positioned with `top: calc(--*y
  * 1vh)` and `left: calc(--*x * 1vw)`. The overlay container
  itself remains `position: absolute; top: 10px; left: 10px;
  right: 10px` so the elements are positioned relative to the
  overlay's content box, which is what the operator sees and
  measures.
- **Rationale**: A single anchor is easier to explain, easier to
  validate, and matches the natural "where on the overlay is the
  logo" mental model. The overlay's own 10 px margins keep the
  elements clear of the viewport edge in the default state.
- **Alternatives considered**:
  - Anchor from bottom-right for the event name (asymmetric):
    produces an "X from the closest edge" feel that would
    confuse operators who set X=0 expecting "at the left".
  - Anchor from the viewport instead of the overlay: would let
    the overlay grow downward with more elements, which is not
    a current feature.
  - Drag-and-drop position picker: out of scope; the admin
    form uses numeric inputs and previews in the live kiosko.

## Decision: Two JSON columns (`logo_layout`, `event_name_layout`)

- **Decision**: Add two nullable JSON columns to
  `event_configurations`. Each stores a `BrandingLayout` object
  or `NULL`.
- **Rationale**: Per-element columns keep the Pydantic model, the
  form validation, and the audit metadata symmetric. NULL means
  "use visual defaults", which lets existing rows keep their
  current look without a backfill.
- **Alternatives considered**:
  - One column with `{ logo: ..., eventName: ... }`: couples the
    two elements' validation and audit metadata; CHECK
    constraints cannot be applied per-element.
  - Ten flat columns (`logo_size`, `logo_x`, ...): inflates the
    table; makes adding a sixth property (e.g., rotation) a
    schema migration instead of a Pydantic change.
  - Single JSON blob in `kiosk_display_configurations`:
    branding already lives on `event_configurations`; mixing
    would split the source of truth.

## Decision: Defaults replicate the current visual look

- **Decision**: When a layout is NULL, the kiosko CSS applies
  these values via `var(--*, default)`:
  - Logo: size=6 vh, x=0, y=0, transparency=100, borderRadius=0
  - Event name: size=1.6 vw, x=80, y=0, transparency=100,
    borderRadius=6
  - The event-name element keeps `text-align: right` and a
    `max-width: 20vw` so its content right-aligns within its
    element and does not overflow the viewport.
- **Rationale**: Existing operators see no change at deployment
  time. The default value for `eventNameX=80` keeps the event
  name visually anchored to the right, matching today's flex
  `justify-content: space-between` rendering.
- **Alternatives considered**:
  - Backfill rows with explicit defaults at migration time:
    produces a visible audit-trail entry for every existing
    organization on deploy; rejected to avoid churn.
  - Switch to a different default X for event name (e.g., 75):
    requires re-tuning the `max-width` and `text-align` to
    keep the same visual offset; 80 vw with a 20 vw max-width
    produces a clean 80..100 vw band.

## Decision: Reject out-of-range values with HTTP 400

- **Decision**: The Pydantic `BrandingLayout` model declares
  explicit `Field(ge=..., le=...)` constraints on every numeric
  field. A request that violates a constraint returns HTTP 422
  with Pydantic's standard error envelope (field path + message).
  The service-level `_clean_layout` helper converts those into
  HTTP 400 with a field-keyed message for the operator-friendly
  admin form path.
- **Rationale**: Silent clamping produces surprising visual
  results; explicit errors let the operator correct the input
  before saving. Pydantic's 422 envelope is what the FastAPI
  default error handler emits and is already what the admin
  form's error adapter handles.
- **Alternatives considered**:
  - HTTP 400 from the route only: misses nested field paths
    (e.g., `logoLayout.size`); Pydantic's 422 is correct.
  - Clamp silently: rejected for the reason above.
  - Allow any value and let the kiosko decide: lets the
    operator set values that visually break the overlay; rejected.

## Decision: Kiosko reflects changes via the existing polling cycle

- **Decision**: The kiosko's existing `eventBranding.refresh()`
  call (run on each `remoteControlPollingSeconds` cycle and on
  every `pollNow()` trigger) is the only propagation path. No
  new polling endpoint, no websocket.
- **Rationale**: The kiosko already polls `/api/event-branding`
  in lockstep with the main `displayState` poll. Adding a
  faster poll or a push channel would be a separate change with
  its own operational footprint.
- **Alternatives considered**:
  - Separate, faster poll for branding (e.g., 1 s): would
    roughly triple the kiosko's HTTP traffic; rejected for
    operational simplicity.
  - WebSocket / Server-Sent Events: requires backend and
    infrastructure changes; rejected as out of scope.
  - Cross-tab `BroadcastChannel` from admin tab to kiosko tab:
    would only work when both tabs share the same browser; the
    kiosko often runs on a separate machine.

## Out-of-scope research

- Drag-and-drop position picker: out of scope; numeric inputs
  and live kiosko preview are sufficient.
- Multiple logo positions per element (e.g., a "left/right"
  toggle): out of scope; X/Y cover the same ground with more
  flexibility.
- Animations on layout change: the existing rotate / fade
  animations are scoped to content rotation; adding layout
  transitions is a follow-up.
- Per-event branding themes: out of scope; the existing
  per-organization `event_configurations` row is the unit of
  branding.

## Assumptions

- The kiosko browser is Chromium 108+, which supports `calc()`,
  CSS custom properties, `var()` fallbacks, and `text-align:
  right` on flex children — all required for the default-look
  preservation.
- The polled `EventBranding` snapshot already drives the
  overlay via Angular's signal-based change detection; binding
  additional fields does not require a new lifecycle hook.
- The existing `EVENT.BRANDING` contract's `dirty-form guard`
  and `unauthorized` semantics continue to apply to the new
  controls; no new guard is needed.
