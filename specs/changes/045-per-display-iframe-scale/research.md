# Research: CHG-045 Per-Display Iframe Scale

**Date**: 2026-07-22

## R1 — Display identity storage

**Decision**: Reintroduce a slim `display_devices` table (dropped in migration `0023`) without CHG-042 layout profiles or density JSON.

**Rationale**: Clarifications require stable display records that survive label renames, support manual pre-creation, and auto-registration on first kiosk connection. CHG-042 already validated this pattern; CHG-044 removed it only because embed density was cancelled, not because the identity model was wrong.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Key overrides by display label string | Renames would orphan or duplicate overrides (violates FR-005a) |
| Key overrides by `kiosk_id` | Ephemeral per SSE session; reload creates new kiosk id |
| Store overrides only in browser localStorage | Not authoritative; admin matrix cannot manage offline displays |

---

## R2 — Override storage shape

**Decision**: New `iframe_display_scale_overrides` table with `UNIQUE (display_device_id, iframe_id)` and `ON DELETE CASCADE` from both parents.

**Rationale**: Spec scopes overrides to one display record + one iframe (FR-001). Sparse storage: only rows where operator set an explicit override; absence means iframe default (FR-003).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| JSONB map on `display_devices` | Harder to query per-iframe admin matrix; weaker FK integrity on iframe delete |
| JSONB map on `iframes` | Same; also couples iframe row to all displays |

---

## R3 — Effective scale resolution at runtime

**Decision**: **Client-side resolution** on each kiosk using `displayDeviceId` + override map; `show_iframe` SSE payload keeps iframe default `scaleX`/`scaleY`.

**Rationale**: `DisplaySseHub.publish` fans out one envelope to all kiosks in the operator session — no per-kiosk targeting today. CHG-042 used the same pattern (density applied client-side). Each kiosk applies `override ?? payload.scale` locally.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Per-kiosk SSE publish with resolved scale | Requires hub API change + replay buffer per kiosk; higher risk during live events |
| Server augments `show_iframe` per connection at stream read time | Stream buffer is shared; would need per-subscriber envelope rewriting |

---

## R4 — Live refresh when override changes

**Decision**: New SSE event `iframe_scale_updated` with payload `{ displayDeviceId, iframeId, scaleX, scaleY, source }`. Kiosk applies only when `displayDeviceId` matches and `iframeId` is the active iframe.

**Rationale**: Satisfies FR-008 without re-broadcasting full `show_iframe` to all displays (which would be confusing for unrelated kiosks). Mirrors CHG-042 `layout_updated` pattern but simpler and iframe-scale-specific.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Re-emit `show_iframe` on override save | All kiosks receive event; only scale changes for one display — works but noisy; still needs client override map for initial render |
| Polling override endpoint | Violates CHG-041 SSE-first direction |

---

## R5 — Admin API surface

**Decision**:

- `GET/POST/PATCH /api/admin/display-devices` — list, manual create, rename label
- Extend `GET /iframes` and `GET /iframes/{id}` with `displayScales[]` summary (effective scale + source per known device)
- `PUT /iframes/{id}/display-scales` — batch upsert/clear overrides for the edit-form matrix
- Extend `POST /api/display/kiosk/register` response with `displayDeviceId`; upsert device by `(organization_id, label)`

**Rationale**: Matches clarified UX (iframe list + edit-form matrix). Batch PUT keeps matrix save atomic. Display-device admin endpoints support manual pre-creation (FR-007c).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Overrides only via separate `/display-devices/{id}/iframes` | Splits operator workflow away from iframe-centric admin |
| Embed overrides in `PUT /iframes/{id}` body | Large payloads; mixes default scale with N override rows |

---

## R6 — Matrix UX for displays without override

**Decision**: Edit matrix shows iframe default values pre-filled as placeholders; saving unchanged rows does **not** create override rows. Explicit "Restablecer" / clear per row removes override (FR-003).

**Rationale**: Deferred clarification item resolved at plan time. Avoids sparse-table pollution and makes "override vs default" semantically clear in admin.

---

## R7 — Display record deletion

**Decision**: `DELETE /api/admin/display-devices/{id}` allowed; cascades overrides. Block deletion when device is the only record for a label actively connected if needed — otherwise soft-warning only.

**Rationale**: Low-impact deferred item; cascade keeps data model clean. Operators rarely delete pre-provisioned screens.

---

## R8 — Register without label

**Decision**: Reject `POST /api/display/kiosk/register` when `label` is missing or empty (`422`). Display device upsert requires a non-empty label from the existing `/display` label-claim flow.

**Rationale**: Avoids orphan device records without operator-visible identity; aligns with FR-007c auto-create semantics.

---

## R9 — Concurrent override edits

**Decision**: Last-write-wins on `PUT /iframes/{id}/display-scales`; no optimistic locking. Emit `iframe_scale_updated` after save so connected kiosks converge.

**Rationale**: Matches spec edge case; low collision risk for scale tuning during events.

---

## R10 — ADR

**Decision**: Add `docs/adr/0013-per-display-iframe-scale.md` documenting client-side resolution + `iframe_scale_updated` SSE (constitution V: durable rationale in ADRs).

**Rationale**: Reverses part of ADR-0012 non-goal ("per-kiosk scale overrides") with explicit new decision record.
