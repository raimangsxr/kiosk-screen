import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { routes } from './app.routes';
import { provideExtendedColors } from './core/theme/extended-colors';
import { authExpiredInterceptor } from './core/auth/auth-expired.interceptor';
import { DEFAULT_LOCALE } from './core/i18n/locale.service';
import { provideAdminDensity } from './core/theme/density';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch(), withInterceptors([authExpiredInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideExtendedColors(),
    provideAdminDensity('standard'),
    {
      provide: MAT_ICON_DEFAULT_OPTIONS,
      useValue: { fontSet: 'material-symbols-outlined' }
    },
    // `@angular/localize` swaps `$localize` template strings at build time,
    // so `LOCALE_ID` is effectively fixed per build. We default to the
    // project's primary locale (es-ES) and rely on the `localize` field in
    // `angular.json` to produce per-locale builds for en-US. The
    // `LocaleService` records the operator's preference for future runtime
    // switching once we adopt a runtime translation loader.
    { provide: LOCALE_ID, useValue: DEFAULT_LOCALE }
  ]
};