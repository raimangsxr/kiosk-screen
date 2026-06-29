import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { AuthService, AuthenticatedUser } from '../core/auth/auth.service';
import { authRootGuard, sessionGuard } from './session.guard';

class AuthServiceStub {
  private flag: boolean;
  private persisted = false;
  private refreshResult: AuthenticatedUser | null = null;

  constructor(initial: boolean) {
    this.flag = initial;
  }

  setAuthenticated(value: boolean): void {
    this.flag = value;
  }

  setPersisted(value: boolean): void {
    this.persisted = value;
  }

  setRefreshResult(user: AuthenticatedUser | null): void {
    this.refreshResult = user;
  }

  isAuthenticated(): boolean {
    return this.flag;
  }

  hasPersistedSession(): boolean {
    return this.persisted;
  }

  refresh(): Observable<AuthenticatedUser | null> {
    return of(this.refreshResult);
  }
}

function runGuard(guard: CanActivateFn): unknown {
  return TestBed.runInInjectionContext(() => guard({} as never, {} as never) as unknown);
}

function configure(auth: AuthServiceStub): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth }
    ]
  });
}

function asPromise<T>(value: T | Observable<T>): Promise<T> {
  return value instanceof Observable
    ? new Promise((resolve) => value.subscribe((v) => resolve(v)))
    : Promise.resolve(value);
}

describe('sessionGuard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('allows navigation when the user is authenticated', () => {
    const stub = new AuthServiceStub(true);
    configure(stub);
    expect(runGuard(sessionGuard)).toBeTrue();
  });

  it('redirects to /login when the user is not authenticated and no session is persisted', async () => {
    const stub = new AuthServiceStub(false);
    stub.setPersisted(false);
    configure(stub);
    const result = await asPromise(runGuard(sessionGuard) as never);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/login');
  });

  it('hydrates from /me when a session is persisted and lets the user through', async () => {
    const stub = new AuthServiceStub(false);
    stub.setPersisted(true);
    stub.setRefreshResult({
      id: 'u1',
      email: 'admin@example.com',
      displayName: 'Ada',
      roles: ['administrator']
    });
    configure(stub);
    const result = await asPromise(runGuard(sessionGuard) as never);
    expect(result).toBeTrue();
  });

  it('redirects to /login when rehydration fails', async () => {
    const stub = new AuthServiceStub(false);
    stub.setPersisted(true);
    stub.setRefreshResult(null);
    configure(stub);
    const result = await asPromise(runGuard(sessionGuard) as never);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/login');
  });
});

describe('authRootGuard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('redirects authenticated users to /hall', () => {
    configure(new AuthServiceStub(true));
    const result = runGuard(authRootGuard);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/hall');
  });

  it('redirects unauthenticated users to /login', () => {
    configure(new AuthServiceStub(false));
    const result = runGuard(authRootGuard);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/login');
  });

  it('rehydrates a persisted session and sends the user to /hall', async () => {
    const stub = new AuthServiceStub(false);
    stub.setPersisted(true);
    stub.setRefreshResult({
      id: 'u1',
      email: 'admin@example.com',
      displayName: 'Ada',
      roles: ['administrator']
    });
    configure(stub);
    const result = await asPromise(runGuard(authRootGuard) as never);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/hall');
  });

  it('sends a persisted-but-expired session back to /login', async () => {
    const stub = new AuthServiceStub(false);
    stub.setPersisted(true);
    stub.setRefreshResult(null);
    configure(stub);
    const result = await asPromise(runGuard(authRootGuard) as never);
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/login');
  });
});