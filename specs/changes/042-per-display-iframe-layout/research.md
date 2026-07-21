# Research: Per-Display Iframe Layout Profiles (CHG-042)

**Date**: 2026-07-17

## R1 — Embed density transport: URL vs postMessage vs CSS scale

**Decision**: Dual channel — `embed_app_height_px` query parameter on iframe `src`
at load time, plus `bull:config` postMessage for live updates without reload.

**Rationale**: First paint must have correct density before embedded app SSE
connects. postMessage reuses amrn-bull's existing parent↔iframe protocol
(`bull:ping` / `bull:resize`). CSS `transform: scale()` rejected — does not
update escalabirras layout buckets and blurs text.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| postMessage only | Race on first paint; iframe may flash wrong density |
| URL only | Every on-site tweak requires iframe reload |
| CSS scale on parent | Wrong layout buckets; illegible on venue screens |

---

## R2 — Persistence: backend vs browser-only

**Decision**: PostgreSQL authoritative (`display_devices` + overrides); kiosk
`localStorage` cache key `kiosk_layout_cache:v1:{label}` for fast boot.

**Rationale**: Clarification session — admin visibility (FR-009), profile
assignment survives browser cache clears when online, aligns with SSE
orchestration model.

**Alternatives considered**:

- localStorage only — no admin visibility; lost on cache clear.
- Embedded app localStorage — wrong security boundary; global app still owns event config.

---

## R3 — Kiosk identity: label vs clientInstanceId vs kioskId

**Decision**: Stable **display label** (operator-chosen, unique per org) stored
in `display_devices`. Ephemeral `kioskId` / `clientInstanceId` link sessions to
the device row on register. `KioskRegisterRequest.label` and
`kiosk_connections.label` already exist — extend to upsert `display_devices`.

**Rationale**: Clarification session Option D. `clientInstanceId` is
sessionStorage UUID (cloneable across machines). `kioskId` rotates each SSE
connection.

**Alternatives considered**:

- clientInstanceId as primary key — duplicates across cloned browser profiles.
- kioskId only — no stable assignment when display disconnects.

---

## R4 — Embedded app family resolution

**Decision**: Host suffix map in backend config (`EMBED_APP_FAMILY_HOSTS`) with
optional `iframes.embed_app_family` admin override per record.

**Rationale**: Clarification Option C. Known production hosts for bull and
escalabirras; staging/custom URLs need manual override.

**Alternatives considered**:

- Manual only — tedious for standard deployments.
- URL path heuristics — fragile across apps.

---

## R5 — Effective density precedence

**Decision**:

```text
effective = clamp(
  display_device.local_override[family]
  ?? layout_profile.densities[family]
  ?? organization.embed_density_defaults[family]
  ?? 720
)
```

Per-display override wins over embedded app's global `app_height_px` when kiosk
passes `embed_app_height_px` (FR-008). Sibling apps treat query/postMessage as
**embed override** that is not overwritten by their SSE `event_config` updates.

**Rationale**: Clarification + live-event safety — operator calibrates once;
bull `/admin` slider does not disturb hall screens.

---

## R6 — On-display tuning UX

**Decision**: Hidden panel — long-press 3 s on top-left 48×48 px hit target OR
`Ctrl+Shift+D` when `/display` focused. Panel shows slider + save + reset.

**Rationale**: Clarification Option B — public kiosk must not expose controls.

---

## R7 — SSE integration for layout changes

**Decision**: New SSE event `layout_updated` with payload
`{ displayLabel, effectiveDensities, source }` sent to the affected kiosk only;
admin mutations that change org defaults or profiles fan-out to all registered
kiosks for that org (parity with `config_updated` latency).

**Rationale**: Avoid full iframe reload when operator adjusts from admin;
kiosk applies new density via postMessage.

**Alternatives considered**:

- Poll layout endpoint — contradicts CHG-041 happy path.
- Reload iframe on every change — visible flash during live event.

---

## R8 — Joint delivery with sibling repos

**Decision**: CHG-042 acceptance gate includes amrn-bull and amrn-escalabirras-dual
changes documented in `contracts/sibling-app-deltas.md`. kiosk-screen can merge
first but feature flag / release tag is shared.

**Rationale**: Clarification Option A — passing URL params without embed client
support delivers zero user value.

---

## R9 — Density bounds

**Decision**: Reuse embedded app ranges union: **300–1200 px** (escalabirras min,
bull max). Resolver clamps; API returns 400 on out-of-range writes.

**Rationale**: Single validation surface in kiosk-screen; siblings already clamp
internally.

---

## R10 — Unsupported embed hosts

**Decision**: If family is `unknown` and no iframe override → omit
`embed_app_height_px` from URL; hide density admin controls for that iframe;
show iframe normally.

**Rationale**: Spec edge case — graceful degradation.
