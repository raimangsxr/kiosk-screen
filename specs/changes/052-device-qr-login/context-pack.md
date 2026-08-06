# Context Pack: CHG-052 Device QR Login

**Change**: `specs/changes/052-device-qr-login/`  
**Status**: draft (plan complete)  
**Branch**: `052-device-qr-login`

## Read first (in order)

1. `specs/changes/052-device-qr-login/plan.md`
2. `specs/changes/052-device-qr-login/research.md`
3. `specs/changes/052-device-qr-login/contracts/contract-deltas.md`
4. `specs/changes/052-device-qr-login/spec.md` (clarifications session 2026-08-06)
5. `specs/contracts/auth-rbac/contract.md`
6. `specs/contracts/display-config-session/contract.md`

## Contratos a actualizar antes de implementar

- `specs/contracts/auth-rbac/contract.md`
- `specs/contracts/display-config-session/contract.md`

## Archivos de código principales

| Área | Archivo | Rol |
|------|---------|-----|
| Backend API | `backend/app/api/auth.py` | Login existente; añadir rutas device-activation |
| Backend service | `backend/app/auth/device_activation_service.py` | Generación código, autorización, poll, TTL |
| Backend store | `backend/app/auth/device_activation_store.py` | Redis keys + atomic authorize |
| Backend roles | `backend/app/domain/roles.py` | `can_open_display` reutilizado en authorize |
| Frontend login | `frontend/src/app/auth/login.component.ts` | QR/código por defecto; credenciales secundarias |
| Frontend activate | `frontend/src/app/auth/activate.component.ts` | Ruta `/activate` móvil |
| Frontend service | `frontend/src/app/core/auth/device-activation.service.ts` | start + poll + hydrate |
| Frontend routes | `frontend/src/app/app.routes.ts` | `/activate` pública |
| Display bootstrap | `frontend/src/app/display/display-screen.component.ts` | Sin cambio de contrato; `openDisplay` tras redirect |

## Tests objetivo

| Suite | Archivo |
|-------|---------|
| Backend unit | `backend/tests/unit/test_device_activation.py` (nuevo) |
| Backend integration | `backend/tests/integration/test_device_activation_flow.py` (nuevo) |
| Frontend unit | `frontend/src/app/core/auth/device-activation.service.spec.ts` (nuevo) |
| Frontend component | `frontend/src/app/auth/login.component.spec.ts`, `activate.component.spec.ts` |

## No leer por defecto

- `specs/archive/**`
- `specs/changes/051-*` salvo patrón de plan/research
- Implementación de orquestador SSE salvo `open_display` / supersede hooks

## Decisiones bloqueadas (clarificación + research)

- Código identifica sesión de espera del quiosco; etiqueta display en `/display`.
- Activación exitosa → `/display` directo; suprime sesiones como `open_display`.
- Móvil: pantalla éxito sin redirect.
- Login quiosco: QR/código por defecto; credenciales en toggle secundario.
- TTL código: 15 min; rotación automática.
- Patrón técnico: OAuth 2.0 Device Authorization Grant (RFC 8628) adaptado.
- Estado pairing en Redis (TTL 900 s); sin migración PostgreSQL para pairing.
- Poll kiosk cada 2 s; sesión emitida al quiosco en poll `authorized`.
