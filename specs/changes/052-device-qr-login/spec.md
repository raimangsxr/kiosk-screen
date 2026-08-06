---
id: CHG-052
type: change
status: draft
modifies:
  - AUTH.RBAC
  - DISPLAY.CONFIG_SESSION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Activación de pantalla con código y QR

**Feature Branch**: `052-device-qr-login`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "quiero añadir una feature de login desde dispositivo externo tipo Netflix o Dazn. La idea es que en la vista de login salga un QR y un código de 6 letras mayúsculas aleatorias, que identifique la pantalla. Al escanear con un movil te lleva a /activate donde tendrás que poner el código de la pantalla que quieres logear y, si no estás logeado en la aplicación desde ese movil, tendrás que logearte. La intención es que tras el proceso correcto, la pantalla reciba la sesión y pueda ir a /display (en esta opción no pasamos por /hall)"

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-06

- Q: ¿El código de vinculación debe ligarse a una etiqueta de pantalla preasignada o basta con identificar la sesión de espera del quiosco? → A: El código identifica solo la sesión de espera del quiosco; la etiqueta de pantalla se asigna o confirma al entrar en `/display` (flujo actual de registro).
- Q: ¿La activación exitosa que abre display suprime las sesiones operativas activas previas de la organización? → A: Sí, mismo comportamiento que hoy al abrir display desde el hall (supresión de sesiones previas).
- Q: ¿Qué ve el operador en el móvil tras confirmar la activación con éxito? → A: Pantalla de éxito en `/activate` («Pantalla activada»); el operador puede cerrar el móvil sin más pasos.
- Q: ¿Cuál es la vista por defecto en `/login` del quiosco? → A: QR/código como vista principal; email/contraseña accesible mediante acción secundaria (pestaña, enlace o toggle).
- Q: ¿Cuánto tiempo debe permanecer válido un código de vinculación pendiente? → A: 15 minutos desde su generación, con rotación automática al expirar.
- Q: ¿Qué significa «cancelación explícita» en el quiosco en espera? → A: El operador cambia a la pestaña de credenciales o abandona `/login`; el cliente detiene el poll; el código en servidor expira por TTL sin endpoint de cancelación dedicado.

> **Nota de numeración**: Las user stories siguen el orden de **prioridad** (P1 antes que P2), no el orden numérico estricto del identificador.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operador activa una pantalla de quiosco desde el móvil (Priority: P1)

Un operador llega a un quiosco sin teclado cómodo (pantalla grande en el venue). En la vista de acceso del quiosco ve un código alfanumérico de 6 letras mayúsculas y un código QR. Escanea el QR con su móvil, confirma el código en la página de activación (o lo introduce manualmente si el enlace no lo precarga), inicia sesión en el móvil si aún no lo tiene, y autoriza la vinculación. La pantalla del quiosco recibe la sesión del operador y entra automáticamente en modo display, sin pasar por el hall.

**Why this priority**: Es el flujo principal que sustituye escribir credenciales en el quiosco; replica la experiencia familiar de activación por dispositivo secundario.

**Independent Test**: Abrir `/login` en un navegador de escritorio simulando quiosco, completar activación desde un segundo dispositivo móvil, y verificar que el quiosco termina autenticado en `/display` con contenido operativo.

**Acceptance Scenarios**:

1. **Given** un quiosco sin sesión en la vista de acceso, **When** la página carga, **Then** muestra un código de exactamente 6 letras mayúsculas (A–Z) y un QR escaneable que dirige a la ruta de activación de la aplicación, con indicación visible de que debe activarse desde el móvil (FR-009).
2. **Given** un operador autenticado en el móvil que abre la ruta de activación con un código válido pendiente, **When** confirma la activación de esa pantalla, **Then** el quiosco asociado recibe la sesión del operador en ≤ 10 s y navega automáticamente a `/display`.
3. **Given** un visitante en el móvil sin sesión que escanea el QR, **When** introduce credenciales válidas y confirma la activación, **Then** la pantalla del quiosco queda autenticada y entra en `/display` sin mostrar el hall, y el móvil muestra una confirmación de éxito sin redirección automática.
4. **Given** un quiosco esperando activación, **When** la activación se completa con éxito, **Then** el código deja de ser válido para nuevos intentos y la vista de acceso del quiosco deja de mostrar el estado de espera.
5. **Given** otra sesión operativa activa en la organización, **When** un quiosco completa la activación y abre display, **Then** las sesiones operativas previas quedan finalizadas con el mismo efecto que al abrir display desde el hall (incluida notificación a quioscos afectados).

---

### User Story 2 — Activación manual del código sin escanear QR (Priority: P2)

Un operador ve el código en la pantalla del quiosco pero prefiere abrir la activación manualmente en el móvil (por ejemplo, sin cámara o con el enlace bloqueado). Navega a la ruta de activación, escribe el código de 6 letras y completa el flujo.

**Why this priority**: El QR acelera el proceso, pero el código visible debe ser suficiente para completar la activación sin depender del escaneo.

**Independent Test**: Sin usar la cámara, abrir `/activate` en móvil, introducir el código mostrado en el quiosco y verificar el mismo resultado que con QR.

**Acceptance Scenarios**:

1. **Given** un código válido visible en el quiosco, **When** el operador lo introduce manualmente en la página de activación y confirma, **Then** la pantalla recibe la sesión y entra en `/display`.
2. **Given** un código con formato incorrecto (menos de 6 caracteres, minúsculas o dígitos), **When** el operador intenta activar, **Then** el sistema rechaza la petición con un mensaje claro antes de consumir el intento de vinculación.

---

### User Story 3 — El quiosco sigue pudiendo iniciar sesión con email y contraseña (Priority: P2)

Un operador con teclado disponible prefiere el método tradicional. La vista de acceso del quiosco mantiene el formulario de email y contraseña junto a la opción de activación por código/QR.

**Why this priority**: No todos los entornos requieren activación remota; eliminar el login directo rompería flujos existentes de laboratorio y backoffice.

**Independent Test**: En el quiosco, iniciar sesión con credenciales válidas sin usar QR ni código; verificar que el flujo actual hacia el hall sigue disponible para este método.

**Acceptance Scenarios**:

1. **Given** un quiosco en la vista de acceso, **When** el operador inicia sesión con email y contraseña válidos, **Then** accede al hall como hoy (sin forzar `/display`).
2. **Given** la vista de acceso del quiosco, **When** se renderiza, **Then** el bloque de activación por código/QR es la vista principal por defecto y el formulario de credenciales es accesible mediante una acción secundaria clara (pestaña, enlace o toggle).

---

### User Story 4 — Estados de error y seguridad comprensibles (Priority: P1)

Si el código expiró, ya fue usado, o el operador no tiene permiso para operar pantallas, ambos dispositivos muestran un resultado claro sin dejar el quiosco en un estado ambiguo.

**Why this priority**: En eventos en vivo, un fallo silencioso obliga a reiniciar hardware; la claridad reduce tiempo de recuperación.

**Independent Test**: Probar códigos expirados, reutilizados, inexistentes y usuario sin permisos; verificar mensajes y que el quiosco pueda generar un nuevo código.

**Acceptance Scenarios**:

1. **Given** un código expirado, **When** el operador intenta activarlo desde el móvil, **Then** recibe un mensaje indicando que el código ya no es válido y debe solicitar uno nuevo en la pantalla.
2. **Given** un código ya consumido, **When** otro operador intenta reutilizarlo, **Then** la activación falla con mensaje explícito y el quiosco no recibe una segunda sesión por ese código.
3. **Given** un usuario autenticado sin permiso para operar el quiosco de su organización, **When** intenta activar un código válido, **Then** la activación se deniega sin transferir sesión a la pantalla.
4. **Given** un quiosco esperando activación durante más de 15 minutos sin que se consuma el código, **When** expira el plazo, **Then** el quiosco muestra que el código caducó y presenta automáticamente un código nuevo (y QR actualizado).
5. **Given** un usuario que se autentica en el móvil pero está inactivo o desactivado en el sistema, **When** intenta autorizar un código válido, **Then** la activación falla sin emitir sesión al quiosco (misma política que login directo, FR-015).

---

### User Story 5 — Confirmación clara en el móvil tras activar (Priority: P2)

Tras autorizar la vinculación desde el móvil, el operador ve una confirmación explícita de que la pantalla quedó activada y puede cerrar el navegador del móvil sin pasos adicionales.

**Why this priority**: Reduce incertidumbre en venue («¿ha funcionado?») sin forzar al operador a navegar al admin desde el móvil.

**Independent Test**: Completar activación desde móvil y verificar pantalla de éxito persistente sin redirect automático a hall o admin.

**Acceptance Scenarios**:

1. **Given** un operador que confirma una activación válida en `/activate`, **When** el servidor acepta la vinculación, **Then** el móvil muestra un mensaje de éxito indicando que la pantalla está activada.
2. **Given** la pantalla de éxito en el móvil, **When** el operador no interactúa más, **Then** no se produce redirección automática a `/hall`, `/admin` ni `/display` en el dispositivo móvil.

---

### Edge Cases

- Dos operadores intentan activar el mismo código casi simultáneamente: solo el primero en completar la autorización vincula la sesión; el segundo recibe error de código no disponible.
- El quiosco pierde conexión mientras espera: al recuperar red, muestra un código vigente (renovado si el anterior expiró durante la desconexión).
- El operador cierra el móvil tras escanear pero antes de confirmar: el quiosco sigue en espera hasta expiración; no se transfiere sesión parcial.
- «Cancelación explícita» en el quiosco: el operador cambia a credenciales o sale de `/login`; el cliente deja de hacer poll; el código pendiente en servidor caduca por TTL (sin API de cancelación).
- El quiosco ya tenía sesión activa y muestra la vista de acceso tras cierre de sesión: genera un nuevo código de vinculación distinto al anterior.
- Activación exitosa mientras ya hay otra sesión operativa activa en la organización: la nueva apertura de display vía activación suprime la sesión previa igual que el flujo hall → display.
- Activación exitosa mientras el quiosco está en otra pestaña o minimizado: al volver al foco, el quiosco refleja el estado autenticado y continúa hacia display sin recarga manual obligatoria.
- Usuario inactivo o desactivado intenta activar tras autenticarse en el móvil: la activación falla igual que un login directo fallido.
- Código introducido con espacios o separadores accidentales: el sistema normaliza o rechaza con mensaje sin crear vinculaciones parciales.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La vista de acceso del quiosco DEBE mostrar, para pantallas sin sesión, un código de vinculación de exactamente 6 letras mayúsculas (A–Z) y un QR que lleve a la ruta `/activate` de la misma aplicación. El bloque QR/código DEBE ser la vista principal por defecto al cargar `/login`.
- **FR-002**: Cada código de vinculación DEBE identificar de forma unívoca una solicitud de activación asociada a la sesión de espera de ese quiosco (navegador en `/login`) hasta que se consuma o expire; NO exige etiqueta de pantalla preasignada en el momento de generar el código.
- **FR-003**: El sistema DEBE exponer la ruta `/activate` accesible desde dispositivos móviles para introducir o confirmar el código de la pantalla a vincular.
- **FR-004**: Si el visitante de `/activate` no tiene sesión activa, el sistema DEBE exigir autenticación (email y contraseña) antes de completar la vinculación.
- **FR-005**: Tras una activación autorizada con éxito, la pantalla del quiosco DEBE recibir la sesión del operador que autorizó en el móvil y navegar automáticamente a `/display`, sin pasar por `/hall`. La apertura de sesión de display DEBE suprimir las sesiones operativas activas previas de la organización, con el mismo comportamiento que al abrir display desde el hall.
- **FR-006**: La activación por código/QR NO DEBE sustituir el login tradicional por email y contraseña en la vista de acceso del quiosco; ambos métodos coexisten, con QR/código como vista por defecto y credenciales en una acción secundaria.
- **FR-007**: El login tradicional en el quiosco DEBE conservar el comportamiento actual (redirección al hall tras éxito).
- **FR-008**: Los códigos de vinculación DEBEN caducar **15 minutos** después de su generación, ser de un solo uso y rotarse automáticamente en el quiosco al expirar.
- **FR-009**: Mientras un código está pendiente, el quiosco DEBE mostrar estado de espera visible (código legible, indicación de que hay que activar desde el móvil).
- **FR-010**: Al expirar un código pendiente, el quiosco DEBE generar automáticamente un nuevo código y actualizar el QR sin intervención del operador.
- **FR-011**: Solo usuarios autenticados con permiso para operar el quiosco de su organización DEBEN poder completar una activación.
- **FR-012**: Intentos fallidos (código inexistente, expirado, ya usado, formato inválido, permiso denegado) DEBEN devolver mensajes comprensibles en el móvil sin transferir sesión al quiosco.
- **FR-013**: La pantalla del quiosco DEBE enterarse de la activación completada en tiempo cercano al real (objetivo ≤ 10 s en condiciones de red normales de venue) sin que el operador pulse nada en el quiosco.
- **FR-014**: Tras entrar en `/display` vía activación, el quiosco DEBE poder iniciar la sesión de display operativa con la misma capacidad funcional que cuando el operador llega desde el hall (incluida apertura de sesión de operador si los requisitos de readiness lo permiten). La etiqueta de dispositivo de pantalla se registra o confirma en `/display` con el mismo flujo que hoy, no durante la activación por código.
- **FR-015**: El flujo de activación DEBE aplicar las mismas políticas de seguridad de sesión que el login directo (duración estándar o extendida según la elección «recordarme» en el móvil, revocación al cerrar sesión, usuarios inactivos rechazados).
- **FR-016**: El sistema DEBE limitar intentos abusivos de activación por código y por cliente para mitigar fuerza bruta sobre el espacio de 6 letras.
- **FR-017**: La interfaz de activación en móvil DEBE ser usable en pantallas pequeñas (entrada del código, confirmación, mensajes de error, flujo de login embebido o encadenado), con controles accesibles (etiquetas, targets táctiles ≥44 px, contraste legible).
- **FR-018**: Tras una activación exitosa confirmada en el móvil, la interfaz DEBE mostrar una pantalla de éxito explícita (p. ej. «Pantalla activada») sin redirección automática a otras rutas de la aplicación en ese dispositivo.

### Traceability & Quality Requirements

- **TQ-001**: Los contratos activos `AUTH.RBAC` y `DISPLAY.CONFIG_SESSION` DEBEN actualizarse antes de implementar el comportamiento observable de activación por dispositivo.
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas o una tarea de validación manual explícita con justificación para los flujos P1 (activación exitosa, expiración, permisos, navegación a display).
- **TQ-003**: La entrada de manifiesto DEBE actualizarse antes de considerar completa la implementación.

### Key Entities

- **Solicitud de activación de pantalla**: Petición temporal que vincula la sesión de espera de un quiosco (cliente en `/login`) con un código de 6 letras, estado servidor (pendiente, autorizada, consumida, expirada), marca de tiempo de creación y caducidad, e identificador de la conexión de espera del quiosco. El cliente puede abandonar localmente (sin estado servidor «cancelada»). La etiqueta de dispositivo de pantalla no forma parte de esta entidad; se resuelve después al entrar en `/display`.
- **Código de vinculación**: Representación legible por humanos (6 letras mayúsculas) derivada de la solicitud; se muestra en el quiosco y se introduce o confirma en el móvil.
- **Dispositivo quiosco en espera**: Cliente de pantalla que solicita activación, muestra QR/código y recibe la sesión transferida al completarse la autorización.
- **Dispositivo de autorización**: Cliente móvil (o secundario) donde el operador se autentica y confirma la vinculación en `/activate`.

## Success Criteria *(mandatory)*

- **SC-001**: El 95 % de activaciones exitosas en pruebas de aceptación completan la vinculación (móvil confirma → quiosco en `/display` operativo) en menos de 30 segundos de extremo a extremo.
- **SC-002**: El 100 % de activaciones completadas en pruebas P1 omiten la pantalla de hall en el quiosco.
- **SC-003**: En pruebas de seguridad, ningún código expirado o ya usado permite transferir sesión en más de 0 % de intentos repetidos (todos rechazados con mensaje claro).
- **SC-004**: Al menos el 90 % de operadores de prueba completan la activación solo con QR (sin soporte) en el primer intento en un ensayo moderado (≥ 5 participantes).
- **SC-005**: El login tradicional por email/contraseña en el quiosco mantiene paridad funcional con el comportamiento previo al cambio (0 regresiones bloqueantes en suite de regresión de autenticación).
- **SC-006**: Tras 8 horas de códigos rotando por expiración (cada 15 minutos) en un quiosco de laboratorio, no quedan códigos pendientes huérfanos que permitan vinculación cruzada a otra pantalla.

## Assumptions

- El código usa solo letras mayúsculas A–Z (sin dígitos ni caracteres ambiguos adicionales), tal como indicó el usuario.
- El código de vinculación identifica la sesión de espera del quiosco, no una etiqueta de pantalla preasignada; el registro o confirmación de etiqueta ocurre en `/display` como en el flujo actual.
- La validez de un código pendiente es de **15 minutos** desde su generación (confirmado en clarificación); el quiosco rota el código automáticamente al expirar.
- El QR codifica la URL base de activación; el código puede precargarse en la URL o introducirse manualmente en `/activate`.
- Cualquier usuario que hoy puede iniciar sesión y abrir el modo display para su organización puede autorizar una activación.
- La sesión transferida al quiosco hereda la preferencia «recordarme» elegida en el móvil durante el login de activación.
- La UI de login del quiosco presenta activación por código/QR como vista principal por defecto; el formulario clásico de credenciales se accede mediante pestaña, enlace o toggle secundario.
- `/activate` es una ruta pública en cuanto a navegación, pero la confirmación requiere autenticación.
- Si la apertura de display falla por readiness u otro bloqueo de negocio existente, el quiosco autenticado muestra el mismo tratamiento de error que hoy al entrar en display desde el hall (no se relajan bloqueos de seguridad).

## Relationships

- Modifies: `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION`
- Extends: —
- Depends on: —
- Supersedes: —
- Superseded by: —
