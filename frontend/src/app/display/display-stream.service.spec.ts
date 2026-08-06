import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { DisplayLabelService } from './display-label.service';
import { DisplayStreamService } from './display-stream.service';
import { signal } from '@angular/core';

class MockEventSource {
  static instances: MockEventSource[] = [];
  static lastInstance: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  private readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this);
    MockEventSource.lastInstance = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  close(): void {
    // no-op
  }

  emit(type: string, data: string): void {
    const event = { data } as MessageEvent<string>;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
    this.onmessage?.(event);
  }

  open(): void {
    this.onopen?.();
  }
}

describe('DisplayStreamService', () => {
  let service: DisplayStreamService;
  let http: HttpTestingController;
  let router: { navigateByUrl: jasmine.Spy };
  let auth: { refresh: jasmine.Spy; clearSession: jasmine.Spy };
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    MockEventSource.instances = [];
    MockEventSource.lastInstance = null;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

    router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    auth = {
      refresh: jasmine.createSpy('refresh').and.returnValue(of({
        id: 'u1',
        email: 'a@b.c',
        displayName: 'A',
        roles: [],
      })),
      clearSession: jasmine.createSpy('clearSession'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DisplayStreamService,
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
        { provide: DisplayLabelService, useValue: { label: signal('Pantalla test') } },
      ],
    });
    service = TestBed.inject(DisplayStreamService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    service.stop();
    http.verify();
  });

  it('tryRegister returns null when no active display session exists', async () => {
    const registerPromise = service.tryRegister();
    const register = http.expectOne('/api/display/kiosk/register');
    register.flush('No active display session', { status: 404, statusText: 'Not Found' });
    await expectAsync(registerPromise).toBeResolvedTo(null);
  });

  it('registers when crypto.randomUUID is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          bytes.fill(0x11);
          return bytes;
        },
      },
    });

    try {
      const registerPromise = service.tryRegister();
      const register = http.expectOne('/api/display/kiosk/register');
      expect(typeof register.request.body.clientInstanceId).toBe('string');
      expect(register.request.body.clientInstanceId.length).toBeGreaterThan(0);
      register.flush('No active display session', { status: 404, statusText: 'Not Found' });
      await registerPromise;
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  function registrationResponse(kioskId: string) {
    return {
      kioskId,
      organizationId: 'org-1',
      operatorSessionId: 'session-1',
      protocolVersion: 1,
      displayDeviceId: 'device-1',
    };
  }

  async function flushRegistrationAndScales(kioskId: string): Promise<void> {
    const register = http.expectOne('/api/display/kiosk/register');
    expect(register.request.body).toEqual(jasmine.objectContaining({
      clientInstanceId: jasmine.any(String),
      label: 'Pantalla test',
    }));
    register.flush(registrationResponse(kioskId));
    await Promise.resolve();
    const scales = http.expectOne((req) => req.url.startsWith('/api/display/iframe-scales/me'));
    expect(scales.request.url).toContain(`kioskId=${kioskId}`);
    scales.flush({ displayDeviceId: 'device-1', overrides: {} });
  }

  it('registers, connects, and applies config_updated events', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-1');
    await startPromise;

    expect(MockEventSource.lastInstance?.url).toContain('kioskId=kiosk-1');
    expect(MockEventSource.lastInstance?.url).toContain('ngsw-bypass=true');
    expect(MockEventSource.lastInstance?.options?.withCredentials).toBeTrue();
    MockEventSource.lastInstance?.open();

    MockEventSource.lastInstance?.emit('config_updated', JSON.stringify({
      v: 1,
      type: 'config_updated',
      sequence: 2,
      emittedAt: '2026-07-08T12:00:00.000Z',
      operatorSessionId: 'session-1',
      organizationId: 'org-1',
      payload: {
        configuration: { id: 'config-1', topRegionRatio: 7, bottomRegionRatio: 1 },
        applyImmediately: true,
        changedFields: ['topRegionRatio'],
      },
    }));

    expect(service.configUpdated()?.configuration.topRegionRatio).toBe(7);
    expect(service.connected()).toBeTrue();
  });

  it('marks reconnecting on EventSource error', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-2');
    await startPromise;
    MockEventSource.lastInstance?.open();
    MockEventSource.lastInstance?.onerror?.();
    expect(service.reconnecting()).toBeTrue();
    expect(service.connected()).toBeFalse();
  });

  it('ends the stream cleanly on session_ended', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-3');
    await startPromise;
    MockEventSource.lastInstance?.open();

    MockEventSource.lastInstance?.emit('session_ended', JSON.stringify({
      v: 1,
      type: 'session_ended',
      sequence: 9,
      emittedAt: '2026-07-08T12:00:00.000Z',
      operatorSessionId: 'session-1',
      organizationId: 'org-1',
      payload: { reason: 'superseded', message: 'A new display session was opened.' },
    }));

    expect(service.sessionEnded()).toBeTrue();
    expect(service.connected()).toBeFalse();
    expect(service.reconnecting()).toBeFalse();
  });

  it('routes to login when auth refresh fails after stream error', async () => {
    auth.refresh.and.returnValue(of(null));
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-4');
    await startPromise;
    MockEventSource.lastInstance?.open();
    MockEventSource.lastInstance?.onerror?.();
    await Promise.resolve();

    expect(auth.refresh).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(service.reconnecting()).toBeFalse();
  });

  it('does not update lastEvent for SSE comment ping payloads', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-ping');
    await startPromise;
    MockEventSource.lastInstance?.open();

    MockEventSource.lastInstance?.emit('show_content', JSON.stringify({
      v: 1,
      type: 'show_content',
      sequence: 3,
      emittedAt: '2026-07-08T12:00:00.000Z',
      operatorSessionId: 'session-1',
      organizationId: 'org-1',
      payload: { commandId: 'cmd-1', content: { id: 'c1' }, playback: {}, transition: {}, reason: 'test' },
    }));
    const before = service.lastEvent();

    MockEventSource.lastInstance?.onmessage?.({ data: ': ping' } as MessageEvent<string>);
    expect(service.lastEvent()).toBe(before);
  });

  it('debounces auth refresh to one call per 5 s on repeated onerror', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-debounce');
    await startPromise;
    MockEventSource.lastInstance?.open();
    auth.refresh.calls.reset();

    MockEventSource.lastInstance?.onerror?.();
    MockEventSource.lastInstance?.onerror?.();
    MockEventSource.lastInstance?.onerror?.();
    await Promise.resolve();
    expect(auth.refresh).toHaveBeenCalledTimes(1);

    (service as unknown as { lastAuthVerifyAt: number }).lastAuthVerifyAt = Date.now() - 6000;
    MockEventSource.lastInstance?.onerror?.();
    await Promise.resolve();
    expect(auth.refresh).toHaveBeenCalledTimes(2);
  });

  it('skips duplicate snapshot payloads on reconnect', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-snapshot');
    await startPromise;
    MockEventSource.lastInstance?.open();

    const snapshot = JSON.stringify({
      v: 1,
      type: 'snapshot',
      sequence: 1,
      emittedAt: '2026-07-08T12:00:00.000Z',
      operatorSessionId: 'session-1',
      organizationId: 'org-1',
      payload: { contentMode: 'loop', isPaused: false, adsVisible: true, configuration: { id: 'cfg' } },
    });
    MockEventSource.lastInstance?.emit('snapshot', snapshot);
    expect(service.lastEvent()?.type).toBe('snapshot');

    MockEventSource.lastInstance?.emit('snapshot', snapshot);
    expect(service.lastSequence()).toBe(1);
  });

  it('recovers application events after reconnect simulation (SC-003 harness)', async () => {
    const startPromise = service.start();
    await flushRegistrationAndScales('kiosk-sc3');
    await startPromise;
    MockEventSource.lastInstance?.open();
    MockEventSource.lastInstance?.onerror?.();
    expect(service.reconnecting()).toBeTrue();

    MockEventSource.lastInstance?.open();
    MockEventSource.lastInstance?.emit('show_content', JSON.stringify({
      v: 1,
      type: 'show_content',
      sequence: 10,
      emittedAt: '2026-07-08T12:00:00.000Z',
      operatorSessionId: 'session-1',
      organizationId: 'org-1',
      payload: {
        commandId: 'cmd-remote',
        content: { id: 'remote-1', title: 'Remote', contentType: 'photo', sourceReference: 'x' },
        playback: { mode: 'photo' },
        transition: { animation: 'none' },
        reason: 'remote_jump',
      },
    }));

    expect(service.showContent()?.commandId).toBe('cmd-remote');
    expect(service.connected()).toBeTrue();
  });
});
