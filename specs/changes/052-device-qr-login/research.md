# Research: Device QR Login (CHG-052)

**Date**: 2026-08-06

## R1 — Patrón de autorización dispositivo

**Decision**: Implementar flujo inspirado en **OAuth 2.0 Device Authorization Grant** (RFC 8628): el quiosco obtiene `userCode` (6 letras) + `deviceCode` (opaco); el móvil autoriza con `userCode`; el quiosco hace **poll** con `deviceCode` hasta recibir sesión.

**Rationale**: El móvil no puede establecer cookies HttpOnly en el dominio del quiosco. El estándar resuelve transferencia de sesión emitiendo la cookie en la respuesta de poll del cliente dispositivo, tras autorización explícita del usuario autenticado en el secundario.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Transferir cookie de sesión del móvil al quiosco | Imposible cross-browser; inseguro si fuera posible |
| JWT en QR escaneable | Exposición de credencial en pantalla pública; TTL corto no basta |
| WebSocket/SSE solo para pairing | Más infraestructura que poll ligero para estado efímero |
| PostgreSQL para estado pending | Requiere migración + job de limpieza; Redis ya disponible con TTL nativo |

---

## R2 — Almacenamiento del estado de pairing

**Decision**: **Redis** con TTL **900 s** (15 min). Dos claves por solicitud:

- `device_activation:user:{USERCODE}` → metadatos + `deviceCode`
- `device_activation:device:{deviceCode}` → estado (`pending` \| `authorized` \| `consumed` \| `expired`), `userId`, `rememberMe`, timestamps

**Rationale**: Estado efímero, alta rotación, expiración automática. Alineado con uso existente de Redis en orquestación display. ADR-0008 mantiene sesiones de usuario en PostgreSQL; solo el *pairing* es efímero en Redis.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Tabla `device_activation_requests` | Overhead Alembic + cleanup cron para 15 min TTL |
| Solo in-memory por pod | Rompe multi-instancia; pairing fallaría tras balanceo |
| userCode como única clave de poll | Expone superficie de fuerza bruta en código corto visible |

---

## R3 — Notificación al quiosco (FR-013)

**Decision**: **Short polling** desde `LoginComponent` / `DeviceActivationService`: intervalo **2 s** (configurable en respuesta `start`), detenido al `authorized`, `expired` o destroy.

**Rationale**: Cumple ≤10 s sin SSE dedicado. El quiosco en `/login` no está suscrito al stream display. Poll es simple, testeable y suficiente para venue.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| SSE `/device-activation/stream` | Nuevo endpoint long-lived; overkill para 15 min max |
| Long poll 30 s | Peor UX en expiración; más complejo en FastAPI sync |
| Web Push | Fuera de alcance; requiere permisos y service worker |

---

## R4 — Generación y entropía del userCode

**Decision**: 6 letras **A–Z** con `secrets.choice`; reintentar si colisión en Redis (muy improbable). `deviceCode` = UUID4 opaco (36 chars) para poll.

**Rationale**: Spec + clarificación. Espacio 26⁶ ≈ 3.1×10⁸ con TTL 15 min y rate limit hace fuerza bruta impracticable. Separar `deviceCode` evita que observar la pantalla permita poll directo sin autorización móvil.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Base32 Crockford sin ambigüedad | Spec fija A–Z puro |
| 6 chars alfanuméricos | Fuera de spec usuario |
| userCode = deviceCode | Pantalla expone token de poll |

---

## R5 — Permisos de autorización (FR-011)

**Decision**: Reutilizar `can_open_display()` → roles `event_operator` y `administrator` (mismos que `DISPLAY_OPEN_ROLES`).

**Rationale**: Alineado con assumption spec y `open_display` existente. Usuario sin rol recibe 403 con mensaje claro; no se emite sesión al quiosco.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Cualquier usuario autenticado | Rompe modelo RBAC display |
| Solo administrator | Demasiado restrictivo para operadores en venue |

---

## R6 — Rate limiting activación (FR-016)

**Decision**: Nuevo `ActivationRateLimiter` en proceso (mismo patrón que `LoginRateLimiter`): **10 intentos fallidos / 15 min / IP** para `authorize` con código inválido o expirado. Poll `pending` no cuenta como fallo.

**Rationale**: Consistencia con ADR-0008 / CHG-031. Mensaje genérico en error para no filtrar códigos válidos.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Sin límite (solo TTL) | 26⁶ sigue siendo brute-forceable con botnet |
| Límite global por userCode | IP-based más simple para MVP multi-pod |

---

## R7 — Librería QR en frontend

**Decision**: Añadir dependencia **`qrcode`** (generación canvas/data URL en cliente) en el bundle del login.

**Rationale**: No existe QR en `package.json`. Generar en cliente evita endpoint de imagen y permite actualizar QR al rotar código sin round-trip extra.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| SVG desde backend | Endpoint extra; acopla rotación a servidor |
| `angularx-qrcode` wrapper | Capa adicional; `qrcode` core suficiente |
| Solo código sin QR | Viola FR-001 |

---

## R8 — Post-activación quiosco y supersede sesión

**Decision**: Tras poll `authorized`, backend emite cookie de sesión en respuesta poll (como `POST /auth/login`). Frontend hidrata `AuthService` y navega a `/display`. `DisplayScreenComponent` invoca `openDisplay()` existente → supersede sesiones vía hooks actuales.

**Rationale**: Clarificación Q2=A. Reutiliza camino probado; no duplica lógica supersede en device-activation.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| open_display desde backend en authorize | Móvil no debe abrir display; quiosco aún no registrado |
| Solo auth sin open_display | Display no operativo hasta acción manual |

---

## R9 — ADR durable

**Decision**: Crear **`docs/adr/0014-device-activation-flow.md`** al implementar (rationale Redis pairing + RFC 8628 + cookie en poll).

**Rationale**: Constitution V — decisión de seguridad/arquitectura no debe vivir solo en `plan.md`.
