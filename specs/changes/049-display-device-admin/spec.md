---
id: CHG-049
type: change
status: implemented
modifies:
  - DISPLAY.CONFIG_SESSION
depends_on:
  - CHG-045
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Administración de pantallas registradas

**Feature Branch**: `049-display-device-admin`

**Created**: 2026-08-03

**Status**: Implemented

**Input**: User description: "quiero poder gestionar las pantallas actualmente registradas, no solo en iframes, de forma que pueda borrarlas, pre-crearlas, etc."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.CONFIG_SESSION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-03

- Q: ¿Qué ocurre con las acciones de crear y eliminar pantalla en el formulario de iframe? → A: Eliminar por completo crear y eliminar del formulario de iframe; la matriz de escalas solo edita escalas y muestra un enlace «Gestionar pantallas».
- Q: ¿Cómo se actualiza el estado de conexión en la lista de pantallas? → A: Actualización automática periódica (~30 s) mientras la vista está abierta.
- Q: ¿Cómo renombra el operador una pantalla en la interfaz? → A: Diálogo modal con campo de etiqueta y acciones Guardar / Cancelar.
- Q: ¿Cómo pre-crea el operador una pantalla en la interfaz? → A: Formulario inline en la cabecera de la lista (campo de etiqueta + botón «Añadir pantalla»).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consultar el inventario de pantallas (Priority: P1)

Un operador de evento abre una sección dedicada del panel de administración para ver todas las pantallas conocidas de la organización: las creadas manualmente antes del evento, las registradas automáticamente cuando un quiosco se identifica, y su estado operativo actual (conectada o desconectada).

**Why this priority**: Sin un listado central no es posible planificar el evento ni auditar qué dispositivos existen; hoy esa información solo aparece de forma parcial dentro del formulario de iframes.

**Independent Test**: Con al menos una pantalla pre-creada y otra conectada en vivo, abrir la nueva vista de administración y verificar que ambas aparecen con etiqueta, estado de conexión y fecha de última actividad.

**Acceptance Scenarios**:

1. **Given** la organización tiene pantallas registradas (pre-creadas y/o por conexión de quiosco), **When** el operador abre la sección de administración de pantallas, **Then** ve una lista ordenada alfabéticamente por etiqueta con todas las pantallas conocidas.
2. **Given** una pantalla tiene un quiosco conectado en este momento, **When** se muestra en la lista, **Then** aparece marcada como «conectada».
3. **Given** una pantalla no tiene quiosco conectado, **When** se muestra en la lista, **Then** aparece marcada como «desconectada» y muestra la fecha/hora de última actividad conocida cuando exista.
4. **Given** no hay pantallas registradas, **When** el operador abre la sección, **Then** ve un estado vacío claro con instrucciones para pre-crear una pantalla o conectar un quiosco con etiqueta.
5. **Given** el operador no tiene permisos de gestión de contenido, **When** intenta acceder a la sección, **Then** el sistema deniega el acceso de forma coherente con el resto del panel de administración.
6. **Given** la vista de pantallas permanece abierta, **When** un quiosco se conecta o desconecta, **Then** el estado de conexión de la fila correspondiente se actualiza automáticamente en ≤ 30 s sin recargar manualmente la página.

---

### User Story 2 — Pre-crear pantallas antes del evento (Priority: P1)

Un operador prepara el evento creando etiquetas de pantalla (p. ej. «Sala principal», «Ultrawide lateral») antes de que los dispositivos físicos se conecten, para poder configurar escalas de iframe y planificar el despliegue.

**Why this priority**: La pre-creación es el caso de uso principal citado por el usuario; hoy solo es posible desde el formulario de edición de un iframe concreto.

**Independent Test**: Crear una pantalla «Pantalla B» desde la nueva sección; verificar que aparece en el listado y que un quiosco que se registre con la misma etiqueta queda vinculado a ese registro existente.

**Acceptance Scenarios**:

1. **Given** el operador está en la sección de pantallas, **When** introduce una etiqueta no vacía en el formulario inline de cabecera y pulsa «Añadir pantalla», **Then** la nueva pantalla aparece en la lista en ≤ 2 s sin recargar manualmente la página.
2. **Given** ya existe una pantalla con la misma etiqueta, **When** el operador intenta crear otra con etiqueta duplicada, **Then** el sistema muestra un mensaje de error claro y no crea un duplicado.
3. **Given** el operador deja la etiqueta vacía o solo espacios, **When** intenta crear, **Then** el botón de creación permanece deshabilitado o se muestra validación inline.
4. **Given** una pantalla pre-creada, **When** un quiosco se registra con la misma etiqueta, **Then** reutiliza el registro existente (no crea una fila duplicada) y la pantalla pasa a mostrarse como conectada.

---

### User Story 3 — Renombrar y eliminar pantallas (Priority: P1)

Un operador corrige etiquetas obsoletas o elimina pantallas que ya no forman parte del evento, sin tener que entrar en la configuración de un iframe concreto.

**Why this priority**: Borrar y renombrar son acciones explícitas del usuario; centralizarlas evita operaciones ocultas y reduce el riesgo de eliminar una pantalla por error al editar escalas.

**Independent Test**: Renombrar «Sala 1» a «Sala principal»; eliminar una pantalla desconectada tras confirmación; verificar que desaparece del listado y de las matrices de escala de iframe.

**Acceptance Scenarios**:

1. **Given** una pantalla en la lista, **When** el operador elige renombrar y confirma una etiqueta válida y única en el diálogo modal, **Then** la lista refleja el nuevo nombre y las referencias en otras vistas de administración (p. ej. escalas por pantalla en iframes) muestran la etiqueta actualizada.
2. **Given** una pantalla seleccionada para eliminar, **When** el operador confirma la acción en un diálogo de confirmación, **Then** la pantalla desaparece del listado y ya no aparece en matrices de escala de iframe.
3. **Given** una pantalla conectada en este momento, **When** el operador intenta eliminarla, **Then** el diálogo de confirmación advierte que la pantalla está conectada antes de proceder.
4. **Given** una pantalla eliminada, **When** un quiosco que usaba esa etiqueta se reconecta, **Then** el registro se crea de nuevo según el flujo normal de registro de quiosco (comportamiento existente de upsert por etiqueta).

---

### User Story 4 — Acceso desde la navegación del admin (Priority: P2)

Un operador descubre y accede a la gestión de pantallas desde el menú lateral del panel (`/admin/displays`, entrada **Pantallas** en Configuración), sin depender de estar editando un iframe. La eliminación de acciones de ciclo de vida en el formulario de iframe debe completarse **antes** de exponer crear/eliminar en la vista dedicada (FR-009).

**Why this priority**: La visibilidad en la navegación completa el objetivo de «no solo en iframes»; sin ella la funcionalidad queda oculta.

**Independent Test**: Verificar que existe una entrada «Pantallas» (o equivalente) en el grupo Configuración del menú admin y que lleva a la nueva vista.

**Acceptance Scenarios**:

1. **Given** un operador autenticado con permisos de gestión, **When** abre el menú de administración, **Then** ve una entrada dedicada a pantallas en el grupo Configuración con descripción breve del propósito.
2. **Given** el operador está editando escalas de iframe, **When** necesita crear o eliminar una pantalla, **Then** no ve botones de ciclo de vida en la matriz de escalas y accede a la sección dedicada mediante un enlace visible «Gestionar pantallas» sin perder el contexto de edición del iframe al volver.

---

### Edge Cases

- Etiqueta duplicada al renombrar: rechazar con mensaje claro, mantener el nombre anterior.
- Lista vacía tras eliminar la última pantalla: mostrar estado vacío, no error.
- Pantalla con historial de conexiones de quiosco: la eliminación debe ser posible (comportamiento actual del backend); el historial de conexiones no bloquea el borrado.
- Pantalla referenciada por overrides de escala de iframe: al eliminar, los overrides asociados desaparecen en cascada (comportamiento existente).
- Muchas pantallas (p. ej. > 20): la lista sigue siendo usable en escritorio y móvil (scroll, sin truncar etiquetas críticas).
- Error de red al guardar o eliminar: mensaje de error recuperable; el listado no pierde datos ya cargados.
- Operador en formulario de iframe: no encuentra botones de añadir ni eliminar pantalla; solo enlace a la vista dedicada.
- Renombrar cancelado en el diálogo modal: la etiqueta permanece sin cambios.
- Crear con etiqueta duplicada desde el formulario inline: mensaje de error inline o snackbar; el campo conserva el valor para corrección.
- Listas con más de 20 pantallas: scroll vertical en tabla/tarjetas sin paginación (comportamiento de `AdminListComponent`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer una vista de administración dedicada en la ruta **`/admin/displays`** (etiqueta de navegación **Pantallas**), accesible desde el panel, que liste todas las pantallas registradas de la organización.
- **FR-002**: Cada fila de la lista DEBE mostrar como mínimo: etiqueta, estado de conexión (conectada / desconectada) y última actividad conocida cuando aplique. El estado de conexión DEBE actualizarse automáticamente cada ~30 s mientras la vista permanece abierta.
- **FR-003**: El operador DEBE poder pre-crear una pantalla mediante un formulario inline en la cabecera de la lista (campo de etiqueta + botón «Añadir pantalla»); la etiqueta debe ser no vacía y única dentro de la organización.
- **FR-004**: El operador DEBE poder renombrar una pantalla existente mediante un diálogo modal con campo de etiqueta y acciones Guardar / Cancelar; el cambio de etiqueta NO DEBE alterar el identificador interno ni perder overrides de escala u otras referencias ligadas al id.
- **FR-005**: El operador DEBE poder eliminar una pantalla tras confirmación explícita; la eliminación DEBE retirar la pantalla del inventario y de las vistas que la referencian (p. ej. matrices de escala de iframe).
- **FR-006**: Al eliminar una pantalla conectada, el sistema DEBE mostrar una advertencia en el diálogo de confirmación antes de proceder.
- **FR-007**: La vista DEBE reutilizar las capacidades de administración de pantallas ya expuestas por el backend (listar, crear, renombrar, eliminar); no se requieren nuevos endpoints salvo que la lista necesite enriquecer el estado de conexión.
- **FR-008**: Solo usuarios con los mismos permisos que gestionan contenido e iframes DEBEN poder acceder a la vista y ejecutar acciones de ciclo de vida. El acceso al shell admin usa el `sessionGuard` existente; las mutaciones sin permiso reciben **403** del backend y el frontend muestra un mensaje seguro vía `adaptApiError`/snackbar (mismo patrón que iframes y contenido).
- **FR-009**: El formulario de edición de iframe NO DEBE incluir acciones de ciclo de vida (crear ni eliminar pantallas). Las acciones de crear, renombrar y eliminar se centralizan exclusivamente en la vista dedicada; la matriz de escalas por pantalla en iframes conserva únicamente la edición de escalas y un enlace «Gestionar pantallas».
- **FR-010**: Tras cualquier mutación (crear, renombrar, eliminar), la lista DEBE actualizarse para reflejar el estado actual sin exigir recarga manual de la página.

### Traceability & Quality Requirements

- **TQ-001**: El contrato activo `DISPLAY.CONFIG_SESSION` DEBE actualizarse si cambia el comportamiento observable (nueva ruta admin, navegación, centralización de acciones).
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas de la nueva vista o una tarea de validación manual explícita con justificación.
- **TQ-003**: La entrada del manifiesto DEBE actualizarse antes de considerar completa la implementación.

### Key Entities

- **Pantalla (display device)**: Registro persistente de un dispositivo de visualización identificado por etiqueta única dentro de la organización; tiene id estable, fechas de creación/actualización y última actividad.
- **Estado de conexión**: Indicación derivada de si existe un quiosco conectado en este momento para esa pantalla (no sustituye el registro persistente).
- **Etiqueta de pantalla**: Nombre legible elegido por el operador o el quiosco al registrarse; clave de negocio única por organización.

## Success Criteria *(mandatory)*

- **SC-001**: Un operador puede localizar la sección de pantallas desde el menú de administración en ≤ 10 s sin documentación externa.
- **SC-002**: Crear, renombrar o eliminar una pantalla se completa en ≤ 30 s incluyendo confirmación, con feedback visual de éxito o error.
- **SC-003**: El 100 % de las pantallas visibles en la matriz de escalas de iframe también aparecen en la vista dedicada (paridad de inventario).
- **SC-004**: Tras pre-crear una pantalla, un quiosco que se registre con la misma etiqueta queda vinculado al registro existente en el primer intento de conexión (sin duplicados).
- **SC-005**: Ningún operador con permisos adecuados necesita abrir el formulario de un iframe concreto únicamente para crear o eliminar una pantalla.
- **SC-006**: Mientras la vista de pantallas está abierta, un cambio de conexión/desconexión de quiosco se refleja en la lista en ≤ 30 s sin intervención del operador.

## Assumptions

- El backend ya expone operaciones de listado, creación, renombrado y eliminación de pantallas; este cambio prioriza la experiencia de administración en el frontend y la navegación.
- El estado «conectada» se determina cruzando el inventario de pantallas con los quioscos en vivo (comportamiento ya usado en la matriz de escalas de iframe).
- Las etiquetas admiten hasta 80 caracteres y deben ser únicas por organización (reglas actuales del backend).
- El idioma de la interfaz de administración sigue siendo español, coherente con el resto del panel.
- Renombrar una pantalla conectada es válido; el quiosco conserva su vínculo por id interno.

## Relationships

- Modifies: `DISPLAY.CONFIG_SESSION`
- Extends: —
- Depends on: `CHG-045` (registro slim de `display_devices` y CRUD admin)
- Supersedes: —
