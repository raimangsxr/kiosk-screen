# ADR-0010: Per-display iframe embed density

**Status**: Superseded by ADR-0012 (CHG-044)  
**Date**: 2026-07-17  
**Change**: CHG-042

## Context

Kiosk-screen embeds dense AMRN tournament apps in the top-content region. Those
apps use a global `app_height_px` setting. Multiple hall displays with different
aspect ratios need independent density. Clarifications established backend-
authoritative storage with kiosk cache, stable display labels, and joint delivery
with sibling embed clients.

## Decision

1. **kiosk-screen** owns per-display density persistence (`display_devices`,
   `display_layout_profiles`, org defaults).
2. Pass density to embeds via **URL query** (`embed_app_height_px`) and
   **`bull:config` postMessage** (see `specs/changes/042-per-display-iframe-layout/contracts/embed-density-protocol.md`).
3. **Sibling embed apps** honor an embed override that takes precedence over
   global SSE `event_config` while inside an iframe.
4. **Do not** use CSS scale on the iframe element.
5. **Do not** store per-display density in sibling app backends.

## Consequences

### Positive

- Operators calibrate each screen once; survives reload and iframe mode changes.
- Admin can manage named profiles and see effective density per kiosk.
- Aligns with CHG-041 server-orchestrated displays without new global state in AMRN.

### Negative

- Cross-repo release coordination required (TQ-004).
- Additional PostgreSQL tables and admin UI surface.
- Protocol coupling to `bull:*` message namespace (acceptable — bull documented first).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| localStorage-only in embed | No admin visibility; clarifications chose backend authority |
| Global AMRN profile API | Wrong bounded context; kiosk-screen owns display topology |
| CSS transform scale | Does not fix layout buckets; poor legibility |

## References

- `specs/changes/042-per-display-iframe-layout/spec.md`
- `../amrn-bull/specs/contracts/app-core/contract.md` (iframe protocol)
- ADR-0009 (SSE orchestration)
