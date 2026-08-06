---
id: CHG-053
type: change
status: in-progress
modifies:
  - DISPLAY.RUNTIME
depends_on:
  - CHG-028
  - CHG-041
  - CHG-050
  - CHG-051
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Estabilidad del renderizado fotográfico del kiosk

**Feature Branch**: `053-fix-kiosk-render-load`

**Created**: 2026-08-06

**Status**: In progress

**Input**: User description: "Corregir la saturación de CPU y los bloqueos del display observados en Producción durante la rotación rápida de fotografías originales y patrocinadores; corregir también la retención incorrecta de precargas y validar el resultado con pruebas."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rotación fotográfica fluida (Priority: P1)

Un operador deja el display rotando fotografías de alta resolución con la cadencia configurada y espera que el contenido conserve el encuadre completo y el relleno visual acordado sin bloquear el navegador ni disparar de forma sostenida el consumo del equipo.

**Why this priority**: El bloqueo del renderer impide usar el kiosk en un evento en directo y llegó a requerir terminar manualmente el proceso del navegador.

**Independent Test**: Ejecutar durante al menos 10 minutos el perfil de carga observado en Producción —15 fotografías, mayoría a 3 segundos, originales de hasta 2304×4096 y 5,5 MB, fade de 500 ms, 15 patrocinadores visibles— y medir capacidad de respuesta y consumo frente a la versión 1.9.0.

**Acceptance Scenarios**:

1. **Given** una fotografía vertical de al menos 9 MP en una pantalla horizontal, **When** aparece y rota a la siguiente pieza, **Then** el contenido completo permanece visible, el relleno decorativo no necesita una segunda capa fotográfica a resolución original y el display sigue respondiendo.
2. **Given** una lista que cambia mayoritariamente cada 3 segundos, **When** completa al menos diez minutos de rotación, **Then** no se requiere recargar ni terminar el renderer y cualquier navegación o comando visible se refleja en un máximo de 2 segundos.
3. **Given** que el usuario prefiere movimiento reducido, **When** se muestra contenido fotográfico o patrocinado, **Then** los efectos decorativos costosos y las animaciones no esenciales se desactivan manteniendo el contenido legible.

---

### User Story 2 - Precarga realmente acotada (Priority: P1)

El display puede recibir una cola grande de novedades o cambios rápidos de contenido sin descargar, decodificar o conservar medios que quedan fuera de la pieza visible y la única precarga permitida.

**Why this priority**: Una cola de calentamiento no acotada puede volver a producir crecimiento de memoria, decodificaciones concurrentes y bloqueo aunque el renderizado visible se optimice.

**Independent Test**: Inyectar una secuencia de precarga con más de cinco medios, reemplazarla antes de que terminen las descargas y comprobar que solo permanecen la pieza visible y la precarga vigente tras completarse o fallar las peticiones.

**Acceptance Scenarios**:

1. **Given** una pieza visible y cinco candidatos de precarga, **When** el display recibe la señal, **Then** solo el primer candidato vigente se descarga y retiene junto a la pieza visible.
2. **Given** una descarga o decodificación en curso que deja de pertenecer a la ventana vigente, **When** termina posteriormente, **Then** su recurso se libera y no queda disponible como medio retenido.
3. **Given** una descarga o decodificación fallida, **When** el display continúa con el último contenido válido, **Then** el recurso temporal del intento se libera y la rotación puede recuperarse con una señal posterior.

---

### User Story 3 - Actualizaciones reactivas y patrocinadores sin trabajo redundante (Priority: P2)

El display recibe comandos de contenido, anuncios y recuperación de red durante horas sin repetir transiciones por cambios internos equivalentes ni mantener simultáneamente SSE y polling después de recuperar la conexión.

**Why this priority**: El trabajo redundante amplifica el coste del blur, las decodificaciones y las animaciones de los 15 patrocinadores visibles.

**Independent Test**: Repetir comandos equivalentes de anuncios, cambiar el estado interno del viewer y simular caída/recuperación del stream verificando que no se reinician animaciones equivalentes y que el fallback tiene un ciclo de vida único.

**Acceptance Scenarios**:

1. **Given** dos comandos consecutivos con la misma ventana visible de patrocinadores y el mismo estilo, **When** solo cambia la identidad del comando, **Then** no se reinicia la animación ni se vuelve a calentar la misma ventana.
2. **Given** un comando de contenido ya aplicado, **When** cambian señales internas derivadas del viewer, **Then** el comando no se reproduce de nuevo.
3. **Given** que SSE permanece caído durante el umbral configurado, **When** se activa el polling y posteriormente vuelve SSE, **Then** el polling se detiene dentro de un ciclo de confirmación y no queda carga duplicada.

### Edge Cases

- Fotografías panorámicas, verticales, cuadradas, PNG con transparencia y JPEG con orientación EXIF.
- Rotación que avanza mientras la precarga anterior sigue descargando o decodificando.
- Cambio a iframe, modo fijo, pausa o navegación fuera de `/display` con descargas en curso.
- Señal de precarga vacía o compuesta por URLs repetidas.
- Fallo de captura del relleno decorativo por formato, dimensiones inválidas o restricciones del navegador.
- Más patrocinadores elegibles que celdas visibles, y comandos equivalentes recibidos durante una reconexión.
- Preferencia `prefers-reduced-motion` activada antes de abrir el display.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El display DEBE conservar el encuadre completo de fotografías y vídeos en la región superior.
- **FR-002**: El relleno decorativo de una fotografía NO DEBE requerir una segunda capa a resolución original ni aplicar continuamente un filtro costoso sobre una superficie de pantalla completa.
- **FR-003**: Cada fotografía visible DEBE requerir como máximo una representación a resolución original en el árbol de presentación; cualquier artefacto decorativo derivado DEBE estar acotado a una resolución pequeña y liberarse al cambiar de pieza.
- **FR-004**: La transición entre piezas DEBE evitar trabajo redundante cuando la identidad visible no cambia y DEBE mantener la interfaz atendible durante la rotación rápida.
- **FR-005**: La retención superior DEBE estar limitada a la pieza visible y una única precarga vigente, incluso cuando el servidor anuncie varias novedades.
- **FR-006**: Los candidatos fuera de la ventana vigente NO DEBEN permanecer en la cola de calentamiento ni incorporarse a la caché cuando una operación en curso finaliza tarde.
- **FR-007**: Todo recurso temporal creado para una descarga o una comprobación de presentación fallida DEBE liberarse.
- **FR-008**: El display DEBE conservar únicamente los medios de la ventana visible actual de patrocinadores y omitir comandos consecutivos cuya ventana y estilo sean equivalentes.
- **FR-009**: Los efectos reactivos de comandos SSE DEBEN depender únicamente de la señal de comando correspondiente y NO DEBEN reejecutar el mismo comando por mutaciones internas producidas al aplicarlo.
- **FR-010**: El ciclo de fallback DEBE observar el estado activo del display de forma reactiva, activarse solo tras la degradación definida y detener polling al recuperarse SSE.
- **FR-011**: Bajo `prefers-reduced-motion`, el display DEBE usar un fondo sólido en lugar del relleno decorativo y desactivar animaciones no esenciales de contenido y patrocinadores.
- **FR-012**: El cambio DEBE preservar los contratos de orquestación server-side, contenido diferido hasta estar listo, novedad visible y reproducción de vídeo con un único elemento activo.

### Traceability & Quality Requirements

- **TQ-001**: El contrato activo `DISPLAY.RUNTIME` DEBE actualizarse antes de implementar el comportamiento modificado.
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas para fotografía con una sola capa original, ventana de precarga acotada, finalización tardía, deduplicación de anuncios, dependencias reactivas y handoff SSE/polling.
- **TQ-003**: La validación DEBE incluir una prueba acelerada de rotación y una medición reproducible contra la versión 1.9.0; las validaciones manuales pendientes NO PUEDEN marcarse como completadas sin evidencia.
- **TQ-004**: La entrada CHG-053 y la relación con `DISPLAY.RUNTIME` DEBEN permanecer sincronizadas en `specs/manifest.yml`.
- **TQ-005**: El frontend DEBE completar su suite de pruebas y build de producción sin regresiones.

### Key Entities

- **Ventana de retención superior**: Conjunto formado por la pieza visible y, como máximo, el siguiente medio que debe estar preparado.
- **Artefacto de backdrop**: Representación decorativa derivada y de baja resolución que rellena las bandas sin conservar otra fotografía original.
- **Ventana visible de patrocinadores**: Secuencia ordenada de anuncios que ocupa las celdas configuradas en un instante concreto.
- **Perfil de carga de referencia**: Escenario reproducible con fotografías de alta resolución, rotación rápida y 15 patrocinadores usado para comparar estabilidad.

## Success Criteria *(mandatory)*

- **SC-001**: En el perfil de referencia durante 10 minutos, el display completa la rotación sin recarga, sin bloqueo superior a 2 segundos y sin requerir terminar el proceso del navegador.
- **SC-002**: Tras el calentamiento inicial, el consumo medio del proceso de presentación bajo el mismo perfil mejora al menos un 50 % frente a la versión 1.9.0 y no permanece por encima del equivalente a un núcleo completo durante más de 30 segundos consecutivos.
- **SC-003**: En cualquier instante estable hay como máximo una fotografía superior a resolución original y un único artefacto decorativo derivado; al finalizar una transición no quedan capas de la pieza anterior.
- **SC-004**: Después de 100 rotaciones aceleradas, el número de recursos superiores retenidos permanece en dos o menos y no crece con el número de señales procesadas.
- **SC-005**: Una cola anunciada de diez candidatos produce como máximo una precarga superior activa además del medio visible; los nueve candidatos restantes no quedan retenidos al completar las operaciones.
- **SC-006**: Tras una caída de stream que activa fallback, el polling se detiene dentro del primer ciclo posterior a la reconexión SSE.
- **SC-007**: Todas las pruebas específicas, la suite completa del frontend y el build de producción finalizan correctamente.

## Assumptions

- Se preserva el aspecto funcional de `contain` + relleno decorativo, pero el detalle del fondo puede reducirse porque se muestra desenfocado.
- El perfil observado en Producción es una referencia válida: imágenes de hasta 9,44 MP/5,5 MB, cadencia de 3 segundos, fade de 500 ms y 15 patrocinadores con slide de 1 segundo cada 6 segundos.
- No se modifica el protocolo SSE ni la autoridad del orquestador server-side.
- No se requiere una migración de datos ni cambiar los originales ya subidos.
- La validación larga de varias horas sigue siendo un gate de release; esta entrega debe completar al menos el proxy acelerado y dejar el procedimiento largo explícito y sin falsos positivos documentales.

## Relationships

- Modifies: `DISPLAY.RUNTIME`
- Extends: `CHG-028`, `CHG-050`, `CHG-051`
- Depends on: `CHG-041`, `ADR-0007`, `ADR-0009`
- Supersedes: ninguno
- Superseded by: —
