import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { AdminContentStreamService } from './admin-content-stream.service';

class MockEventSource {
  static lastInstance: MockEventSource | null = null;

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();

  constructor(
    readonly url: string,
    readonly options?: EventSourceInit,
  ) {
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
}

describe('AdminContentStreamService', () => {
  let service: AdminContentStreamService;
  let auth: { refresh: jasmine.Spy; user: ReturnType<typeof signal> };
  let router: { navigateByUrl: jasmine.Spy };
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    MockEventSource.lastInstance = null;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

    router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    auth = {
      refresh: jasmine.createSpy('refresh').and.returnValue(
        of({ id: 'u1', email: 'a@b.com', displayName: 'Admin', roles: ['administrator'] })
      ),
      user: signal({ id: 'u1', email: 'a@b.com', displayName: 'Admin', roles: ['administrator'] })
    };

    TestBed.configureTestingModule({
      providers: [
        AdminContentStreamService,
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(AdminContentStreamService);
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    service.stop();
  });

  it('debounces multiple inventory signals into one emission within 1s', fakeAsync(() => {
    const emissions: number[] = [];
    service.inventoryChanged$.subscribe(() => emissions.push(1));

    service.notifyInventoryChangedForTests();
    service.notifyInventoryChangedForTests();
    service.notifyInventoryChangedForTests();
    tick(999);
    expect(emissions.length).toBe(0);
    tick(1);
    expect(emissions.length).toBe(1);
  }));

  it('coalesces 5 events within 200ms into one emission', fakeAsync(() => {
    const emissions: number[] = [];
    service.inventoryChanged$.subscribe(() => emissions.push(1));

    for (let index = 0; index < 5; index += 1) {
      service.notifyInventoryChangedForTests();
      tick(40);
    }
    tick(1000);
    expect(emissions.length).toBe(1);
  }));

  it('defers inventory emission while drag is active and flushes on release', fakeAsync(() => {
    const emissions: number[] = [];
    service.inventoryChanged$.subscribe(() => emissions.push(1));

    service.setDragDeferred(true);
    service.notifyInventoryChangedForTests();
    tick(1000);
    expect(emissions.length).toBe(0);

    service.setDragDeferred(false);
    tick(1000);
    expect(emissions.length).toBe(1);
  }));

  it('disconnects on stop()', () => {
    service.start();
    service.stop();
    expect(service.connected()).toBeFalse();
  });

  it('reconnect open triggers reconcile emission', fakeAsync(() => {
    const emissions: number[] = [];
    service.inventoryChanged$.subscribe(() => emissions.push(1));

    service.start();
    MockEventSource.lastInstance?.onopen?.();
    tick(0);
    expect(emissions.length).toBe(0);

    MockEventSource.lastInstance?.onopen?.();
    tick(1000);
    expect(emissions.length).toBe(1);
  }));

  it('redirects to login when auth refresh returns null after stream error', fakeAsync(() => {
    auth.refresh.and.returnValue(of(null));
    service.start();
    MockEventSource.lastInstance?.onerror?.();
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  }));

  it('marks stale after 30s disconnected', fakeAsync(() => {
    service.start();
    MockEventSource.lastInstance?.onerror?.();
    tick(30_000);
    expect(service.stale()).toBeTrue();
  }));

  it('updates nowPlaying signals on now_playing_changed event', () => {
    service.start();
    const source = MockEventSource.lastInstance;
    const listeners = (source as unknown as { listeners: Map<string, Array<(e: MessageEvent<string>) => void>> })
      .listeners;
    listeners.get('now_playing_changed')?.[0]?.({
      data: JSON.stringify({
        v: 1,
        type: 'now_playing_changed',
        at: '2026-07-30T00:00:00Z',
        contentId: 'item-1',
        title: 'Agenda'
      })
    } as MessageEvent<string>);

    expect(service.nowPlayingContentId()).toBe('item-1');
    expect(service.nowPlayingTitle()).toBe('Agenda');
  });

  it('clears nowPlaying signals when contentId is null', () => {
    service.start();
    const source = MockEventSource.lastInstance;
    const listeners = (source as unknown as { listeners: Map<string, Array<(e: MessageEvent<string>) => void>> })
      .listeners;
    listeners.get('now_playing_changed')?.[0]?.({
      data: JSON.stringify({
        v: 1,
        type: 'now_playing_changed',
        at: '2026-07-30T00:00:00Z',
        contentId: null
      })
    } as MessageEvent<string>);

    expect(service.nowPlayingContentId()).toBeNull();
    expect(service.nowPlayingTitle()).toBeNull();
  });

  it('inventory SSE debounce yields one reconcile window for coalesced consumers', fakeAsync(() => {
    let emissionCount = 0;
    service.inventoryChanged$.subscribe(() => {
      emissionCount += 1;
    });

    service.notifyInventoryChangedForTests();
    service.notifyInventoryChangedForTests();
    tick(1000);
    expect(emissionCount).toBe(1);
  }));
});
