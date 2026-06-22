# Data Model: Display Control Canonical

**Branch**: `019-display-control-canonical` | **Date**: 2026-06-22

This document is the canonical schema reference for `display_control_state`
and its four amendments (006, 016, 017, 018). No new tables or
columns are introduced; this is a documentation-only consolidation.

## `display_control_states` — canonical shape

| Column | Type | Null | Default | Source | Notes |
|---|---|---|---|---|---|
| `id` | UUID | NO | gen | 006 | Primary key. |
| `organization_id` | UUID | NO | — | 006 | Multi-tenant scope. |
| `display_session_id` | UUID | YES | NULL | 006 | Set when a kiosk session is open. |
| `content_mode` | TEXT | NO | `'loop'` | 006, 018 | CHECK `IN ('loop','iframe','fixed')`. |
| `selected_iframe_id` | UUID | YES | NULL | 016 | FK → `iframes.id` ON DELETE SET NULL. |
| `selected_fixed_content_id` | UUID | YES | NULL | 018 | FK → `top_content_items.id` ON DELETE SET NULL. |
| `ads_visible` | BOOLEAN | NO | `true` | 006 | Toggleable from remote control. |
| `last_navigation_command_id` | TEXT | YES | NULL | 006, 018 | Debounce key for `next`/`previous`/`pause`/`resume`. |
| `created_at` | TIMESTAMPTZ | NO | `now()` | 006 | |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | 006 | |
| `created_by_user_id` | UUID | YES | NULL | 006 | |
| `updated_by_user_id` | UUID | YES | NULL | 006 | |

### CHECK constraints

- `ck_display_control_content_mode`:
  `content_mode IN ('loop','iframe','fixed')` (widened by 018).
- `ck_display_control_fixed_has_target`:
  `selected_fixed_content_id IS NOT NULL OR content_mode != 'fixed'`
  (018).

## `RemoteControlNavigationCommand` — canonical enum

| Value | Source | Effect | Valid in |
|---|---|---|---|
| `next` | 006 | Advance to the next item in the rotation queue. | `loop` |
| `previous` | 006 | Go back one item in the rotation queue. | `loop` |
| `pause` | 018 | Cancel the local timer; freeze the current item. | `loop` |
| `resume` | 018 | Re-arm the local timer; continue from the current item. | `loop` |

`pause` / `resume` are 409 in `iframe` and `fixed` modes. `next` /
`previous` are 409 in `iframe` and `fixed` modes.

## `KioskRotationController` — client-side responsibilities

The Angular service at
`frontend/src/app/display/kiosk-rotation.controller.ts` owns:

- The rotation cursor (lost on kiosk page reload; 016).
- The single effect-based timer (one `setTimeout` per signal change;
  018 TD-001).
- The cadence counter for recurring content (paused outside `loop`;
  018 US4).
- The pause flag (local to `loop`; discarded on exit; 018 US3).
- The fixed-content selection rendering (loop-back on video `ended`;
  018 US5).

The controller is signal-driven; the component binds to the
controller's signals and renders accordingly.

## Cross-references

- `specs/019-display-control-canonical/spec.md` — canonical user
  stories, FRs, SCs.
- `specs/019-display-control-canonical/contracts/audit-display-events.md`
  — every audit event type, payload, producer spec.