import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../core/auth/auth.service';

/**
 * Guard for protected routes (e.g. /hall, /admin, /display). Allows navigation
 * when the user has an active session; redirects to /login otherwise.
 */
export const sessionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.parseUrl('/login');
};

/**
 * Guard for the root route and any "unauthenticated landing" path. Redirects
 * authenticated users to /hall (they shouldn't see the login form) and
 * unauthenticated users to /login.
 */
export const authRootGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return router.parseUrl(auth.isAuthenticated() ? '/hall' : '/login');
};
