import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const sessionGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (globalThis.localStorage?.getItem('kiosk_authenticated') === 'true') {
    return true;
  }
  return router.parseUrl('/login');
};
