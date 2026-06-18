import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { sessionGuard } from './session.guard';

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

function runGuard(auth: AuthServiceStub): unknown {
  return TestBed.runInInjectionContext(() => sessionGuard({} as never, {} as never) as unknown);
}

describe('sessionGuard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('allows navigation when the user is authenticated', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthServiceStub(true) }
      ]
    });
    expect(runGuard(new AuthServiceStub(true))).toBeTrue();
  });

  it('redirects to /login when the user is not authenticated', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: new AuthServiceStub(false) }
      ]
    });
    const result = runGuard(new AuthServiceStub(false));
    const router = TestBed.inject(Router);
    const url = router.serializeUrl(result as never);
    expect(url).toContain('/login');
  });
});
