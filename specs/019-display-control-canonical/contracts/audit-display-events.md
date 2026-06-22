# Contract: Audit Display Events

**Branch**: `019-display-control-canonical` | **Date**: 2026-06-22

This contract lists every `DisplayEventType` referenced in any Spec
Kit spec, with the payload shape and the producer spec. The events
are emitted by the backend (via `create_display_event`) and surface
in the admin event log.

## Event taxonomy

| `eventType` | `severity` | `entityType` | Producer spec | Notes |
|---|---|---|---|---|
| `display_control_changed` | `info` | `display_control` | 006 | Emitted on every successful `PUT /api/display/remote-control` and every navigation command. |
| `display_control_paused` | `info` | `display_control` | 018 | Emitted on `pause` navigation command. |
| `display_control_resumed` | `info` | `display_control` | 018 | Emitted on `resume` navigation command. |
| `display_control_fixed_changed` | `info` | `display_control` | 018 | Emitted on transition into `fixed` mode or when the target changes. |
| `content_rotation_empty` | `warning` | `display_control` | 018 | Emitted by the kiosk client via `POST /api/display/rotation-event` when the rotation queue is empty. |
| `content_type_autodetected` | `info` | `top_content_item` | 018 | Emitted when the upload's extension overrode the explicit `contentType`. |
| `event_configuration_changed` | `info` | `event_configuration` | 017 | Emitted on every successful `PUT /api/event-configuration`. |
| `remote_control_iframe_deleted` | `info` | `iframe` | 016 | Emitted when the iframe currently selected on the kiosk is deleted. |
| `content_changed` | `info` | `top_content_item` | 009 | Emitted on every successful public upload (with `source=public_api`). |
| `api_key_changed` | `info` (create/rotate) or `warning` (revoke/delete) | `api_key` | 009, 012 | Emitted on create/rotate/revoke/delete. |
| `configuration_changed` | `info` | `kiosk_display_configuration` | pre-006 | Historical; not amended by 006+. |

## Payload shape (canonical)

Every `DisplayEvent` row carries:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key. |
| `event_type` | TEXT | One of the values in the table above. |
| `severity` | TEXT | `info`, `warning`, or `error`. |
| `entity_type` | TEXT | E.g. `display_control`, `top_content_item`, `iframe`. |
| `entity_id` | TEXT | String column; references the affected row (no FK). |
| `payload` | JSONB | Event-specific. See below. |
| `created_at` | TIMESTAMPTZ | When the event was emitted. |
| `created_by_user_id` | UUID | Actor (null for kiosk-emitted events). |

### Per-event payloads

- `display_control_changed`: `{ contentMode, selectedIframeId?,
  selectedFixedContentId?, adsVisible, navigationCommandId? }`.
- `display_control_paused`: `{ contentMode: 'loop' }`.
- `display_control_resumed`: `{ contentMode: 'loop' }`.
- `display_control_fixed_changed`:
  `{ previousContentMode, previousFixedContentId?, newFixedContentId }`.
- `content_rotation_empty`: `{ reason: 'queue_empty' | 'recurring_only' }`.
- `content_type_autodetected`:
  `{ contentItemId, declaredContentType, detectedContentType, extension }`.
- `event_configuration_changed`:
  `{ eventConfigurationId, changedFields: string[],
  previousLogoMediaId?, newLogoMediaId? }` (no logo binary).
- `remote_control_iframe_deleted`:
  `{ iframeId, url, displaySessionId }`.
- `content_changed`: `{ contentItemId, source: 'public_api' }`.
- `api_key_changed`:
  `{ apiKeyId, action: 'create'|'rotate'|'revoke'|'delete', label }`.

## Source-of-truth pointer

The events are emitted by:

- `backend/app/services/display_control_service.py` (006 + 018).
- `backend/app/services/event_configuration_service.py` (017).
- `backend/app/services/api_key_service.py` (009 + 012).
- `backend/app/services/content_service.py` (009 + 018).
- `backend/app/api/display_rotation_events.py` (018; new endpoint for
  kiosk-emitted events).
- `backend/app/services/iframe_service.py` (016; on delete-while-active).

The Python `DisplayEventType` enum lives in
`backend/app/domain/display_events.py` and is the source of truth for
the `eventType` string values.

## What this contract does NOT cover

- Frontend-only logs (console, `mat-snack-bar`).
- Backend framework logs (uvicorn, gunicorn).
- Audit events outside the `display_events` table (none in this
  codebase).

## Cross-references

- 009 (novelty queue + api_key_changed) and 012 (api_key delete
  action) for the public API side.
- 016 (remote_control_iframe_deleted) for the preconfigured iframe
  delete cleanup.
- 017 (event_configuration_changed) for the event branding side.
- 018 (the five new events) for the rotation-modes side.