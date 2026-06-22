import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { authRootGuard, sessionGuard } from './session.guard';

class AuthServiceStub {
  private flag: boolean;

  constructor(initial: boolean) {
    this.flag = initial;
  }

  setAuthenticated(value: boolean): void {
    this.flag = value;
  }

  isAuthenticated(): boolean {
    return this.flag;
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

describe('sessionGuard', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('allows navigation when the user is authenticated', () => {
    configure(new AuthServiceStub(true));
    expect(runGuard(sessionGuard)).toBeTrue();
  });

  it('redirects to /login when the user is not authenticated', () => {
    configure(new AuthServiceStub(false));
    const result = runGuard(sessionGuard);
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
});
