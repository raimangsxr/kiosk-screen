---
id: CHG-059
type: change
status: implemented
modifies:
  - DISPLAY.RUNTIME
  - CONTENT.ROTATION
depends_on:
  - CHG-050
  - CHG-051
  - CHG-053
  - CHG-056
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Recuperación de vídeo tras ráfagas

**Feature Branch**: `059-fix-video-burst`

**Created**: 2026-08-08

**Status**: Implemented

**Input**: User description: "Los vídeos pueden dejar de reproducirse después de que lleguen muchas novedades al display; las fotografías continúan funcionando. Corregir la sobrecarga y la falta de recuperación."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproducción estable durante una ráfaga (Priority: P1)

Como operador de un evento, quiero que el display continúe mostrando fotografías y reproduciendo vídeos mientras llegan muchas novedades, para que la pantalla no se degrade durante el directo.

**Why this priority**: Una ráfaga de contenido es una situación normal durante un evento y no debe agotar los recursos del reproductor ni provocar fallos persistentes.

**Independent Test**: Anunciar al menos diez novedades mixtas, incluidas varias de vídeo, y comprobar que nunca hay más de tres preparaciones simultáneas, que la retención permanece acotada y que los vídeos posteriores siguen reproduciéndose.

**Acceptance Scenarios**:

1. **Given** un display reproduciendo contenido regular, **When** recibe una precarga con diez novedades mixtas, **Then** prepara los medios en orden FIFO con un máximo de tres operaciones simultáneas.
2. **Given** una ráfaga de novedades ya procesada, **When** llega el siguiente vídeo regular o novedoso, **Then** el vídeo dispone de una fuente válida y puede comenzar a reproducirse.
3. **Given** medios que dejan de formar parte de la ventana vigente, **When** finalizan tarde o desaparecen de la cola pendiente, **Then** sus recursos en memoria se liberan y no vuelven a entrar en la caché visible.

---

### User Story 2 - Recuperación automática de fallos transitorios (Priority: P2)

Como operador, quiero que un error puntual de descarga o decodificación no inutilice permanentemente un vídeo, para no tener que recargar manualmente el display durante el evento.

**Why this priority**: La red y los decodificadores pueden fallar temporalmente bajo carga; el display debe recuperarse por sí mismo.

**Independent Test**: Forzar un primer fallo de preparación y una segunda respuesta válida para la misma URL, y comprobar que el medio vuelve a intentarse y termina listo sin recargar la página.

**Acceptance Scenarios**:

1. **Given** un medio que falla al prepararse, **When** vuelve a ser necesario después del periodo de recuperación, **Then** se realiza un nuevo intento en lugar de conservar indefinidamente el estado fallido.
2. **Given** un vídeo visible que emite un error de reproducción, **When** el display detecta el fallo, **Then** informa una sola vez del error para el comando vigente y la rotación puede continuar.
3. **Given** un error perteneciente a un vídeo que ya no es el contenido vigente, **When** el evento tardío llega al display, **Then** no se informa como fallo del comando actual.

### Edge Cases

- La misma URL aparece simultáneamente como contenido visible, precarga y novedad pendiente.
- Una precarga nueva sustituye a otra mientras existen descargas en curso.
- El display cambia a pausa, contenido fijo o iframe durante una ráfaga.
- Una descarga finaliza después de que el componente se haya destruido.
- El elemento de vídeo emite varios eventos `error` o `stalled` para el mismo comando.
- La notificación de error al servidor falla; el temporizador del orquestador sigue siendo la red de seguridad.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El display MUST aplicar un límite global máximo de tres preparaciones de medios simultáneas, incluidas las solicitadas por el indicador, la confirmación de novedades, la compuerta de contenido y la precarga.
- **FR-002**: Las preparaciones pendientes MUST respetar orden FIFO y MUST deduplicarse por URL mientras estén en cola, en curso o listas.
- **FR-003**: La retención de blobs de contenido superior MUST permanecer limitada al contenido visible y una única precarga vigente; las novedades adicionales pueden conservar estado de preparación sin retener un blob de presentación fuera de esa ventana.
- **FR-004**: Una terminación de descarga que ya no pertenece a la ventana retenida MUST liberar inmediatamente cualquier URL temporal creada y MUST NOT incorporarse a la caché visible.
- **FR-005**: Una novedad MUST disponer de una fuente de presentación válida antes de comprometerse como contenido visible, incluso si el servidor la había marcado previamente como descargada.
- **FR-006**: Los fallos de descarga o comprobación MUST ser recuperables mediante un intento posterior acotado; el estado fallido MUST NOT bloquear permanentemente una URL durante toda la vida del display.
- **FR-007**: Los reintentos MUST evitar bucles inmediatos y tormentas de solicitudes cuando un medio continúa fallando.
- **FR-008**: El display MUST detectar los errores del elemento de vídeo visible y MUST informar `media_error` como máximo una vez por comando vigente.
- **FR-009**: Los eventos tardíos de elementos de vídeo sustituidos MUST NOT informar errores contra el comando vigente.
- **FR-010**: Pausa, contenido fijo, iframe y destrucción del componente MUST cancelar o invalidar el trabajo pendiente que ya no sea aplicable sin restaurar terminaciones tardías.
- **FR-011**: La rotación server-side y sus contratos SSE y de eventos MUST conservar su forma pública actual.
- **FR-012**: Cada nuevo comando que muestre vídeo MUST iniciar una instancia de reproducción nueva aunque el contenido y la URL coincidan con el comando anterior.

### Traceability & Quality Requirements

- **TQ-001**: Los contratos activos `DISPLAY.RUNTIME` y `CONTENT.ROTATION` MUST actualizarse antes de la implementación.
- **TQ-002**: El cambio MUST incluir pruebas automatizadas de ráfaga, concurrencia, retención, reintento y error del vídeo visible.
- **TQ-003**: La entrada de `CHG-059` en el manifiesto MUST estar actualizada antes de considerar completa la implementación.

### Key Entities

- **Solicitud de medio**: Preparación deduplicada de una URL, con tipo, prioridad FIFO, ciclo de vida y consumidores.
- **Ventana retenida**: Conjunto acotado formado por el medio superior visible y una precarga vigente.
- **Fallo recuperable**: Estado temporal de una URL que permite un intento posterior sin tormenta de solicitudes.
- **Comando visible**: Identidad del contenido actualmente comprometido, usada para deduplicar y validar eventos de reproducción.

## Success Criteria *(mandatory)*

- **SC-001**: Una prueba con diez novedades mixtas mantiene como máximo tres preparaciones simultáneas en todo momento.
- **SC-002**: Tras procesar cien cambios de ventana, el display conserva como máximo dos blobs de contenido superior y no retiene blobs de candidatos descartados.
- **SC-003**: Un medio que falla una vez y después está disponible se recupera automáticamente en el siguiente intento permitido sin recargar el display.
- **SC-004**: Cada comando de vídeo visible inicia su propia reproducción, genera como máximo un informe de error y ningún elemento sustituido genera un informe asociado al comando nuevo.
- **SC-005**: Las pruebas focalizadas del runtime y el build de producción del frontend finalizan correctamente.

## Assumptions

- La cola FIFO actual y el máximo de tres preparaciones simultáneas siguen siendo la política deseada.
- El orquestador server-side conserva su temporizador como red de seguridad si el cliente no puede informar un fallo.
- No se modifica el formato de los comandos SSE ni del endpoint de eventos de kiosk.
- La recuperación automática puede usar un enfriamiento breve y determinista antes de reintentar una URL fallida.

## Relationships

- Modifies: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`
- Extends: none
- Depends on: `CHG-050`, `CHG-051`, `CHG-053`, `CHG-056`
- Supersedes: none
- Superseded by: none
