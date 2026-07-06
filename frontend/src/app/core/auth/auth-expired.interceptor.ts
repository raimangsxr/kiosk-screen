import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Catches 401 responses from any API call once the user is past the login
 * flow, clears the local session, and routes them back to /login. The login
 * endpoint itself is skipped so that the LoginComponent can render its own
 * "credenciales incorrectas" message without bouncing the user.
 */
export const authExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        if (isLoginRequest(req.url)) {
          return throwError(() => error);
        }
        if (auth.isAuthenticated()) {
          auth.clearSession();
          void router.navigateByUrl('/login');
        }
      }
      return throwError(() => error);
    })
  );
};

function isLoginRequest(url: string): boolean {
  return url.includes('/api/auth/login');
}