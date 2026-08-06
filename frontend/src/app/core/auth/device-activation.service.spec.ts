import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DeviceActivationService } from './device-activation.service';

describe('DeviceActivationService', () => {
  let service: DeviceActivationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DeviceActivationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('starts activation and stores device code from response', () => {
    let deviceCode = '';
    service.start().subscribe((result) => {
      deviceCode = result.deviceCode;
      expect(result.userCode).toBe('ABCDEF');
      expect(result.pollIntervalSeconds).toBe(2);
    });
    const request = http.expectOne('/api/auth/device-activation/start');
    request.flush({
      userCode: 'ABCDEF',
      deviceCode: 'device-123',
      expiresAt: '2026-08-06T10:00:00Z',
      pollIntervalSeconds: 2,
      activateUrl: '/activate?code=ABCDEF',
    });
    expect(deviceCode).toBe('device-123');
  });

  it('poll loop stops on authorized and returns user', fakeAsync(() => {
    let authorizedUser: { email: string } | undefined;
    service.pollUntilAuthorized('device-123', 2).subscribe((user) => {
      authorizedUser = user;
    });
    tick(0);

    const pending = http.expectOne('/api/auth/device-activation/poll');
    expect(pending.request.body).toEqual({ deviceCode: 'device-123' });
    pending.flush({ status: 'pending' });

    tick(2000);
    const authorized = http.expectOne('/api/auth/device-activation/poll');
    authorized.flush({
      status: 'authorized',
      user: {
        id: 'user-1',
        email: 'operator@example.com',
        displayName: 'Operator',
        roles: ['event_operator'],
      },
    });

    expect(authorizedUser?.email).toBe('operator@example.com');
  }));

  it('retries poll on transient network errors', fakeAsync(() => {
    const subscription = service.pollUntilAuthorized('device-123', 2).subscribe();
    tick(0);

    const first = http.expectOne('/api/auth/device-activation/poll');
    first.error(new ProgressEvent('error'));

    tick(2000);
    const second = http.expectOne('/api/auth/device-activation/poll');
    second.flush({ status: 'pending' });
    subscription.unsubscribe();
  }));

  it('detects expired activation errors', () => {
    expect(
      service.isExpiredActivationError({
        error: { code: 'activation_expired', message: 'expired' },
      }),
    ).toBeTrue();
  });

  it('builds activate URL with current origin', () => {
    expect(service.buildActivateUrl('ABCDEF')).toContain('/activate?code=ABCDEF');
  });

  it('normalizes and validates user codes', () => {
    expect(service.normalizeUserCode('ab-cd ef')).toBe('ABCDEF');
    expect(service.isValidUserCode('ABCDEF')).toBeTrue();
    expect(service.isValidUserCode('abc12f')).toBeFalse();
  });
});
