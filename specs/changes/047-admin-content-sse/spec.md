---
id: CHG-047
type: change
status: implemented
modifies:
  - CONTENT.ADS.ADMIN
depends_on: []
extends:
  - CHG-027
  - CHG-046
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Actualización en vivo de la lista de contenido del admin

**Feature Branch**: `047-admin-content-sse`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Añadamos SSE"

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ADS.ADMIN`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-07-30

- Q: ¿Cuándo debe estar activa la conexión en vivo (SSE)? → A: Solo en `/admin/content` (conectar al entrar, desconectar al salir).
- Q: ¿Cómo debe comportarse la lista ante varias notificaciones seguidas? → A: Agrupar notificaciones en ventana breve (~1 s) y recargar una vez.
- Q: ¿Qué feedback visual debe mostrar la lista cuando se sincroniza automáticamente? → A: Silenciosa: la tabla se actualiza sin toast ni banner.
- Q: ¿Qué debe ver el operador cuando la conexión en vivo se pierde temporalmente? → A: Indicador discreto solo tras desconexión prolongada (>30 s).
- Q: ¿Qué debe ocurrir si llega una actualización remota mientras el operador está reordenando? → A: Aplazar hasta soltar la fila; reconciliar después.

### Session 2026-07-30 (post-analyze)

- Resolución G1: tests de integración DEBEN cubrir upload público (`POST /api/v1/public/content`) además de mutaciones admin.
- Resolución I1: roles sin `CONTENT_MANAGEMENT_ROLES` pueden listar contenido pero no abren SSE; la lista permanece estática hasta **Actualizar**.
- Resolución I2/U1: sync SSE usa reconciliación en segundo plano sin skeleton; indicador stale: texto «Los datos pueden estar desactualizados» bajo la barra de acciones.
- Resolución U2: coalescing en ráfaga requiere test automatizado (no solo manual).
- Resolución U3/U4: al volver del formulario de edición la lista recarga; refresh SSE no debe ejecutarse mientras `saving()` es true.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Novedades públicas visibles al instante (Priority: P1)

Un operador tiene abierta la lista de contenido superior durante un evento en vivo. Un asistente sube una foto mediante la API pública (clave de API). La nueva entrada aparece en la lista del operador sin recargar la página ni salir de la pantalla.

**Why this priority**: Es el caso de uso principal que hoy falla: las novedades (`isNovelty`) solo se ven tras recargar o reentrar, lo que retrasa la moderación y la visibilidad operativa durante el evento.

**Independent Test**: Abrir `/admin/content` en un navegador; desde otro cliente, subir contenido público; verificar que la fila nueva aparece en la lista en menos de 3 segundos con el distintivo de novedad.

**Acceptance Scenarios**:

1. **Given** un operador autenticado en la lista de contenido superior, **When** llega un upload público nuevo al evento, **Then** la lista muestra el nuevo ítem sin intervención manual del operador.
2. **Given** el filtro **Solo novedades** activo, **When** llega un upload público, **Then** el ítem aparece en el conjunto filtrado si sigue marcado como novedad.
3. **Given** la lista paginada (p. ej. página 2), **When** llega contenido nuevo, **Then** la página actual, el tamaño de página y la selección masiva se conservan salvo que el operador cambie de página manualmente.

---

### User Story 2 — Cambios de otros operadores reflejados en vivo (Priority: P1)

Dos operadores gestionan el mismo evento desde sesiones distintas. Cuando uno crea, edita, elimina, activa/desactiva o reordena contenido, el otro ve la lista actualizada sin recargar.

**Why this priority**: En eventos con varios operadores, la lista estática provoca decisiones sobre contenido obsoleto y conflictos de edición.

**Independent Test**: Abrir la lista en dos navegadores con cuentas de operador; realizar un cambio en uno; verificar que el otro refleja el cambio en menos de 3 segundos.

**Acceptance Scenarios**:

1. **Given** dos operadores con la lista abierta, **When** uno elimina un ítem, **Then** el ítem desaparece en ambas listas.
2. **Given** dos operadores con la lista abierta, **When** uno reordena contenido, **Then** el orden visible coincide en ambas listas tras la actualización.
3. **Given** un operador con ítems seleccionados para acción masiva, **When** otro operador elimina uno de esos ítems, **Then** la selección se ajusta (el ítem eliminado deja de estar seleccionado) sin bloquear la interfaz.

---

### User Story 3 — Consumo de novedad por el quiosco (Priority: P2)

Cuando el quiosco muestra y consume una novedad pública, el operador que mira la lista ve actualizado el estado de esa fila (p. ej. deja de destacarse como novedad pendiente) sin recargar.

**Why this priority**: El filtro **Solo novedades** y el resaltado visual pierden utilidad si el operador no ve cuándo el quiosco ya procesó un upload.

**Independent Test**: Subir novedad pública; abrir lista con **Solo novedades**; forzar consumo en quiosco; verificar que el ítem desaparece del filtro o pierde el distintivo de novedad en menos de 5 segundos.

**Acceptance Scenarios**:

1. **Given** un ítem con novedad pendiente visible en la lista, **When** el quiosco lo consume, **Then** la fila deja de mostrarse como novedad pendiente en la lista del operador.
2. **Given** **Solo novedades** activo y un único ítem pendiente, **When** el quiosco lo consume, **Then** la lista muestra el estado vacío de novedades con el mensaje ya existente para ese caso.

---

### User Story 4 — Actualización manual y resiliencia de conexión (Priority: P2)

Si la conexión en vivo se interrumpe o el operador prefiere forzar una sincronización, puede usar **Actualizar** y la lista se recarga correctamente. Tras una caída temporal, la lista vuelve a sincronizarse automáticamente.

**Why this priority**: La actualización en vivo no debe sustituir un fallback fiable; hoy el botón **Actualizar** no está conectado y no hay recuperación automática.

**Independent Test**: Simular pérdida de red con la lista abierta; restaurar red; verificar reconexión y datos coherentes. Pulsar **Actualizar** y verificar recarga explícita.

**Acceptance Scenarios**:

1. **Given** la lista cargada, **When** el operador pulsa **Actualizar**, **Then** la lista se vuelve a cargar desde el servidor y refleja el estado actual.
2. **Given** una interrupción breve de la conexión en vivo, **When** se restablece la conectividad, **Then** la lista se sincroniza de nuevo sin recargar la página completa.
3. **Given** la sesión del operador ha expirado, **When** la conexión en vivo falla por autenticación, **Then** el operador es dirigido al flujo de inicio de sesión existente en lugar de quedarse con datos obsoletos sin aviso.
4. **Given** la conexión en vivo está caída más de 30 segundos, **When** el operador sigue en la lista, **Then** aparece un indicador discreto de que los datos pueden estar desactualizados hasta que se restablezca la conexión o pulse **Actualizar**.

---

### Edge Cases

- Varios eventos de cambio en ráfaga (p. ej. subida masiva pública): las notificaciones se agrupan en una ventana de ~1 segundo y provocan una sola recarga; la lista termina consistente con el servidor sin parpadeos que impidan leer o interactuar.
- El operador está en el formulario de edición de un ítem: la lista en segundo plano no interrumpe el formulario; al volver a la lista, `ngOnInit` recarga el inventario y abre SSE de nuevo con datos actuales.
- Operadores con acceso de lectura a la lista pero sin rol de gestión de contenido (`CONTENT_MANAGEMENT_ROLES`): ven la lista estática; el stream devuelve `403` y deben usar **Actualizar** para ver cambios remotos.
- Eventos duplicados o fuera de orden: la lista no muestra estados imposibles (p. ej. ítem eliminado que reaparece).
- Conexión en vivo no disponible de forma prolongada: la lista sigue mostrando la última carga exitosa y **Actualizar** sigue disponible.
- Cambios realizados por el mismo operador en la misma pestaña: no hay regresiones respecto al comportamiento actual (actualización optimista tras guardar); un refresh SSE en segundo plano no se dispara mientras `saving()` está activo.
- Las sincronizaciones automáticas exitosas no muestran toast, banner, modal ni skeleton de carga de lista; solo errores de conexión o autenticación requieren aviso visible al operador.
- Las desconexiones breves (<30 s) reconectan en silencio; a partir de 30 s sin conexión se muestra el texto discreto «Los datos pueden estar desactualizados» bajo la barra de acciones hasta reconectar o pulsar **Actualizar**.
- Durante un arrastre activo de reordenación, las actualizaciones remotas se aplazan hasta soltar la fila para evitar saltos en la tabla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE notificar en tiempo casi real a las sesiones de admin autenticadas cuando cambia el inventario de contenido superior del evento (alta, baja, modificación, reordenación, cambio de estado activo, cambio de novedad).
- **FR-002**: La lista de contenido superior en admin DEBE incorporar esos cambios automáticamente mientras la pantalla está abierta, sin recargar la página completa.
- **FR-003**: Tras recibir una notificación de cambio, la lista DEBE reconciliarse con la fuente de verdad del servidor para evitar desincronización entre operadores.
- **FR-004**: La actualización en vivo DEBE conservar, cuando sea posible, el contexto de navegación del operador: página actual, tamaño de página, filtro **Solo novedades** y scroll aproximado.
- **FR-005**: La selección masiva DEBE ajustarse cuando los ítems seleccionados dejan de existir tras una actualización remota.
- **FR-006**: El botón **Actualizar** de la lista DEBE recargar el inventario de contenido de forma explícita y funcionar independientemente de la conexión en vivo.
- **FR-007**: Si la conexión en vivo se pierde, el sistema DEBE reintentar la conexión automáticamente y volver a sincronizar la lista al restablecerse.
- **FR-008**: Solo operadores autenticados con permiso para gestionar contenido (`CONTENT_MANAGEMENT_ROLES`) DEBEN poder abrir el stream y recibir notificaciones de inventario; intentos no autorizados DEBEN devolver `403` sin exponer datos del evento. La lectura de lista (`GET /content`) puede seguir disponible para otros roles autenticados sin stream en vivo.
- **FR-009**: Los cambios originados por el quiosco al consumir novedades DEBEN reflejarse en la lista del admin con la misma canal de notificación que los cambios de operador o API pública.
- **FR-010**: La actualización en vivo DEBE limitarse a la lista de contenido superior en admin; la lista de anuncios (ads) queda fuera de alcance de este cambio.
- **FR-011**: La conexión en vivo DEBE abrirse al entrar en `/admin/content` y cerrarse al salir de esa pantalla; no debe mantenerse activa en otras rutas del admin.
- **FR-012**: Ante varias notificaciones de cambio en ráfaga, el sistema DEBE agruparlas en una ventana de aproximadamente 1 segundo y reconciliar el inventario una sola vez por ventana, evitando recargas redundantes que provoquen parpadeo.
- **FR-013**: Las sincronizaciones automáticas exitosas DEBEN ser silenciosas: la tabla se actualiza sin toast, banner, modal de confirmación ni skeleton de carga de lista.
- **FR-014**: Si la conexión en vivo permanece caída más de 30 segundos, el sistema DEBE mostrar bajo la barra de acciones el texto «Los datos pueden estar desactualizados»; las interrupciones más breves NO deben mostrar aviso.
- **FR-015**: Si el operador está reordenando mediante drag-and-drop, las sincronizaciones remotas DEBEN aplazarse hasta que suelte la fila; la reconciliación con el servidor ocurre en la siguiente ventana de agrupación tras soltar.
- **FR-016**: Las reconciliaciones disparadas por SSE DEBEN usar una vía de actualización en segundo plano (`silent`) que no active `loading` en la lista ni interrumpa una operación `saving()` en curso.

### Traceability & Quality Requirements

- **TQ-001**: El contrato activo `CONTENT.ADS.ADMIN` DEBE actualizarse si cambia el comportamiento observable.
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas o una tarea de validación manual explícita con justificación.
- **TQ-003**: La entrada en `specs/manifest.yml` DEBE actualizarse antes de dar por completada la implementación.

### Key Entities

- **Inventario de contenido superior**: Conjunto ordenado de ítems del evento (título, tipo, estado activo, orden, novedad pendiente, metadatos de rotación).
- **Notificación de cambio de inventario**: Señal de que el inventario puede haber cambiado y que el cliente admin debe reconciliarse con el servidor.
- **Sesión de admin**: Operador autenticado con acceso al panel del evento.

## Success Criteria *(mandatory)*

- **SC-001**: En pruebas con dos sesiones de operador, el 95 % de los cambios de inventario (alta, baja, edición, reordenación) se reflejan en la otra sesión en menos de 3 segundos sin recargar la página.
- **SC-002**: En pruebas de upload público con la lista abierta, el 95 % de las novedades nuevas aparecen en la lista en menos de 3 segundos.
- **SC-003**: Tras una interrupción de red de hasta 60 segundos, la lista vuelve a estar sincronizada en menos de 10 segundos desde que se restablece la conectividad, sin recarga manual.
- **SC-004**: El botón **Actualizar** recarga la lista correctamente en el 100 % de los intentos en condiciones de red normales.
- **SC-005**: Los operadores pueden seguir usando paginación, filtro de novedades y acciones masivas durante y después de actualizaciones en vivo sin pérdida de datos no intencionada (medido en pruebas de regresión de CHG-046).

## Assumptions

- El alcance es la **lista de contenido superior** (`/admin/content`); otras listas del admin (anuncios, usuarios, claves API) no se incluyen en este cambio.
- La conexión en vivo se activa únicamente mientras el operador está en `/admin/content` y se libera al navegar a otra pantalla del admin.
- La entrega en tiempo casi real usará **Server-Sent Events (SSE)**, alineado con el patrón ya adoptado para el quiosco (CHG-041), pero la especificación no prescribe detalles de protocolo.
- Un evento de notificación puede ser un aviso ligero (“algo cambió”); la lista obtiene el estado autoritativo mediante recarga del inventario, no necesariamente empujando el listado completo en cada evento.
- Los cambios locales del mismo operador (guardar, eliminar, reordenar) siguen actualizando la lista como hoy; la conexión en vivo complementa, no sustituye, ese flujo.
- El umbral de “tiempo casi real” para operadores en sala es ≤ 3 segundos en condiciones de red normales de evento.

## Relationships

- Modifies: `CONTENT.ADS.ADMIN`
- Extends: CHG-027 (novedades públicas y filtro), CHG-046 (paginación y UX de lista)
- Depends on: autenticación y permisos de operador existentes (`AUTH.RBAC`)
- Supersedes: —
- Superseded by: —

## Out of Scope

- Actualización en vivo de la lista de **anuncios** (ads).
- Actualización en vivo del dashboard de operaciones, control remoto u otras pantallas del admin.
- Notificaciones push fuera del navegador (móvil nativo, email).
- Sincronización en tiempo real del **formulario de edición** campo a campo mientras otro operador edita el mismo ítem.
