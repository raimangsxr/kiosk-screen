/**
 * Default environment used during `ng serve` and unit tests. Anything that
 * must NOT be shipped to production (default credentials, helper toggles)
 * is gated behind `devMode`. Production builds are wired in
 * `environment.prod.ts` and selected via `fileReplacements` in
 * `angular.json`.
 */
export const environment = {
  production: false,
  devMode: true,
  displayOrchestrator: true,
  /**
   * Safety-net preventive reload of the pinned iframe, in seconds. 0 = OFF
   * (default). When an embedded app (e.g. jukebox) leaks memory over a
   * multi-hour event, set this to a long interval (e.g. 21600 = 6h) so the
   * kiosk remounts the iframe periodically to reclaim it. The reload only
   * fires while an iframe is actually on screen (CHG-051).
   */
  iframePreventiveReloadSeconds: 0,
};