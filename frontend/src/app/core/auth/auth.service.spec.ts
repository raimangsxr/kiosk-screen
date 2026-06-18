import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('persists user info on login and exposes it as signals', () => {
    const userPromise = service
      .login({ email: 'admin@example.com', password: 'admin' })
      .subscribe((user) => {
        expect(user.email).toBe('admin@example.com');
      });

    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'admin@example.com', password: 'admin' });
    request.flush({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Ada Lovelace',
      roles: ['administrator']
    });

    userPromise.unsubscribe();

    expect(localStorage.getItem('kiosk_authenticated')).toBe('true');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.email()).toBe('admin@example.com');
    expect(service.displayName()).toBe('Ada Lovelace');
    expect(service.initials()).toBe('AL');
  });

  it('clears storage on logout', () => {
    service['persist']({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Ada Lovelace',
      roles: ['administrator']
    });
    expect(service.isAuthenticated()).toBeTrue();

    service.logout().subscribe();
    const request = http.expectOne('/api/auth/logout');
    request.flush(null);

    expect(localStorage.getItem('kiosk_authenticated')).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
  });

  it('clears local state if logout request fails', () => {
    service['persist']({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Ada Lovelace',
      roles: ['administrator']
    });

    service.logout().subscribe();
    const request = http.expectOne('/api/auth/logout');
    request.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
  });

  it('falls back to email initial when display name is empty', () => {
    service['persist']({
      id: 'user-2',
      email: 'operator@example.com',
      displayName: '',
      roles: ['event_operator']
    });
    expect(service.initials()).toBe('OP');
  });
});
