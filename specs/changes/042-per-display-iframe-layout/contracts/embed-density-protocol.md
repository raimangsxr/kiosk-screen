# Embed Density Protocol (CHG-042)

**Status**: draft — merge into `DISPLAY.RUNTIME` at implementation  
**Consumers**: kiosk-screen `/display`, amrn-bull, amrn-escalabirras-dual

## Purpose

Pass a **per-display** vertical density (`app_height_px` equivalent) from
kiosk-screen parent to embedded AMRN apps without mutating those apps' global
event configuration.

## Channels

### 1. Iframe URL query (load time)

kiosk-screen appends to the iframe `src` when family is known and
`effectivePx` is resolved:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `embed_app_height_px` | integer | yes* | Effective density 300–1200 |
| `embed_density_source` | string | no | `local_override`, `profile`, `org_default` |

\*Omitted when family is `unknown`.

**Example**:

```text
https://bull.example.com/?token=…&embed_app_height_px=480&embed_density_source=profile
```

Existing query params (e.g. `token`, `embed_token`) MUST be preserved.

### 2. postMessage (runtime updates)

Extends amrn-bull wire protocol. escalabirras uses the same message types for
interop.

#### Parent → embed: `bull:config`

```json
{
  "type": "bull:config",
  "appHeightPx": 480
}
```

Sent when:

- iframe `load` event fires (after URL already set)
- kiosk receives SSE `layout_updated`
- operator saves on-display hidden panel

Parent SHOULD send `bull:ping` after resize of top region so embed re-measures.

#### Embed → parent: `bull:resize` (unchanged)

Existing intrinsic size reporting; kiosk-screen continues to ignore height
resize for layout (iframe stays 100% top region) but MAY log for diagnostics.

## Embed client behavior (normative)

1. On bootstrap, read `embed_app_height_px` from `window.location.search`.
2. If present and valid, set **embed override** density; use for layout CSS vars.
3. When SSE/`event_config` updates arrive, **do not** replace embed override.
4. On `bull:config`, update embed override and recompute layout without reload.
5. Outside iframe (`window.parent === window`), ignore query param override;
   global admin slider behaves as today.

## Precedence (embed mode only)

```text
embed override (URL or bull:config)
  > global event_config.app_height_px (SSE)
  > bundled default 720
```

## Security

- Validate `appHeightPx` integer in range; ignore malformed messages.
- Parent validates `event.source === iframe.contentWindow` before handling
  `bull:resize`.
- Do not expose operator tokens in `embed_density_source`.

## Versioning

Protocol version `1`. Future params MUST be backward-compatible optional fields.
