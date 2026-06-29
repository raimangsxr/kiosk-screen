import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { routes } from './app.routes';
import { provideExtendedColors } from './core/theme/extended-colors';
import { authExpiredInterceptor } from './core/auth/auth-expired.interceptor';
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
    }
  ]
};