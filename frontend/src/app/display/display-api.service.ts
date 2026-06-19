/**
 * Re-export shim for the kiosk display feature.
 *
 * The new core/api/display.api.ts module owns the canonical interface and the
 * ``DisplayApiService`` implementation (with the spec 009 ``watchState`` polling
 * method). This shim keeps the existing import paths under
 * ``src/app/display/display-api.service`` working without copy-pasting the
 * contract across the two locations.
 */
export {
  DisplayApiService,
  type DisplayContentItem,
  type DisplayAdItem,
  type DisplayKioskConfiguration,
  type DisplayState,
} from '../core/api/display.api';
