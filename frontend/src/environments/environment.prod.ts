/**
 * Production environment. Loaded via the `production` configuration in
 * `angular.json` (fileReplacement → swaps this for `environment.ts` at
 * build time). `devMode` is intentionally false so the default-credentials
 * hint and other dev-only affordances never reach production bundles.
 */
export const environment = {
  production: true,
  devMode: false
};