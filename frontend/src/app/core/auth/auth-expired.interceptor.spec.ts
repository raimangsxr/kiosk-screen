import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';

import { AuthService } from './auth.service';
import { authExpiredInterceptor } from './auth-expired.interceptor';

class AuthServiceStub {
  private readonly flag = signal(false);
  private cleared = 0;

  setAuthenticated(value: boolean, _user: object | null = null): void {
    this.flag.set(value);
    if (value) {
      localStorage.setItem('kiosk_authenticated', 'true');
    } else {
      localStorage.removeItem('kiosk_authenticated');
    }
  }

  isAuthenticated(): boolean {
    return this.flag();
  }

  clearSession(): void {
    this.cleared += 1;
    this.flag.set(false);
    localStorage.removeItem('kiosk_authenticated');
  }

  get clearCount(): number {
    return this.cleared;
  }
}

function configure(auth: AuthServiceStub): void {
  const routerStub = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)) };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authExpiredInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: routerStub }
    ]
  });
}

function runRequest(url: string): Promise<unknown> {
  const http = TestBed.inject(HttpClient);
  return new Promise((resolve, reject) => {
    http.get(url).subscribe({ next: resolve, error: reject });
  });
}

describe('authExpiredInterceptor', () => {
  let http: HttpTestingController;
  let auth: AuthServiceStub;
  let router: { navigateByUrl: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    auth = new AuthServiceStub();
    configure(auth);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as unknown as { navigateByUrl: jasmine.Spy };
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('clears the session and redirects to /login on a 401 from a protected endpoint', async () => {
    auth.setAuthenticated(true, { id: 'user-1', email: 'a@b.com', displayName: 'A', roles: [] });
    const pending = runRequest('/api/content');

    const request = http.expectOne('/api/content');
    request.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    await expectAsync(pending).toBeRejectedWith(jasmine.any(HttpErrorResponse));
    expect(auth.clearCount).toBe(1);
    expect(auth.isAuthenticated()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login');
  });

  it('does not redirect or clear the session for an unauthenticated caller receiving a 401', async () => {
    const pending = runRequest('/api/content');

    const request = http.expectOne('/api/content');
    request.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    await expectAsync(pending).toBeRejectedWith(jasmine.any(HttpErrorResponse));
    expect(auth.clearCount).toBe(0);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('forwards 401s from the login endpoint so the LoginComponent can render the error', async () => {
    const pending = runRequest('/api/auth/login');

    const request = http.expectOne('/api/auth/login');
    request.flush('bad credentials', { status: 401, statusText: 'Unauthorized' });

    await expectAsync(pending).toBeRejectedWith(jasmine.any(HttpErrorResponse));
    expect(auth.clearCount).toBe(0);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('passes non-401 errors through untouched', async () => {
    auth.setAuthenticated(true, { id: 'user-1', email: 'a@b.com', displayName: 'A', roles: [] });
    const pending = runRequest('/api/content');

    const request = http.expectOne('/api/content');
    request.flush('boom', { status: 500, statusText: 'Server Error' });

    await expectAsync(pending).toBeRejectedWith(jasmine.any(HttpErrorResponse));
    expect(auth.clearCount).toBe(0);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});