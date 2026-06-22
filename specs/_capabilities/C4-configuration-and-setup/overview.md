# Capability: C4-configuration-and-setup

Kiosk display configuration (`kiosk_display_configurations`),
event configuration (`event_configurations`), and the
setup-check / readiness rules that gate the kiosk opening.

## What this capability is

Owns the configuration knobs that affect kiosk runtime behavior
(timing, animation, inline ad count, video end delay, polling
interval) and the preflight rules that block the kiosk from opening
with bad setup. The event configuration module (event name, organizer
name, event duration, organizer logo) lives here too.

## Owning code

- `backend/app/repositories/models/kiosk_configuration.py`,
  `event_configuration.py`
- `backend/app/services/event_configuration_service.py`,
  `readiness_service.py`
- `backend/app/api/event_configuration.py`, `readiness.py`
- `frontend/src/app/features/display-config/`, `event-config/`,
  `readiness/`

## Living specs

- Active: none right now.
- Archived: `specs/_archive/C1-kiosk-display-runtime/002-…`,
  `…/003-…`, `…/006-…`, `…/016-…`
- 010 (relabel + wire empty rules) is archived under C3 bundle.
- 017 (event branding) is the canonical event-configuration spec,
  active until 018 closes.

## Stable contracts

- `GET /api/kiosk-configuration`, `PUT /api/kiosk-configuration` —
  display timing, animation, ad count, polling interval, video end
  delay, `enabled`.
- `GET /api/event-configuration`, `PUT /api/event-configuration`
  (multipart) — event name, organizer name, event duration, logo
  (017).
- `GET /api/readiness` — preflight report with `ready`, `blockers`,
  `warnings`.

## Cross-capability surfaces

- `kiosk_display_configurations.video_end_delay_seconds` is read by
  the kiosk runtime (C1) on each poll.
- `event_configurations.event_duration_minutes` is read by
  `display_service.open_display` for `OperatorSession.valid_until`.

## Recent amendments

- 017 — moved `eventDurationMinutes` from
  `kiosk_display_configurations` to `event_configurations`. Migration
  `0011_event_branding.py` is idempotent.
- 016 — added `videoEndDelaySeconds` to
  `kiosk_display_configurations` (range 0-30, default 2).
- 010 — relabeled "Readiness" to "Setup check" in user-visible copy
  and wired the two empty rules
  (`unapproved_embedded_domains` — removed in 016; `invalid_sources`).

## See also

- `sdd-optimization/05-capability-map-from-code.md`