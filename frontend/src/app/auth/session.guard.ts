import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../core/auth/auth.service';

export const sessionGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.parseUrl('/login');
};
