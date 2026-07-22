# Sibling App Contract Deltas: CHG-042

**Date**: 2026-07-17  
**Repos**: `amrn-bull`, `amrn-escalabirras-dual`  
**Gate**: Required before CHG-042 marked complete (TQ-004)

## Shared behavior (both repos)

### Embed override service

New or extend `EventConfigService` / `AppService`:

1. Parse `embed_app_height_px` from `window.location.search` on bootstrap.
2. Listen for `window.message` with `type === 'bull:config'`.
3. Maintain `embedOverrideHeightPx: number | null`.
4. Effective height for layout:

   ```text
   embedOverrideHeightPx ?? event_config.app_height_px ?? 720
   ```

5. When `embedOverrideHeightPx` is set, SSE `event_config` updates MUST NOT
   clear it.
6. Outside iframe, `embedOverrideHeightPx` stays null.

### Contract files to update

| Repo | Contract path |
|------|----------------|
| amrn-bull | `specs/contracts/app-core/contract.md` — add embed override precedence |
| amrn-escalabirras-dual | `specs/contracts/frontend-angular/contract.md` — same |

### Tests (each repo)

- Bootstrap with `?embed_app_height_px=500` → layout uses 500 before SSE.
- SSE delivers `app_height_px: 800` → layout stays 500 in iframe.
- `postMessage({ type: 'bull:config', appHeightPx: 420 })` → layout updates.
- Top-level window (no iframe) → SSE still updates height.

---

## amrn-bull specific

- `IframeService` unchanged for `bull:resize` outbound.
- `TournamentComponent.getAppHeightPx()` reads effective height from service.
- Document in app-core contract under "Iframe postMessage protocol" → add
  `bull:config` incoming.

---

## amrn-escalabirras-dual specific

- `MainViewComponent` / `AppService.getAppHeightPx()` same precedence.
- `LayoutService` buckets still driven by physical iframe size; density dial
  driven by effective height.
- Add `bull:config` handler (shared protocol name for parent interop).

---

## Release coordination

1. Deploy sibling apps with embed override support.
2. Deploy kiosk-screen with URL injection + postMessage.
3. Run [quickstart.md](../quickstart.md) E2E before tagging release.

---

## Out of scope (sibling repos)

- Per-display storage in sibling backends (kiosk-screen owns persistence).
- Changes to global `/admin` slider persistence semantics beyond embed precedence.
