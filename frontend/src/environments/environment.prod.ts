/**
 * Production environment. Loaded via the `production` configuration in
 * `angular.json` (fileReplacement → swaps this for `environment.ts` at
 * build time). `devMode` is intentionally false so the default-credentials
 * hint and other dev-only affordances never reach production bundles.
 */
export const environment = {
  production: true,
  devMode: false,
  displayOrchestrator: true,
  /**
   * Safety-net preventive reload of the pinned iframe, in seconds. 0 = OFF
   * (default). Raise per deployment (e.g. 21600 = 6h) only if an embedded
   * app leaks memory over a multi-hour event. Reloads fire only while an
   * iframe is on screen (CHG-051).
   */
  iframePreventiveReloadSeconds: 0,
};