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
};