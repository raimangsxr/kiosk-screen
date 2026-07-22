# Research: CHG-043 Live Density Profile Calibration

**Date**: 2026-07-21

## R1 — How to preview on a live kiosk without writing local overrides

**Decision**: Admin autosave updates the profile row, then calls a **targeted preview fanout**
that sends SSE `layout_updated` to exactly one `kioskId` with densities from the profile
and `source: profile_preview` per family.

**Rationale**:

- CHG-042 already applies density on kiosk via `layout_updated` → `DisplayLayoutService.applyLayoutUpdated` → iframe URL + `bull:config` (no page reload required).
- `local_overrides` on `display_devices` is the persistence path for on-display tuning (US3). Preview must not touch it (FR-008).
- Ephemeral server-side preview state per session adds complexity with no benefit over SSE push while the kiosk tab is open.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Write temporary row in `local_overrides` | Conflates preview with US3; reset semantics unclear |
| Embed iframe in admin page | Spec clarification: preview on physical kiosk only |
| Poll `GET /layout/me` on kiosk | Slower than SSE; extra load during slider drag |

---

## R2 — Fanout scope on profile autosave vs apply

**Decision**: Two distinct fanout paths:

1. **Autosave** (`PUT /profiles/{id}?previewKioskId=…`) — persist `densities`, then SSE
   `layout_updated` to the **preview kiosk only** with `source: profile_preview`.
   Do **not** fan out to assigned devices or org-wide (FR-012).
2. **Apply to assigned** (`POST /profiles/{id}/apply-assigned`) — SSE `layout_updated`
   with `source: profile` to all devices where `layout_profile_id == profile.id` (FR-013).
3. **Assign confirm** (`PATCH .../devices/{id}` with `layoutProfileId`) — existing
   CHG-042 path calls `_publish_layout_to_device` for the **target device only** (FR-014).

Do **not** fan out to every registered kiosk in the org (narrow CHG-042 `_publish_layout_fanout` on profile PUT).

**Rationale**: Spec clarification — operators calibrating on a test kiosk must not disrupt
other assigned displays until they explicitly apply or confirm assignment.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Assigned fanout on every autosave | Violates FR-012; disrupts live event displays |
| `POST /profiles/{id}/preview` separate from PUT | Redundant; preview is triggered by PUT + `previewKioskId` |

---

## R3 — Debounce and autosave UX

**Decision**: Frontend uses **500 ms** `debounceTime` on slider `valueChanges`, then `switchMap` to `PUT /api/admin/display-layout/profiles/{id}?previewKioskId={kioskId}`. UI shows `idle | guardando | guardado | error`.

**Rationale**: Spec clarification (~500 ms). `switchMap` cancels in-flight saves when slider moves again (FR-006 coalescing).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Separate preview API without persist | Autosave spec requires profile persisted on rest; preview piggybacks on PUT |
| 300 ms | User chose 500 ms |
| Save on blur only | Poor UX for continuous slider tuning |

---

## R4 — Iframe mode gate

**Decision**: Before enabling sliders, if the test kiosk is not in iframe mode, show a
**confirmation dialog** (Spanish). On accept, call remote control `setIframeMode` with the
selected iframe URL for the test kiosk session. On cancel, block calibration until iframe
mode is active (FR-015). Button label in dialog: **Activar iframe en pantalla de prueba**.

**Rationale**: FR-004 requires top-content region layout; iframe mode is the only path that
shows embedded app in that region. Confirmation prevents hijacking a live display without
operator consent.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Open `/display` in new window from admin | Breaks single test-kiosk selection; duplicate sessions |
| Block silently | Poor operator UX per edge case spec |

---

## R5 — Create-profile flow with mandatory test kiosk

**Decision**:

1. Operator enters profile name + selects test kiosk + iframe.
2. **POST** creates profile with default densities (720/720).
3. Calibration workspace opens immediately; sliders enabled after iframe mode confirmed.

**Rationale**: Autosave requires a profile `id`. Mandatory test kiosk (spec clarification) fits step 1.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Draft profiles without id | Autosave PUT needs stable id |
| Create only on first slider move | Race if operator adjusts before id exists |

---

## R6 — ADR

**Decision**: Add `docs/adr/0011-live-profile-calibration-preview.md` documenting preview vs override vs assigned profile fanout.

**Rationale**: Constitution V — durable rationale not only in plan.
