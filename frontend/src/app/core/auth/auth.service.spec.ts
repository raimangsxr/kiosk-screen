import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService, AuthenticatedUser } from './auth.service';

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
    service
      .login({ email: 'admin@example.com', password: 'admin' })
      .subscribe((user) => {
        expect(user.email).toBe('admin@example.com');
      });

    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'admin@example.com',
      password: 'admin',
      rememberMe: false
    });
    request.flush({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Ada Lovelace',
      roles: ['administrator']
    });

    expect(localStorage.getItem('kiosk_authenticated')).toBe('true');
    expect(localStorage.getItem('kiosk_user')).toBeNull();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.email()).toBe('admin@example.com');
    expect(service.displayName()).toBe('Ada Lovelace');
    expect(service.initials()).toBe('AL');
  });

  it('does not persist user JSON to localStorage', () => {
    service
      .login({ email: 'admin@example.com', password: 'admin', rememberMe: true })
      .subscribe();
    http.expectOne('/api/auth/login').flush({
      id: 'user-1',
      email: 'admin@example.com',
      displayName: 'Ada Lovelace',
      roles: ['administrator']
    });

    const raw = localStorage.getItem('kiosk_user');
    expect(raw).toBeNull();
    expect(localStorage.getItem('kiosk_remember')).toBe('true');
    expect(service.remembered()).toBeTrue();
  });

  it('clears storage on logout', () => {
    service['persist'](
      {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    expect(service.isAuthenticated()).toBeTrue();

    service.logout().subscribe();
    const request = http.expectOne('/api/auth/logout');
    request.flush(null);

    expect(localStorage.getItem('kiosk_authenticated')).toBeNull();
    expect(localStorage.getItem('kiosk_remember')).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
  });

  it('clears local state if logout request fails', () => {
    service['persist'](
      {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      true
    );

    service.logout().subscribe();
    const request = http.expectOne('/api/auth/logout');
    request.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
    expect(service.remembered()).toBeFalse();
  });

  it('falls back to email initial when display name is empty', () => {
    service['persist'](
      {
        id: 'user-2',
        email: 'operator@example.com',
        displayName: '',
        roles: ['event_operator']
      },
      false
    );
    expect(service.initials()).toBe('OP');
  });

  it('clearSession() wipes local state and storage', () => {
    service['persist'](
      {
        id: 'user-3',
        email: 'admin@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      true
    );
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.remembered()).toBeTrue();

    service.clearSession();

    expect(localStorage.getItem('kiosk_authenticated')).toBeNull();
    expect(localStorage.getItem('kiosk_remember')).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
    expect(service.remembered()).toBeFalse();
  });

  it('refresh() skips the HTTP call when no session flag is set', () => {
    expect(service.isAuthenticated()).toBeFalse();

    let completed = false;
    service.refresh().subscribe(() => {
      completed = true;
    });

    expect(completed).toBeTrue();
    http.expectNone('/api/auth/me');
  });

  it('refresh() hydrates user from /me when the session flag is set', () => {
    service['persist'](
      {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    expect(service.user()?.email).toBe('admin@example.com');

    let emitted: AuthenticatedUser | null | undefined;
    service.refresh().subscribe((user) => {
      emitted = user;
    });
    http.expectOne('/api/auth/me').flush({
      id: 'user-2',
      email: 'operator@example.com',
      displayName: 'Grace Hopper',
      roles: ['event_operator']
    });

    expect(emitted?.email).toBe('operator@example.com');
    expect(service.email()).toBe('operator@example.com');
    expect(service.displayName()).toBe('Grace Hopper');
  });

  it('refresh() clears the session when /me fails', () => {
    service['persist'](
      {
        id: 'user-1',
        email: 'admin@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      true
    );

    service.refresh().subscribe((user) => {
      expect(user).toBeNull();
    });
    http.expectOne('/api/auth/me').flush('expired', { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.user()).toBeNull();
    expect(service.remembered()).toBeFalse();
    expect(localStorage.getItem('kiosk_authenticated')).toBeNull();
    expect(localStorage.getItem('kiosk_remember')).toBeNull();
  });
});