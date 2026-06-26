import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';

type GuardResult = boolean | UrlTree | Observable<boolean | UrlTree>;

/**
 * Guard for protected routes (e.g. /hall, /admin, /display). Allows navigation
 * when the user has an active session; otherwise it tries a silent
 * rehydration via `/api/auth/me` (the cookie is the source of truth — if it
 * is still valid, the call hydrates the user signal and the guard lets the
 * user through). When rehydration fails, the user is sent to /login.
 */
export const sessionGuard: CanActivateFn = (): GuardResult => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  return auth.refresh().pipe(
    map((user) => (user !== null ? true : router.parseUrl('/login')))
  );
};

/**
 * Guard for the root route and any "unauthenticated landing" path. Redirects
 * authenticated users to /hall (they shouldn't see the login form) and
 * unauthenticated users to /login.
 */
export const authRootGuard: CanActivateFn = (): GuardResult => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.isAuthenticated() && auth.hasPersistedSession()) {
    return auth.refresh().pipe(
      map((user) => router.parseUrl(user !== null ? '/hall' : '/login'))
    );
  }
  return router.parseUrl(auth.isAuthenticated() ? '/hall' : '/login');
};