import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DisplayApiService } from '../core/api/display.api';
import { AuthService } from '../core/auth/auth.service';
import { DisplayPollingService } from './display-polling.service';

const validState = {
  configuration: {
    id: 'config-1',
    name: 'Main',
    topRegionRatio: 5,
    bottomRegionRatio: 1,
    defaultTopDurationSeconds: 10,
    defaultAdDurationSeconds: 10,
    isEnabled: true,
  },
  topContent: [],
  ads: [],
  fallbackActive: false,
};

describe('DisplayPollingService', () => {
  let service: DisplayPollingService;
  let http: HttpTestingController;
  let auth: { clearSession: jasmine.Spy; isAuthenticated: jasmine.Spy };
  let router: Router;

  beforeEach(() => {
    auth = {
      clearSession: jasmine.createSpy('clearSession'),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        DisplayPollingService,
        DisplayApiService,
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(DisplayPollingService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    service.stop();
    http.verify();
  });

  it('pollNow sets state and clears error on success', async () => {
    service.start(5000);
    const promise = firstValueFrom(service.pollNow());
    const req = http.expectOne('/api/display/state');
    req.flush(validState);
    const result = await promise;
    expect(result).toEqual(validState);
    expect(service.state()).toEqual(validState);
    expect(service.error()).toBeNull();
    expect(service.consecutiveFailures()).toBe(0);
  });

  it('records an error and increments consecutiveFailures on a 503', async () => {
    service.start(5000);
    const promise = firstValueFrom(service.pollNow());
    const req = http.expectOne('/api/display/state');
    req.flush('unavailable', { status: 503, statusText: 'Service Unavailable' });
    await promise;
    expect(service.state()).toBeNull();
    expect(service.error()?.category).toBe('unexpected');
    expect(service.consecutiveFailures()).toBe(1);
    expect(service.reconnecting()).toBeTrue();
    expect(auth.clearSession).not.toHaveBeenCalled();
  });

  it('clears the session and routes to /login on a 401', async () => {
    service.start(5000);
    const promise = firstValueFrom(service.pollNow());
    const req = http.expectOne('/api/display/state');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('nextBackoffMs returns the configured interval when no failures', () => {
    service['armedIntervalMs'] = 5000;
    expect(service.nextBackoffMs(0)).toBe(5000);
  });

  it('nextBackoffMs doubles for consecutive failures up to the cap', () => {
    service['armedIntervalMs'] = 5000;
    const first = service.nextBackoffMs(1);
    expect(first).toBeGreaterThanOrEqual(800);
    expect(first).toBeLessThanOrEqual(1200);

    const second = service.nextBackoffMs(2);
    expect(second).toBeGreaterThanOrEqual(1600);
    expect(second).toBeLessThanOrEqual(2400);

    const capped = service.nextBackoffMs(20);
    expect(capped).toBeLessThanOrEqual(DisplayPollingService.MAX_BACKOFF_MS);
    expect(capped).toBeGreaterThanOrEqual(DisplayPollingService.MIN_BACKOFF_MS);
  });

  it('nextBackoffMs clamps negative failure counts to the configured interval', () => {
    service['armedIntervalMs'] = 5000;
    expect(service.nextBackoffMs(-3)).toBe(5000);
  });

  it('start() schedules the first poll after the configured interval', fakeAsync(() => {
    service.start(5000);
    tick(4999);
    http.expectNone('/api/display/state');
    tick(1);
    http.expectOne('/api/display/state').flush(validState);
    expect(service.state()).toEqual(validState);
    expect(service.consecutiveFailures()).toBe(0);
    service.stop();
    tick(10000);
    http.expectNone('/api/display/state');
  }));

  it('uses backoff after a transient failure during polling', fakeAsync(() => {
    spyOn(service, 'nextBackoffMs').and.returnValue(1000);
    service.start(5000);
    tick(5000);
    http.expectOne('/api/display/state').flush('down', { status: 503, statusText: 'Down' });
    expect(service.consecutiveFailures()).toBe(1);

    tick(999);
    http.expectNone('/api/display/state');

    tick(1);
    http.expectOne('/api/display/state').flush(validState);
    expect(service.consecutiveFailures()).toBe(0);
    expect(service.reconnecting()).toBeFalse();
    service.stop();
  }));

  it('open() invokes the callback with state on success', () => {
    const callback = jasmine.createSpy('onOpen');
    service.open(callback);
    const req = http.expectOne('/api/display/open');
    req.flush(validState);
    expect(callback).toHaveBeenCalledWith(validState);
    expect(service.openError()).toBeNull();
  });

  it('open() surfaces openError on transient failure', () => {
    const callback = jasmine.createSpy('onOpen');
    service.open(callback);
    const req = http.expectOne('/api/display/open');
    req.flush('down', { status: 503, statusText: 'Down' });
    expect(callback).toHaveBeenCalledWith(null);
    expect(service.openError()).not.toBeNull();
  });

  it('retryOpen() re-attempts open after failure', fakeAsync(() => {
    const callback = jasmine.createSpy('onOpen');
    spyOn(service, 'nextBackoffMs').and.returnValue(0);
    service.open(callback);
    http.expectOne('/api/display/open').flush('down', { status: 503, statusText: 'Down' });

    service.retryOpen();
    tick(0);
    http.expectOne('/api/display/open').flush(validState);
    expect(callback.calls.mostRecent().args[0]).toEqual(validState);
  }));

  it('stop() cancels pending polls', fakeAsync(() => {
    service.start(5000);
    service.stop();
    tick(10000);
    http.expectNone('/api/display/state');
  }));

  it('pollNow returns null when polling is not running', async () => {
    const result = await firstValueFrom(service.pollNow());
    expect(result).toBeNull();
  });
});
