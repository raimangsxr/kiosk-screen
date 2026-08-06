# Data Model: Device QR Login (CHG-052)

**Date**: 2026-08-06

## PostgreSQL

**No schema migration** for pairing state. User sessions continue in `user_auth_sessions` (ADR-0008).

Optional audit (deferred): `display_events` entry `device_activation_completed` — not required for MVP.

## Redis: DeviceActivationRequest

| Field | Type | Rule |
|-------|------|------|
| `deviceCode` | UUID string | Opaque; only kiosk polls with this |
| `userCode` | string(6) | Uppercase A–Z; shown on screen + mobile |
| `status` | enum | `pending` → `authorized` → `consumed` \| `expired` |
| `createdAt` | ISO datetime | Set at start |
| `expiresAt` | ISO datetime | `createdAt + 15 min` |
| `authorizedByUserId` | UUID \| null | Set on mobile authorize |
| `organizationId` | UUID | From authorizing user |
| `rememberMe` | boolean | From mobile login during activation |
| `pollIntervalSeconds` | int | Default 2; returned to kiosk |

### Keys

```text
device_activation:user:{USERCODE}     → JSON blob, EX 900
device_activation:device:{deviceCode} → JSON blob, EX 900
```

Secondary index: `userCode` lookup via first key only.

### State transitions

```text
[start]     → pending (both keys created)
[authorize] → authorized (atomic; only if pending && not expired)
[poll ok]   → consumed (keys deleted after session issued)
[TTL]       → expired (Redis EX; kiosk start refresh issues new pair)
[2nd auth]  → rejected (status != pending)
```

**Client-only** (no Redis write): `abandoned` when operator leaves `/login` or switches to credentials tab; poll stops; server record expires by TTL.

### Uniqueness

- `userCode` must be unique among **pending** keys (check `SET NX` or GET before SET).
- `deviceCode` globally unique (UUID).

## API payloads (logical)

### `POST /api/auth/device-activation/start` (anonymous)

**Response**:

```json
{
  "userCode": "ABCDEF",
  "deviceCode": "<uuid>",
  "expiresAt": "2026-08-06T12:15:00Z",
  "pollIntervalSeconds": 2,
  "activateUrl": "/activate?code=ABCDEF"
}
```

### `POST /api/auth/device-activation/authorize` (authenticated)

**Request**: `{ "userCode": "ABCDEF" }`  
**Response**: `{ "status": "authorized" }` or error envelope

### `POST /api/auth/device-activation/poll` (anonymous, kiosk)

**Request**: `{ "deviceCode": "<uuid>" }`  
**Response**:

| status | HTTP | Body |
|--------|------|------|
| pending | 200 | `{ "status": "pending" }` |
| authorized | 200 | `{ "status": "authorized", "user": UserSchema }` + Set-Cookie |
| expired | 410 | error `activation_expired` |
| invalid | 404 | error `activation_not_found` |

On `authorized`, server calls `issue_user_session` for `authorizedByUserId`, marks `consumed`, deletes Redis keys.

## Frontend state: DeviceActivationUiState

| Field | Type | Rule |
|-------|------|------|
| `userCode` | signal string | From start |
| `deviceCode` | signal string | Held in memory only; never displayed |
| `qrDataUrl` | signal string | Regenerated when userCode changes |
| `expiresAt` | signal Date | Countdown UI optional |
| `polling` | signal boolean | true while pending |
| `abandoned` | signal boolean | true when user leaves activation tab or `/login` |
| `error` | signal string \| null | Expired / network |

### LoginComponent modes

| Mode | Default | Content |
|------|---------|---------|
| `activation` | **yes** | QR + userCode + waiting hint |
| `credentials` | no | Existing email/password form |

Toggle switches modes; starting poll only in `activation` mode when unauthenticated. Switching to credentials or leaving `/login` sets `abandoned` and stops poll (no server cancel API).

## ActivateComponent (mobile)

| Step | State |
|------|-------|
| 1 | Parse `?code=` query; show code field pre-filled |
| 2 | If `!isAuthenticated` → inline login (rememberMe supported) |
| 3 | Confirm → `authorize(userCode)` |
| 4 | Success view «Pantalla activada» (no auto-redirect) |

## Validation rules

| Rule | Enforcement |
|------|-------------|
| userCode format | `^[A-Z]{6}$` server + client |
| Trim/normalize input | Uppercase strip spaces/dashes |
| Authorize once | Redis CAS / transaction |
| can_open_display | Server on authorize |
| Single-use | Delete keys after successful poll |
