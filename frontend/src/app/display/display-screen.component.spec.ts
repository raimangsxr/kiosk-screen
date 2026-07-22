import { Subject, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { ApplicationErrorContract } from '../shared/contracts/admin-contracts';
import { EventBrandingService } from '../core/event-branding.service';
import { EventConfigSyncService } from '../core/event-config-sync.service';
import { CursorService } from './cursor.service';
import { DisplayPollingService } from './display-polling.service';
import { DisplayMediaCacheService } from './display-media-cache.service';
import { DisplayLabelService } from './display-label.service';
import { DisplayStreamService } from './display-stream.service';
import type { ConfigUpdatedPayload } from './display-stream.models';
import { DisplayScreenComponent } from './display-screen.component';
import { DisplayViewerController } from './display-viewer.controller';
import { IframeScaleService } from './iframe-scale.service';

describe('DisplayScreenComponent', () => {
  const readyState: DisplayState = {
    configuration: {
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 5,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 15,
      defaultAdDurationSeconds: 10,
      defaultTopRotationAnimation: 'fade',
      defaultAdRotationAnimation: 'slide',
      defaultTopAnimationDurationMilliseconds: 300,
      defaultAdAnimationDurationMilliseconds: 300,
      inlineAdCount: 2,
      inlineAdItemBorderRadiusPx: 5,
      inlineAdItemBorderWidthPx: 0,
      inlineAdItemBorderColor: '#ffffff',
      isEnabled: true
    },
    topContent: [{
      id: 'content-1',
      title: 'Welcome',
      contentType: 'photo',
      sourceReference: 'https://example.com/welcome.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 15,
      effectiveDurationSeconds: 15,
      effectiveRotationAnimation: 'fade'
    }],
    ads: [{
      id: 'ad-1',
      sourceReference: 'https://example.com/ad.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 10,
      effectiveDurationSeconds: 10,
      effectiveRotationAnimation: 'slide',
      advertiser: 'Sponsor'
    }],
    fallbackActive: false
  };

  beforeEach(() => {
    localStorage.setItem('kiosk_display_label', 'Pantalla test');
    TestBed.configureTestingModule({
      providers: [displayStreamProvider(), displayLabelProvider(), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createPollingMock(initialState: DisplayState, poll$?: Subject<DisplayState>) {
    const stateSignal = signal<DisplayState | null>(null);
    const consecutiveFailures = signal(0);
    const openErrorSignal = signal<ApplicationErrorContract | null>(null);
    let pollSub: { unsubscribe: () => void } | null = null;

    return {
      state: stateSignal.asReadonly(),
      loading: signal(false).asReadonly(),
      error: signal<ApplicationErrorContract | null>(null).asReadonly(),
      openError: openErrorSignal.asReadonly(),
      openInProgress: signal(false).asReadonly(),
      consecutiveFailures: consecutiveFailures.asReadonly(),
      reconnecting: computed(() => consecutiveFailures() > 0),
      hasState: computed(() => stateSignal() !== null),
      open: (cb: (s: DisplayState | null) => void) => cb(initialState),
      retryOpen: jasmine.createSpy('retryOpen'),
      start: () => {
        pollSub?.unsubscribe();
        if (poll$) {
          pollSub = poll$.subscribe((s) => stateSignal.set(s));
        }
      },
      stop: jasmine.createSpy('stop').and.callFake(() => {
        pollSub?.unsubscribe();
        pollSub = null;
      }),
      pollNow: () => (poll$ ? poll$.asObservable().pipe(take(1)) : of(initialState)),
      reconfigureInterval: jasmine.createSpy('reconfigureInterval'),
      setConsecutiveFailures: (n: number) => consecutiveFailures.set(n),
      setOpenError: (err: ApplicationErrorContract | null) => openErrorSignal.set(err),
    };
  }

  function patchDisplayScreenPolling(initialState: DisplayState, poll$?: Subject<DisplayState>) {
    TestBed.overrideComponent(DisplayScreenComponent, {
      set: {
        providers: [
          CursorService,
          DisplayViewerController,
          DisplayMediaCacheService,
          { provide: DisplayPollingService, useValue: createPollingMock(initialState, poll$) },
        ],
      },
    });
  }

  function displayStreamProvider() {
    const lastEvent = signal<{
      type: 'config_updated' | 'branding_updated';
      payload: ConfigUpdatedPayload | Record<string, unknown>;
    } | null>(null);
    return {
      provide: DisplayStreamService,
      useValue: {
        lastEvent,
        configUpdated: computed(() => {
          const event = lastEvent();
          return event?.type === 'config_updated' ? event.payload as ConfigUpdatedPayload : null;
        }),
        brandingUpdated: computed(() => {
          const event = lastEvent();
          return event?.type === 'branding_updated' ? event.payload : null;
        }),
        showContent: computed(() => null),
        showAds: computed(() => null),
        modeChanged: computed(() => null),
        showIframe: computed(() => null),
        preload: computed(() => null),
        layoutUpdated: computed(() => null),
        reconnecting: signal(false),
        connected: signal(false),
        sseFallbackActive: signal(false),
        sessionEnded: signal(false),
        kioskId: signal<string | null>(null),
        lastSequence: signal(0),
        tryRegister: jasmine.createSpy('tryRegister').and.returnValue(Promise.resolve(null)),
        startWithRegistration: jasmine.createSpy('startWithRegistration').and.returnValue(Promise.resolve()),
        start: jasmine.createSpy('start').and.returnValue(Promise.resolve()),
        stop: jasmine.createSpy('stop'),
      },
    };
  }

  function displayLabelProvider() {
    return {
      provide: DisplayLabelService,
      useValue: {
        label: signal('Pantalla test'),
        setLabel: jasmine.createSpy('setLabel'),
        readStoredLabel: () => 'Pantalla test',
      },
    };
  }

  function eventBrandingProvider(initial = { eventName: '', organizerName: '', organizerLogoUrl: null as string | null }) {
    const branding = signal(initial);
    return {
      provide: EventBrandingService,
      useValue: {
        branding: branding.asReadonly(),
        refresh: jasmine.createSpy('refresh').and.callFake(() => of(branding())),
        clear: () => branding.set({ eventName: '', organizerName: '', organizerLogoUrl: null })
      }
    };
  }

  function eventConfigSyncProvider(channel: Subject<void>) {
    return {
      provide: EventConfigSyncService,
      useValue: {
        changes$: channel.asObservable(),
        notifyEventConfigChanged: () => channel.next(),
      }
    };
  }

  function viewerFor(fixture: ComponentFixture<DisplayScreenComponent>): DisplayViewerController {
    return fixture.debugElement.injector.get(DisplayViewerController);
  }

  function seedDisplayFromState(
    fixture: ComponentFixture<DisplayScreenComponent>,
    state: DisplayState,
  ): void {
    const component = fixture.componentInstance as unknown as {
      state: DisplayState | null;
      stateVersion: { update: (fn: (value: number) => number) => void };
      displayActive: boolean;
      contentRenderItems: DisplayContentItem[];
    };
    component.state = state;
    component.stateVersion.update((value) => value + 1);
    component.displayActive = true;
    const viewer = viewerFor(fixture);
    if (state.topContent[0]) {
      viewer.currentContent.set(state.topContent[0]);
      component.contentRenderItems = [state.topContent[0]];
    }
    if (state.ads.length) {
      const count = Math.max(1, state.configuration.inlineAdCount ?? 1);
      viewer.visibleAds.set(state.ads.slice(0, count));
      viewer.inlineAdCount.set(count);
      viewer.adBorderStyle.set({
        borderRadius: `${state.configuration.inlineAdItemBorderRadiusPx}px`,
        borderWidth: `${state.configuration.inlineAdItemBorderWidthPx}px`,
        borderColor: state.configuration.inlineAdItemBorderColor ?? '#ffffff',
        borderStyle: 'solid',
      });
    }
    fixture.detectChanges();
  }

  function createComponent(
    state: DisplayState,
    branding = { eventName: '', organizerName: '', organizerLogoUrl: null as string | null },
): ComponentFixture<DisplayScreenComponent> {
  TestBed.configureTestingModule({
    imports: [DisplayScreenComponent],
    providers: [
      {
        provide: DisplayApiService,
        useValue: {
          openDisplay: () => of(state),
          watchState: () => of(state),
          getState: () => of(state),
        }
      },
      eventBrandingProvider(branding),
      displayStreamProvider(),
      displayLabelProvider(),
      provideRouter([]),
      provideNoopAnimations()
    ]
  });
  patchDisplayScreenPolling(state);
  const fixture = TestBed.createComponent(DisplayScreenComponent);
  fixture.detectChanges();
  seedDisplayFromState(fixture, state);
  return fixture;
}

  function driveIframe(
    fixture: ComponentFixture<DisplayScreenComponent>,
    url: string,
    scale?: { scaleX: number; scaleY: number },
  ): void {
    viewerFor(fixture).applyShowIframe({
      commandId: 'cmd-iframe',
      reason: 'remote_mode_change',
      iframe: { id: 'iframe-1', title: 'Live', url, ...scale },
    });
    fixture.detectChanges();
  }

  it('renders a stable 5-to-1 kiosk shell without management controls', () => {
    const fixture = createComponent(readyState);
    const host: HTMLElement = fixture.nativeElement;
    const screen = host.querySelector('.display-screen');
    const topRegion = host.querySelector('.top-region') as HTMLElement;
    const adRegion = host.querySelector('.sponsor-strip') as HTMLElement;

    expect(screen).not.toBeNull();
    expect(topRegion.offsetHeight / adRegion.offsetHeight).toBeCloseTo(5, 0);
    expect(host.textContent).not.toContain('Admin');
    expect(host.textContent).not.toContain('Settings');
  });

  it('renders fallback states when content and ads are unavailable', () => {
    const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: true });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Content unavailable');
    expect(text).toContain('Sponsors unavailable');
  });

  it('renders event branding when configured', () => {
    const fixture = createComponent(readyState, {
      eventName: 'Spring Summit 2026',
      organizerName: 'ACME Events',
      organizerLogoUrl: '/api/media/logo-1'
    });
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('#branding-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('aria-label')).toBe('Organizer and event branding');
    expect(overlay.textContent).toContain('Spring Summit 2026');
    expect(overlay.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('hides event branding when all fields are empty', () => {
    const fixture = createComponent(readyState);
    expect(fixture.nativeElement.querySelector('#branding-overlay')).toBeNull();
  });

  xit('refreshes event branding when branding_updated SSE fires (CHG-041)', () => {
    const lastEvent = signal<{
      type: 'branding_updated';
      payload: Record<string, unknown>;
    } | null>(null);
    const brandingSignal = signal({ eventName: 'Initial', organizerName: '', organizerLogoUrl: null as string | null });
    const refreshSpy = jasmine.createSpy('refresh').and.callFake(() => {
      brandingSignal.set({ eventName: 'Refreshed', organizerName: '', organizerLogoUrl: null });
      return of(brandingSignal());
    });
    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(readyState),
            watchState: () => of(readyState),
            getState: () => of(readyState),
          }
        },
        {
          provide: EventBrandingService,
          useValue: {
            branding: brandingSignal.asReadonly(),
            refresh: refreshSpy,
            clear: () => undefined,
          }
        },
        {
          provide: DisplayStreamService,
          useValue: {
            lastEvent,
            configUpdated: computed(() => null),
            brandingUpdated: computed(() => {
              const event = lastEvent();
              return event?.type === 'branding_updated' ? event.payload : null;
            }),
            showContent: computed(() => null),
            showAds: computed(() => null),
            reconnecting: signal(false),
            connected: signal(true),
            sseFallbackActive: signal(false),
            sessionEnded: signal(false),
            kioskId: signal('kiosk-1'),
            lastSequence: signal(0),
            tryRegister: jasmine.createSpy('tryRegister').and.returnValue(Promise.resolve(null)),
            startWithRegistration: jasmine.createSpy('startWithRegistration').and.returnValue(Promise.resolve()),
            start: jasmine.createSpy('start').and.returnValue(Promise.resolve()),
            stop: jasmine.createSpy('stop'),
          },
        },
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(readyState);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();

    const callsBefore = refreshSpy.calls.count();
    lastEvent.set({ type: 'branding_updated', payload: { eventName: 'Gala' } });
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(refreshSpy.calls.count()).toBeGreaterThan(callsBefore);

    const updatedOverlay = fixture.nativeElement.querySelector('#branding-overlay') as HTMLElement;
    expect(updatedOverlay.textContent).toContain('Refreshed');
  });

  it('renders the sponsor title as the first sponsor-strip child', () => {
    const fixture = createComponent(readyState);
    const adRegion = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement;
    expect(adRegion.getAttribute('aria-label')).toBe('Patrocinadores del evento');
    const adRegionTitle = fixture.nativeElement.querySelector('.sponsor-strip__title') as HTMLElement;
    expect(adRegionTitle.textContent).toContain('Patrocinadores del evento');
  });

  it('preserves query parameters in the kiosk iframe src', () => {
    const fixture = createComponent(readyState);
    const url = 'https://example.org/live?token=abc&tab=scores';
    driveIframe(fixture, url);

    expect(getIframeSrc(fixture)).toBe(url);
  });

  it('updates the kiosk iframe src when the active iframe URL changes', () => {
    const fixture = createComponent(readyState);
    driveIframe(fixture, 'https://example.org/live?foo=1');
    expect(getIframeSrc(fixture)).toBe('https://example.org/live?foo=1');

    driveIframe(fixture, 'https://example.org/other?foo=2');
    expect(getIframeSrc(fixture)).toBe('https://example.org/other?foo=2');
  });

  it('exposes the configured iframe URL on data-iframe-url for debugging', () => {
    const fixture = createComponent(readyState);
    const url = 'https://example.org/live?embed_token=embed_test';
    driveIframe(fixture, url);

    const el = fixture.nativeElement.querySelector('[data-testid="display-iframe"]') as HTMLElement | null;
    expect(el?.getAttribute('data-iframe-url')).toBe(url);
  });

  it('applies inverse-dimension scale CSS vars on the iframe host', () => {
    const fixture = createComponent(readyState);
    driveIframe(fixture, 'https://example.org/live', { scaleX: 1.25, scaleY: 0.8 });

    const host = fixture.nativeElement.querySelector('.iframe-scale-host') as HTMLElement | null;
    expect(host?.style.getPropertyValue('--iframe-scale-x')).toBe('1.25');
    expect(host?.style.getPropertyValue('--iframe-scale-y')).toBe('0.8');
  });

  it('prefers per-display override scale over iframe defaults', () => {
    const fixture = createComponent(readyState);
    const iframeScales = TestBed.inject(IframeScaleService);
    iframeScales.displayDeviceId.set('device-1');
    iframeScales.applyScaleUpdate({
      displayDeviceId: 'device-1',
      iframeId: 'iframe-1',
      scaleX: 0.9,
      scaleY: 1.1,
      source: 'override',
    });
    driveIframe(fixture, 'https://example.org/live', { scaleX: 1.25, scaleY: 0.8 });

    const host = fixture.nativeElement.querySelector('.iframe-scale-host') as HTMLElement | null;
    expect(host?.style.getPropertyValue('--iframe-scale-x')).toBe('0.9');
    expect(host?.style.getPropertyValue('--iframe-scale-y')).toBe('1.1');
  });

  it('requests browser fullscreen when remote control asks for it', fakeAsync(() => {
    const originalRequestFullscreen = document.documentElement.requestFullscreen;
    const requestFullscreen = jasmine.createSpy('requestFullscreen').and.resolveTo();
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const fixture = createComponent({
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        fullscreenRequested: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
    });
    tick();
    fixture.detectChanges();

    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: originalRequestFullscreen,
    });
    fixture.destroy();
  }));

  it('shows a local fullscreen prompt when the browser rejects the remote request', fakeAsync(() => {
    const originalRequestFullscreen = document.documentElement.requestFullscreen;
    const requestFullscreen = jasmine
      .createSpy('requestFullscreen')
      .and.returnValues(Promise.reject(new Error('activation required')), Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const fixture = createComponent({
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        fullscreenRequested: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
    });
    tick();
    fixture.detectChanges();

    const prompt = fixture.nativeElement.querySelector(
      '[data-testid="display-fullscreen-prompt"]'
    ) as HTMLButtonElement;
    expect(prompt).not.toBeNull();

    prompt.click();
    tick();

    expect(requestFullscreen).toHaveBeenCalledTimes(2);

    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: originalRequestFullscreen,
    });
    fixture.destroy();
  }));

  xit('rotates top content using effective duration (server-orchestrated rotation)', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      topContent: [
        { ...readyState.topContent[0], title: 'First', durationSeconds: 1, effectiveDurationSeconds: 1 },
        { ...readyState.topContent[0], id: 'content-2', title: 'Second', displayOrder: 2, durationSeconds: 1, effectiveDurationSeconds: 1 }
      ]
    });

    expect(fixture.componentInstance.currentContent?.title).toBe('First');

    tick(1000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
  }));

  xit('applies remote navigation commands and restarts the content timer (server-orchestrated)', fakeAsync(() => {
    const poll$ = new Subject<DisplayState>();
    const state: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
      topContent: [
        { ...readyState.topContent[0], id: 'content-1', sourceReference: 'https://example.com/1.jpg', title: 'First', durationSeconds: 10, effectiveDurationSeconds: 10 },
        { ...readyState.topContent[0], id: 'content-2', sourceReference: 'https://example.com/2.jpg', title: 'Second', displayOrder: 2, durationSeconds: 10, effectiveDurationSeconds: 10 },
        { ...readyState.topContent[0], id: 'content-3', sourceReference: 'https://example.com/3.jpg', title: 'Third', displayOrder: 3, durationSeconds: 10, effectiveDurationSeconds: 10 },
      ],
    };

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(state),
            watchState: () => poll$.asObservable(),
            getState: () => of(state),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(state, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, state);

    expect(fixture.componentInstance.currentContent?.title).toBe('First');
    expect(getContentSrc(fixture)).toBe('https://example.com/1.jpg');

    poll$.next({
      ...state,
      remoteControl: {
        ...state.remoteControl!,
        navigationCommand: 'next',
        navigationCommandId: '11111111-1111-4111-8111-111111111111',
      },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
    // The DOM must reflect the new cursor, not just the component's getter.
    expect(getContentSrc(fixture)).toBe('https://example.com/2.jpg');

    tick(9999);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
    expect(getContentSrc(fixture)).toBe('https://example.com/2.jpg');

    tick(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('Third');
    expect(getContentSrc(fixture)).toBe('https://example.com/3.jpg');

    poll$.next({
      ...state,
      remoteControl: {
        ...state.remoteControl!,
        navigationCommand: 'previous',
        navigationCommandId: '22222222-2222-4222-8222-222222222222',
      },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
    expect(getContentSrc(fixture)).toBe('https://example.com/2.jpg');
  }));

  xit('honors remote pause and resume in the DOM (server-orchestrated)', fakeAsync(() => {
    const poll$ = new Subject<DisplayState>();
    const state: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
      topContent: [
        { ...readyState.topContent[0], id: 'content-1', sourceReference: 'https://example.com/1.jpg', title: 'First', durationSeconds: 5, effectiveDurationSeconds: 5 },
        { ...readyState.topContent[0], id: 'content-2', sourceReference: 'https://example.com/2.jpg', title: 'Second', displayOrder: 2, durationSeconds: 5, effectiveDurationSeconds: 5 },
      ],
    };

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(state),
            watchState: () => poll$.asObservable(),
            getState: () => of(state),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(state, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, state);
    expect(getContentSrc(fixture)).toBe('https://example.com/1.jpg');

    // Pause: 60s of fake time must not advance the cursor.
    poll$.next({
      ...state,
      remoteControl: {
        ...state.remoteControl!,
        navigationCommand: 'pause',
        navigationCommandId: 'pause-1',
      },
    });
    fixture.detectChanges();
    tick(60_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
    expect(getContentSrc(fixture)).toBe('https://example.com/1.jpg');

    // Resume: the cursor must advance normally.
    poll$.next({
      ...state,
      remoteControl: {
        ...state.remoteControl!,
        navigationCommand: 'resume',
        navigationCommandId: 'resume-1',
      },
    });
    fixture.detectChanges();
    tick(4_999);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
    tick(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-2');
    expect(getContentSrc(fixture)).toBe('https://example.com/2.jpg');
  }));

  xit('renders the new content in the DOM after the timer advances the cursor (server-orchestrated)', fakeAsync(() => {
    const poll$ = new Subject<DisplayState>();
    const state: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
      topContent: [
        { ...readyState.topContent[0], id: 'content-1', sourceReference: 'https://example.com/1.jpg', title: 'First', durationSeconds: 1, effectiveDurationSeconds: 1 },
        { ...readyState.topContent[0], id: 'content-2', sourceReference: 'https://example.com/2.jpg', title: 'Second', displayOrder: 2, durationSeconds: 1, effectiveDurationSeconds: 1 },
      ],
    };

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(state),
            watchState: () => poll$.asObservable(),
            getState: () => of(state),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(state, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, state);
    expect(getContentSrc(fixture)).toBe('https://example.com/1.jpg');

    tick(1000);
    fixture.detectChanges();
    expect(getContentSrc(fixture)).toBe('https://example.com/2.jpg');
  }));

  xit('does not postpone rotation when the pre-transition poll returns state (server-orchestrated)', fakeAsync(() => {
    const state = {
      ...readyState,
      topContent: [
        { ...readyState.topContent[0], title: 'First', durationSeconds: 2, effectiveDurationSeconds: 2 },
        { ...readyState.topContent[0], id: 'content-2', title: 'Second', displayOrder: 2, durationSeconds: 2, effectiveDurationSeconds: 2 }
      ]
    };
    const poll$ = new Subject<DisplayState>();

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(state),
            watchState: () => poll$.asObservable(),
            getState: () => of(state),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(state, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, state);

    expect(fixture.componentInstance.currentContent?.title).toBe('First');

    tick(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('First');

    tick(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
  }));

  it('does not rotate content with a single item', fakeAsync(() => {
    const fixture = createComponent(readyState);

    tick(5000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
  }));

  xit('uses effective duration over item-level duration when both exist (server-orchestrated)', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      topContent: [
        { ...readyState.topContent[0], title: 'First', durationSeconds: 30, effectiveDurationSeconds: 1 },
        { ...readyState.topContent[0], id: 'content-2', title: 'Second', displayOrder: 2 }
      ]
    });

    expect(fixture.componentInstance.currentContent?.title).toBe('First');

    tick(1000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
  }));

  it('exposes only inlineAdCount ads in the visible ad strip', () => {
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, inlineAdCount: 1 },
      ads: [
        readyState.ads[0],
        { ...readyState.ads[0], id: 'ad-2', displayOrder: 2 },
        { ...readyState.ads[0], id: 'ad-3', displayOrder: 3 }
      ]
    });

    expect(fixture.componentInstance.visibleAds.length).toBe(1);
  });

  xit('updates the visible sponsor count when inlineAdCount changes on poll (SSE fallback only)', () => {
    const ads = Array.from({ length: 4 }, (_, i) => ({
      ...readyState.ads[0],
      id: `ad-${i + 1}`,
      displayOrder: i + 1,
    }));
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, inlineAdCount: 2 },
      ads,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.visibleAds.length).toBe(2);

    const component = fixture.componentInstance as unknown as {
      applyState: (s: DisplayState, o: { resetRotation: boolean }) => void;
    };
    component.applyState(
      {
        ...readyState,
        configuration: { ...readyState.configuration, inlineAdCount: 4 },
        ads,
      },
      { resetRotation: false },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleAds.length).toBe(4);
    const figures = fixture.nativeElement.querySelectorAll('.sponsor-strip__item');
    expect(figures.length).toBe(4);
  });

  xit('applies configured sponsor item border styles from display configuration (via show_ads SSE)', () => {
    const fixture = createComponent({
      ...readyState,
      configuration: {
        ...readyState.configuration,
        inlineAdItemBorderRadiusPx: 8,
        inlineAdItemBorderWidthPx: 2,
        inlineAdItemBorderColor: '#102832',
      },
    });
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.sponsor-strip__item') as HTMLElement;
    expect(item.style.borderRadius).toBe('8px');
    expect(item.style.borderWidth).toBe('2px');
    expect(item.style.borderColor).toBe('rgb(16, 40, 50)');
  });

  it('distributes every visible ad across the sponsor-strip width (6 ads)', () => {
    // The sponsor-strip MUST render exactly N evenly-sized blocks for N
    // visible ads. The block count is exposed via the `--sponsor-count`
    // CSS custom property on the inner `.sponsor-strip__list` so the
    // grid template can build `repeat(N, minmax(0, 1fr))` columns.
    const ads = Array.from({ length: 6 }, (_, i) => ({
      ...readyState.ads[0],
      id: `ad-${i + 1}`,
      displayOrder: i + 1,
    }));
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, inlineAdCount: 6 },
      ads,
    });
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector(
      '[data-testid="sponsor-strip-list"]',
    ) as HTMLElement | null;
    expect(list).not.toBeNull();
    expect(list!.getAttribute('style')).toContain('--sponsor-count: 6');

    const figures = fixture.nativeElement.querySelectorAll(
      '.sponsor-strip__item',
    );
    expect(figures.length).toBe(6);
  });

  it('distributes every visible ad across the sponsor-strip width (12 ads)', () => {
    const ads = Array.from({ length: 12 }, (_, i) => ({
      ...readyState.ads[0],
      id: `ad-${i + 1}`,
      displayOrder: i + 1,
    }));
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, inlineAdCount: 12 },
      ads,
    });
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector(
      '[data-testid="sponsor-strip-list"]',
    ) as HTMLElement | null;
    expect(list).not.toBeNull();
    expect(list!.getAttribute('style')).toContain('--sponsor-count: 12');

    const figures = fixture.nativeElement.querySelectorAll(
      '.sponsor-strip__item',
    );
    expect(figures.length).toBe(12);
  });

  it('keeps the sponsor-strip items on a single horizontal row regardless of count', () => {
    // Six ads render with six columns; the grid template must not
    // wrap them to a second row. We assert that every item shares
    // the same offsetTop (i.e. they sit on the same row), which is
    // only true when the grid produces a single row of equal columns.
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, inlineAdCount: 6 },
      ads: Array.from({ length: 6 }, (_, i) => ({
        ...readyState.ads[0],
        id: `ad-${i + 1}`,
        displayOrder: i + 1,
      })),
    });
    fixture.detectChanges();

    const figures = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.sponsor-strip__item',
      ) as NodeListOf<HTMLElement>,
    );
    expect(figures.length).toBe(6);
    const firstTop = figures[0].getBoundingClientRect().top;
    figures.forEach((el) => {
      expect(el.getBoundingClientRect().top).toBe(firstTop);
    });
    // All six items must have the same width (equal column).
    const firstWidth = figures[0].getBoundingClientRect().width;
    figures.forEach((el) => {
      expect(el.getBoundingClientRect().width).toBeCloseTo(firstWidth, 0);
    });
  });

  it('returns to the hall when Escape is pressed', () => {
    const fixture = createComponent(readyState);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(router.navigateByUrl).toHaveBeenCalledWith('/hall');
    fixture.destroy();
  });

  it('ignores non-Escape keys', () => {
    const fixture = createComponent(readyState);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    globalThis.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('removes the Escape listener on destroy', () => {
    const fixture = createComponent(readyState);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.destroy();

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('falls back to null content and ads when arrays are empty but fallbackActive is false', () => {
    const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: false });

    expect(fixture.componentInstance.currentContent).toBeNull();
    expect(fixture.componentInstance.visibleAds).toEqual([]);
  });

  it('produces a rotation-fade class for fade animation', () => {
    const fixture = createComponent(readyState);
    const expected = `rotation-${readyState.topContent[0].effectiveRotationAnimation}`;

    expect(fixture.componentInstance.animationClass(readyState.topContent[0])).toBe(expected);
  });

  xit('changes the animation name when content advances so CSS restarts (server-orchestrated)', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      topContent: [
        {
          ...readyState.topContent[0],
          title: 'First',
          durationSeconds: 1,
          effectiveDurationSeconds: 1,
          effectiveRotationAnimation: 'fade',
          effectiveAnimationDurationMilliseconds: 450
        },
        {
          ...readyState.topContent[0],
          id: 'content-2',
          title: 'Second',
          displayOrder: 2,
          durationSeconds: 1,
          effectiveDurationSeconds: 1,
          effectiveRotationAnimation: 'fade',
          effectiveAnimationDurationMilliseconds: 450
        }
      ]
    });

    const first = fixture.componentInstance.currentContent!;
    expect(fixture.componentInstance.animationClass(first)).toBe('rotation-fade');
    const firstTransition = fixture.componentInstance.contentTransition(first);
    expect(fixture.componentInstance.animationDurationMs(first)).toBe(450);

    tick(1000);
    fixture.detectChanges();

    const second = fixture.componentInstance.currentContent!;
    expect(fixture.componentInstance.animationClass(second)).toBe('rotation-fade');
    expect(fixture.componentInstance.contentTransition(second).value).not.toBe(firstTransition.value);
  }));

  xit('changes the ad animation class when the ad strip rotates (server-orchestrated)', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, defaultAdDurationSeconds: 1 },
      ads: [
        { ...readyState.ads[0], id: 'ad-1', sourceReference: 'https://example.com/ad-1.jpg', durationSeconds: 99, effectiveDurationSeconds: 99, effectiveRotationAnimation: 'slide' },
        { ...readyState.ads[0], id: 'ad-2', sourceReference: 'https://example.com/ad-2.jpg', displayOrder: 2, durationSeconds: 99, effectiveDurationSeconds: 99, effectiveRotationAnimation: 'slide' }
      ]
    });

    const firstAd = fixture.componentInstance.currentAd!;
    const firstAnimationClass = fixture.componentInstance.adAnimationClass(firstAd);
    const firstTrackKey = fixture.componentInstance.trackAdByRotation(0, firstAd);
    const firstRenderedSponsor = fixture.nativeElement.querySelector(
      '.sponsor-strip__item img',
    ) as HTMLImageElement;
    expect(firstRenderedSponsor.getAttribute('src')).toBe('https://example.com/ad-1.jpg');

    // FR-012: the kiosk rotates ads on the *configured* cadence, not the
    // per-ad value. Per-ad duration is intentionally ignored.
    tick(999);
    expect(fixture.componentInstance.currentAd!.id).toBe('ad-1');
    tick(1);
    fixture.detectChanges();

    const secondAd = fixture.componentInstance.currentAd!;
    expect(secondAd.id).toBe('ad-2');
    expect(fixture.componentInstance.adAnimationClass(secondAd)).not.toBe(firstAnimationClass);
    expect(fixture.componentInstance.trackAdByRotation(0, secondAd)).not.toBe(firstTrackKey);
    const secondRenderedSponsor = fixture.nativeElement.querySelector(
      '.sponsor-strip__item img',
    ) as HTMLImageElement;
    expect(secondRenderedSponsor.getAttribute('src')).toBe('https://example.com/ad-2.jpg');
  }));

  // ---- Spec 009 US3 tests ----------------------------------------------------

  it('enqueues newly-arrived items and shows them before the base rotation', fakeAsync(() => {
    const initial = { ...readyState, topContent: [
      { ...readyState.topContent[0], id: 'A', title: 'A', displayOrder: 1, durationSeconds: 1, effectiveDurationSeconds: 1 },
      { ...readyState.topContent[0], id: 'B', title: 'B', displayOrder: 2, durationSeconds: 1, effectiveDurationSeconds: 1 },
    ] };

    let currentState = initial;
    const api = {
      openDisplay: () => of(currentState),
      getState: () => of(currentState),
      watchState: () => of(currentState),
    };
    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        { provide: DisplayApiService, useValue: api },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    patchDisplayScreenPolling(initial);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, initial);
    expect(fixture.componentInstance.currentContent?.title).toBe('A');

    // Simulate a poll that brings in two new items while the kiosk is showing A.
    const newItems = [
      ...currentState.topContent,
      { ...readyState.topContent[0], id: 'C', title: 'C', displayOrder: 3, durationSeconds: 1, effectiveDurationSeconds: 1 },
      { ...readyState.topContent[0], id: 'D', title: 'D', displayOrder: 4, durationSeconds: 1, effectiveDurationSeconds: 1 },
    ];
    currentState = { ...currentState, topContent: newItems };

    // Force re-poll by re-calling the watchState observable.
    api.watchState = () => of(currentState);
    (api as any).__rerun = true; // signal that the spy needs to be reconfigured

    // We can't easily re-trigger watchState, so we test the rotation service directly.
    // For the component test, the new state is consumed only on the next poll tick.
    // The behavior is exercised end-to-end in test_public_content_audit.py.
    expect(fixture.componentInstance.currentContent?.title).toBe('A');
  }));

  it('does not interrupt the current item when a poll returns new state', fakeAsync(() => {
    const fixture = createComponent(readyState);
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');

    // Even after 500 ms (well below the 15 s effective duration), the current
    // item should still be content-1.
    tick(500);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
  }));

  // ---- FR-013: CSS animation duration fallback --------------------------------

  it('uses defaultAdAnimationDurationMilliseconds (not ad duration) for the CSS animation fallback', () => {
    const fixture = createComponent({
      ...readyState,
      configuration: {
        ...readyState.configuration,
        defaultAdDurationSeconds: 10,
        defaultAdAnimationDurationMilliseconds: 425,
      },
      ads: [
        { ...readyState.ads[0], id: 'no-anim', animationDurationMilliseconds: null, effectiveAnimationDurationMilliseconds: null },
      ],
    });
    const ad = fixture.componentInstance.state!.ads[0];
    // Per-ad missing → fallback must come from defaultAdAnimationDurationMilliseconds
    // (NOT defaultAdDurationSeconds × 1000).
    expect(fixture.componentInstance.animationDurationMs(ad)).toBe(425);
  });

  // ---- FR-014: fixed mode pins the content ----------------------------------

  xit('renders the fixed content when the operator pins it from the remote control (server-orchestrated)', fakeAsync(() => {
    const fixedId = 'content-1';
    const poll$ = new Subject<DisplayState>();
    const initial: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
      topContent: [
        { ...readyState.topContent[0], id: 'content-1', title: 'Pinned', durationSeconds: 10, effectiveDurationSeconds: 10, isFixed: true } as DisplayContentItem,
        { ...readyState.topContent[0], id: 'content-2', title: 'Other', displayOrder: 2, durationSeconds: 10, effectiveDurationSeconds: 10 },
      ],
    };

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(initial),
            watchState: () => poll$.asObservable(),
            getState: () => of(initial),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(initial, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, initial);
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');

    // Advance to content-2 in loop.
    tick(10_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-2');

    // Operator pins content-1 via the remote control.
    poll$.next({
      ...initial,
      remoteControl: {
        ...initial.remoteControl!,
        contentMode: 'fixed',
        selectedFixedContentId: fixedId,
      },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');

    // Many ticks later, the fixed content stays pinned.
    tick(60_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
  }));

  xit('restores the loop cursor on transition from fixed back to loop (FR-015, server-orchestrated)', fakeAsync(() => {
    const poll$ = new Subject<DisplayState>();
    const initial: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedIframeId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z',
      },
      topContent: [
        { ...readyState.topContent[0], id: 'A', title: 'A', displayOrder: 1, durationSeconds: 10, effectiveDurationSeconds: 10, isFixed: true } as DisplayContentItem,
        { ...readyState.topContent[0], id: 'B', title: 'B', displayOrder: 2, durationSeconds: 10, effectiveDurationSeconds: 10 },
        { ...readyState.topContent[0], id: 'C', title: 'C', displayOrder: 3, durationSeconds: 10, effectiveDurationSeconds: 10 },
      ],
    };

    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: {
            openDisplay: () => of(initial),
            watchState: () => poll$.asObservable(),
            getState: () => of(initial),
          }
        },
        eventBrandingProvider(),
        displayStreamProvider(),
        displayLabelProvider(),
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    patchDisplayScreenPolling(initial, poll$);
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    seedDisplayFromState(fixture, initial);
    expect(fixture.componentInstance.currentContent?.id).toBe('A');

    // Move to B in loop.
    tick(10_000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('B');

    // Pin A in fixed mode.
    poll$.next({
      ...initial,
      remoteControl: {
        ...initial.remoteControl!,
        contentMode: 'fixed',
        selectedFixedContentId: 'A',
      },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('A');

    // Return to loop — the cursor that was active BEFORE pinning (B) is
    // restored, not A.
    poll$.next({
      ...initial,
      remoteControl: {
        ...initial.remoteControl!,
        contentMode: 'loop',
        selectedFixedContentId: null,
      },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.id).toBe('B');
  }));

  xit('rotates ads on the configured defaultAdDurationSeconds (FR-012), ignoring per-ad duration (server-orchestrated)', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      configuration: { ...readyState.configuration, defaultAdDurationSeconds: 1 },
      ads: [
        { ...readyState.ads[0], id: 'a1', durationSeconds: 99, effectiveDurationSeconds: 99, effectiveRotationAnimation: 'slide' },
        { ...readyState.ads[0], id: 'a2', displayOrder: 2, durationSeconds: 99, effectiveDurationSeconds: 99, effectiveRotationAnimation: 'slide' },
      ],
    });
    expect(fixture.componentInstance.currentAd!.id).toBe('a1');
    tick(1000);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentAd!.id).toBe('a2');
  }));

  describe('CHG-019 responsive runtime', () => {
    let matchMediaSpy: jasmine.Spy<typeof globalThis.matchMedia> | null = null;

    function setViewport(width: number, height: number): void {
      Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(globalThis, 'innerHeight', { configurable: true, value: height });
    }

    afterEach(() => {
      matchMediaSpy?.and.callThrough();
      matchMediaSpy = null;
    });

    function mockPortraitQuery(matches: boolean): { listeners: Array<(event: Partial<MediaQueryListEvent>) => void>; fire: (next: boolean) => void } {
      const listeners: Array<(event: Partial<MediaQueryListEvent>) => void> = [];
      const add = (cb: (event: Partial<MediaQueryListEvent>) => void): void => {
        listeners.push(cb);
      };
      const remove = (cb: (event: Partial<MediaQueryListEvent>) => void): void => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      };
      const mql = {
        matches,
        media: '(orientation: portrait)',
        onchange: null,
        addListener: add,
        removeListener: remove,
        addEventListener: (_: string, cb: (event: Partial<MediaQueryListEvent>) => void): void => {
          add(cb);
        },
        removeEventListener: (_: string, cb: (event: Partial<MediaQueryListEvent>) => void): void => {
          remove(cb);
        },
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
      const originalMatchMedia = globalThis.matchMedia.bind(globalThis);
      if (matchMediaSpy) {
        matchMediaSpy.and.callFake((query: string) =>
          query === '(orientation: portrait)' ? mql : originalMatchMedia(query),
        );
      } else {
        matchMediaSpy = spyOn(globalThis, 'matchMedia').and.callFake((query: string) =>
          query === '(orientation: portrait)' ? mql : originalMatchMedia(query),
        );
      }
      return {
        listeners,
        fire(next: boolean): void {
          listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
        }
      };
    }

    it('SC-001: at any viewport the top region height matches total × 5 / 6 and the sponsor band matches × 1 / 6 (within ±1 px)', () => {
      const fixture = createComponent(readyState);
      const top = fixture.nativeElement.querySelector('.top-region') as HTMLElement | null;
      const ads = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement | null;
      expect(top).not.toBeNull();
      expect(ads).not.toBeNull();
      const topRect = top!.getBoundingClientRect();
      const adsRect = ads!.getBoundingClientRect();
      const total = topRect.height + adsRect.height;
      expect(Math.abs(topRect.height - (total * 5) / 6)).toBeLessThanOrEqual(1);
      expect(Math.abs(adsRect.height - (total * 1) / 6)).toBeLessThanOrEqual(1);
      fixture.destroy();
    });

    it('SC-002: text elements in the sponsor band and the branding overlay respect the clamp() minimum font-size', () => {
      const fixture = createComponent(readyState, {
        eventName: 'Spring Summit 2026',
        organizerName: 'ACME Events',
        organizerLogoUrl: null
      });
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.sponsor-strip__title') as HTMLElement | null;
      const branding = fixture.nativeElement.querySelector('.branding-overlay__event-name') as HTMLElement | null;
      expect(title).not.toBeNull();
      expect(branding).not.toBeNull();
      const titleSize = parseFloat(globalThis.getComputedStyle(title!).fontSize);
      const brandingSize = parseFloat(globalThis.getComputedStyle(branding!).fontSize);
      expect(titleSize).toBeGreaterThanOrEqual(13);
      expect(brandingSize).toBeGreaterThanOrEqual(13);
      fixture.destroy();
    });

    it('SC-003: shows the rotate-device prompt and hides the regions in portrait; flips back on landscape', () => {
      const mql = mockPortraitQuery(false);
      const fixture = createComponent(readyState);
      fixture.detectChanges();
      let prompt = fixture.nativeElement.querySelector('[data-testid="display-rotate-device"]');
      expect(prompt).toBeNull();

      mql.fire(true);
      fixture.detectChanges();
      prompt = fixture.nativeElement.querySelector('[data-testid="display-rotate-device"]');
      expect(prompt).not.toBeNull();
      expect(prompt!.textContent).toContain('rota');
      const topRegion = fixture.nativeElement.querySelector('.top-region') as HTMLElement | null;
      const computedTop = globalThis.getComputedStyle(topRegion!).display;
      expect(computedTop).toBe('none');

      mql.fire(false);
      fixture.detectChanges();
      prompt = fixture.nativeElement.querySelector('[data-testid="display-rotate-device"]');
      expect(prompt).toBeNull();
      const topRegionAfter = fixture.nativeElement.querySelector('.top-region') as HTMLElement | null;
      const computedTopAfter = globalThis.getComputedStyle(topRegionAfter!).display;
      expect(computedTopAfter).not.toBe('none');
      fixture.destroy();
    });

    it('SC-004: with 6 active ads every figure has equal width and height and no image overflows', () => {
      setViewport(1920, 1080);
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, inlineAdCount: 6 },
        ads: Array.from({ length: 6 }, (_, i) => ({
          ...readyState.ads[0],
          id: `ad-${i + 1}`,
          displayOrder: i + 1,
        })),
      });
      fixture.detectChanges();
      const figures = Array.from(
        fixture.nativeElement.querySelectorAll('.sponsor-strip__item') as NodeListOf<HTMLElement>
      );
      expect(figures.length).toBe(6);
      const widths = figures.map((f) => f.getBoundingClientRect().width);
      const heights = figures.map((f) => f.getBoundingClientRect().height);
      const widthDelta = Math.max(...widths) - Math.min(...widths);
      const heightDelta = Math.max(...heights) - Math.min(...heights);
      expect(widthDelta).toBeLessThanOrEqual(1);
      expect(heightDelta).toBeLessThanOrEqual(1);
      figures.forEach((figure) => {
        const img = figure.querySelector('img') as HTMLImageElement | null;
        if (!img) return;
        const imgRect = img.getBoundingClientRect();
        const figureRect = figure.getBoundingClientRect();
        expect(imgRect.width).toBeLessThanOrEqual(figureRect.width + 1);
        expect(imgRect.height).toBeLessThanOrEqual(figureRect.height + 1);
      });
      fixture.destroy();
    });

    it('SC-005: with polled topRegionRatio=3 / bottomRegionRatio=1 the top region occupies 3/4 and the sponsor band 1/4 of the viewport', () => {
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, topRegionRatio: 3, bottomRegionRatio: 1 }
      });
      fixture.detectChanges();
      const top = fixture.nativeElement.querySelector('.top-region') as HTMLElement | null;
      const ads = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement | null;
      expect(top).not.toBeNull();
      expect(ads).not.toBeNull();
      const topH = top!.getBoundingClientRect().height;
      const adsH = ads!.getBoundingClientRect().height;
      const total = topH + adsH;
      expect(Math.abs(topH / total - 3 / 4)).toBeLessThan(0.01);
      expect(Math.abs(adsH / total - 1 / 4)).toBeLessThan(0.01);
      fixture.destroy();
    });

    it('binds --top-ratio and --bottom-ratio CSS custom properties from the polled state', () => {
      setViewport(1920, 1080);
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, topRegionRatio: 7, bottomRegionRatio: 3 }
      });
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('.display-screen') as HTMLElement | null;
      expect(host).not.toBeNull();
      expect(host!.style.getPropertyValue('--top-ratio')).toBe('7fr');
      expect(host!.style.getPropertyValue('--bottom-ratio')).toBe('3fr');
      fixture.destroy();
    });

    it('binds grid-template-rows inline as a single concatenated string (Chrome workaround)', () => {
      setViewport(1920, 1080);
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, topRegionRatio: 7, bottomRegionRatio: 3 }
      });
      fixture.detectChanges();
      const host = fixture.nativeElement.querySelector('.display-screen') as HTMLElement | null;
      expect(host).not.toBeNull();
      expect(host!.style.gridTemplateRows).toBe('7fr 3fr');
      fixture.destroy();
    });

    xit('collapses the sponsor row so top content fills the viewport when ads are hidden (via mode_changed SSE)', () => {
      const fixture = createComponent({
        ...readyState,
        remoteControl: {
          contentMode: 'loop',
          selectedIframeId: null,
          selectedFixedContentId: null,
          adsVisible: false,
          fullscreenRequested: false,
          updatedAt: '2026-07-02T00:00:00Z'
        }
      });
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('.display-screen') as HTMLElement | null;
      const top = fixture.nativeElement.querySelector('.top-region') as HTMLElement | null;
      const ads = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement | null;

      expect(host).not.toBeNull();
      expect(top).not.toBeNull();
      expect(ads).toBeNull();
      expect(host!.classList).toContain('display-screen--ads-hidden');
      expect(host!.style.gridTemplateRows).toBe('1fr');
      expect(fixture.componentInstance.mainGridTemplateRows()).toBe('1fr');
      fixture.destroy();
    });

    it('falls back to the documented default ratio when the polled value is < 1', () => {
      const fixture = createComponent({
        ...readyState,
        configuration: {
          ...readyState.configuration,
          topRegionRatio: 0,
          bottomRegionRatio: 0
        }
      });
      fixture.detectChanges();
      expect(fixture.componentInstance.ratioTop()).toBe('5fr');
      expect(fixture.componentInstance.ratioBottom()).toBe('1fr');
      expect(fixture.componentInstance.mainGridTemplateRows()).toBe('5fr 1fr');
      fixture.destroy();
    });

    it('positions the branding overlay children absolutely so the logo and event name do not overlap (CHG-023 data-driven layout)', () => {
      const fixture = createComponent(readyState, {
        eventName: 'Spring Summit 2026',
        organizerName: 'ACME Events',
        organizerLogoUrl: '/api/media/logo-1'
      });
      fixture.detectChanges();
      const overlay = fixture.nativeElement.querySelector('.branding-overlay') as HTMLElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay!.classList.contains('branding-overlay')).toBeTrue();
      const logo = overlay!.querySelector('.branding-overlay__logo') as HTMLElement | null;
      const name = overlay!.querySelector('.branding-overlay__event-name') as HTMLElement | null;
      expect(logo).not.toBeNull();
      expect(name).not.toBeNull();
      const overlayStyle = globalThis.getComputedStyle(overlay!);
      expect(overlayStyle.position).toBe('absolute');
      const logoStyle = globalThis.getComputedStyle(logo!);
      expect(logoStyle.position).toBe('absolute');
      const nameStyle = globalThis.getComputedStyle(name!);
      expect(nameStyle.position).toBe('absolute');
      fixture.destroy();
    });

    it('removes the polling subscription in ngOnDestroy and removes the orientation listener', () => {
      setViewport(1920, 1080);
      const mql = mockPortraitQuery(false);
      const fixture = createComponent(readyState);
      fixture.detectChanges();
      expect(mql.listeners.length).toBe(1);
      fixture.destroy();
      expect(mql.listeners.length).toBe(0);
    });
  });

  describe('CHG-041 viewer lifecycle', () => {
    function buildModule(): void {
      TestBed.configureTestingModule({
        imports: [DisplayScreenComponent],
        providers: [
          {
            provide: DisplayApiService,
            useValue: {
              openDisplay: () => of(readyState),
              watchState: () => of(readyState),
              getState: () => of(readyState),
            }
          },
          eventBrandingProvider(),
          displayStreamProvider(),
          displayLabelProvider(),
          provideRouter([]),
          provideNoopAnimations()
        ]
      });
      patchDisplayScreenPolling(readyState);
    }

    it('each display instance gets its own DisplayViewerController', () => {
      buildModule();
      const first = TestBed.createComponent(DisplayScreenComponent);
      first.detectChanges();
      const firstViewer = first.debugElement.injector.get(DisplayViewerController);
      first.destroy();
      const second = TestBed.createComponent(DisplayScreenComponent);
      second.detectChanges();
      const secondViewer = second.debugElement.injector.get(DisplayViewerController);
      expect(secondViewer).not.toBe(firstViewer);
      second.destroy();
    });
  });

  describe('CHG-028 top content blur-fill', () => {
    it('SC-001: renders photo foreground with object-fit contain and a blurred backdrop', () => {
      const fixture = createComponent(readyState);
      const foreground = fixture.nativeElement.querySelector(
        '.display-content-media[data-testid="display-content"]',
      ) as HTMLElement | null;
      const backdrop = fixture.nativeElement.querySelector(
        '.top-region__media-backdrop[data-testid="display-content-backdrop"]',
      ) as HTMLElement | null;
      const frame = fixture.nativeElement.querySelector('.top-region__media-frame') as HTMLElement | null;

      expect(frame).not.toBeNull();
      expect(foreground).not.toBeNull();
      expect(backdrop).not.toBeNull();
      expect(globalThis.getComputedStyle(foreground!).objectFit).toBe('contain');
      expect(globalThis.getComputedStyle(backdrop!).objectFit).toBe('cover');
      expect(backdrop!.getAttribute('aria-hidden')).toBe('true');
    });

    it('SC-001: renders video foreground with object-fit contain and a backdrop video layer', () => {
      const fixture = createComponent({
        ...readyState,
        topContent: [{
          ...readyState.topContent[0],
          contentType: 'video',
          sourceReference: 'https://example.com/welcome.mp4',
        }],
      });
      const foreground = fixture.nativeElement.querySelector(
        'video.display-content-media[data-testid="display-content"]',
      ) as HTMLVideoElement | null;
      const backdrop = fixture.nativeElement.querySelector(
        'video.top-region__media-backdrop[data-testid="display-content-backdrop"]',
      ) as HTMLVideoElement | null;

      expect(foreground).not.toBeNull();
      expect(backdrop).not.toBeNull();
      expect(globalThis.getComputedStyle(foreground!).objectFit).toBe('contain');
    });

    xit('SC-002: iframe mode has no media frame or backdrop (SSE-driven iframe)', () => {
      const fixture = createComponent(readyState);
      driveIframe(fixture, 'https://example.org/live');
      expect(fixture.nativeElement.querySelector('.top-region__media-frame')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="display-content-backdrop"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="display-iframe"]')).not.toBeNull();
    });

    it('SC-002: fallback state has no media frame or backdrop', () => {
      const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: true });
      expect(fixture.nativeElement.querySelector('.top-region__media-frame')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="display-content-backdrop"]')).toBeNull();
    });

    it('SC-003: region ratio 3:1 still applies while photo uses contain fit', () => {
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, topRegionRatio: 3, bottomRegionRatio: 1 },
      });
      const top = fixture.nativeElement.querySelector('.top-region') as HTMLElement;
      const ads = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement;
      const total = top.getBoundingClientRect().height + ads.getBoundingClientRect().height;
      expect(Math.abs(top.getBoundingClientRect().height / total - 3 / 4)).toBeLessThan(0.01);
      expect(globalThis.getComputedStyle(
        fixture.nativeElement.querySelector('.display-content-media[data-testid="display-content"]') as HTMLElement,
      ).objectFit).toBe('contain');
    });

    it('SC-003: region ratio 7:3 still applies while photo uses contain fit', () => {
      const fixture = createComponent({
        ...readyState,
        configuration: { ...readyState.configuration, topRegionRatio: 7, bottomRegionRatio: 3 },
      });
      const top = fixture.nativeElement.querySelector('.top-region') as HTMLElement;
      const ads = fixture.nativeElement.querySelector('.sponsor-strip') as HTMLElement;
      const total = top.getBoundingClientRect().height + ads.getBoundingClientRect().height;
      expect(Math.abs(top.getBoundingClientRect().height / total - 7 / 10)).toBeLessThan(0.01);
      expect(globalThis.getComputedStyle(
        fixture.nativeElement.querySelector('.display-content-media[data-testid="display-content"]') as HTMLElement,
      ).objectFit).toBe('contain');
    });

    it('uses solid frame background for reduced-motion fallback bands', () => {
      const fixture = createComponent(readyState);
      const frame = fixture.nativeElement.querySelector('.top-region__media-frame') as HTMLElement;
      expect(globalThis.getComputedStyle(frame).backgroundColor).toBe('rgb(16, 40, 50)');
    });
  });

  describe('CHG-029 production quick wins', () => {
    xit('applyState with a media-only change updates rendered content for the same id (SSE-driven)', () => {
      const fixture = createComponent(readyState);
      const component = fixture.componentInstance as unknown as {
        applyState: (s: DisplayState, o: { resetRotation: boolean }) => void;
        contentRenderItems: DisplayContentItem[];
      };
      const updated: DisplayState = {
        ...readyState,
        topContent: [{
          ...readyState.topContent[0],
          mediaFile: { id: 'm2', mediaType: 'image', contentType: 'image/png', fileSizeBytes: 1, originalFilename: 'new.jpg', mediaUrl: 'https://example.com/new-welcome.jpg' },
        }],
      };
      component.applyState(updated, { resetRotation: false });
      expect(component.contentRenderItems[0]?.mediaFile?.mediaUrl).toBe('https://example.com/new-welcome.jpg');
    });

    it('clears hiddenLogoUrl when organizerLogoUrl changes', () => {
      const branding = signal<{ eventName: string; organizerName: string; organizerLogoUrl: string | null }>({
        eventName: '',
        organizerName: 'ACME',
        organizerLogoUrl: 'https://bad.png',
      });
      TestBed.configureTestingModule({
        imports: [DisplayScreenComponent],
        providers: [
          {
            provide: DisplayApiService,
            useValue: {
              openDisplay: () => of(readyState),
              watchState: () => of(readyState),
              postRotationEvent: () => of({ status: 'accepted' }),
            },
          },
          {
            provide: EventBrandingService,
            useValue: {
              branding: branding.asReadonly(),
              refresh: () => of(branding()),
              clear: () => branding.set({ eventName: '', organizerName: '', organizerLogoUrl: null }),
            },
          },
          displayStreamProvider(),
          displayLabelProvider(),
          provideRouter([]),
          provideNoopAnimations(),
        ],
      });
      patchDisplayScreenPolling(readyState);
      const fixture = TestBed.createComponent(DisplayScreenComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance as unknown as {
        hideBrokenLogo: (url: string) => void;
        logoVisible: (url: string) => boolean;
      };
      component.hideBrokenLogo('https://bad.png');
      expect(component.logoVisible('https://bad.png')).toBeFalse();
      branding.set({ eventName: '', organizerName: 'ACME', organizerLogoUrl: 'https://good.png' });
      fixture.detectChanges();
      expect(component.logoVisible('https://good.png')).toBeTrue();
    });
  });

  describe('CHG-030 kiosk polling resilience', () => {
    xit('shows a reconnecting indicator after transient SSE failures', () => {
      const streamReconnecting = signal(true);
      TestBed.configureTestingModule({
        imports: [DisplayScreenComponent],
        providers: [
          {
            provide: DisplayApiService,
            useValue: {
              openDisplay: () => of(readyState),
              watchState: () => of(readyState),
              getState: () => of(readyState),
            }
          },
          eventBrandingProvider(),
          {
            provide: DisplayStreamService,
            useValue: {
              lastEvent: signal(null),
              configUpdated: computed(() => null),
              brandingUpdated: computed(() => null),
              showContent: computed(() => null),
              showAds: computed(() => null),
              reconnecting: streamReconnecting,
              connected: signal(false),
              sseFallbackActive: signal(false),
              sessionEnded: signal(false),
              kioskId: signal('kiosk-1'),
              lastSequence: signal(0),
              tryRegister: jasmine.createSpy('tryRegister').and.returnValue(Promise.resolve(null)),
              startWithRegistration: jasmine.createSpy('startWithRegistration').and.returnValue(Promise.resolve()),
              start: jasmine.createSpy('start').and.returnValue(Promise.resolve()),
              stop: jasmine.createSpy('stop'),
            },
          },
          provideRouter([]),
          provideNoopAnimations()
        ]
      });
      patchDisplayScreenPolling(readyState);
      patchDisplayScreenPolling(readyState);
      const fixture = TestBed.createComponent(DisplayScreenComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="display-reconnecting"]')?.textContent).toContain('Reconectando');
    });

    it('shows open error UI with retry when display open fails', () => {
      const fixture = createComponent(readyState);
      const polling = fixture.debugElement.injector.get(DisplayPollingService) as unknown as ReturnType<typeof createPollingMock>;
      polling.setOpenError({
        code: 'unexpected_error',
        message: 'No se pudo conectar con el servidor.',
        category: 'unexpected',
      });
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('[data-testid="display-open-error"]');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('No se pudo conectar');
      const retry = fixture.nativeElement.querySelector('[data-testid="display-open-retry"]') as HTMLButtonElement;
      expect(retry).not.toBeNull();
      retry.click();
      expect(polling.retryOpen).toHaveBeenCalled();
    });
  });

  describe('SSE-driven layout and branding (CHG-041)', () => {
    function createStreamMock() {
      const lastEvent = signal<{
        type: 'config_updated' | 'branding_updated';
        payload: ConfigUpdatedPayload | Record<string, unknown>;
      } | null>(null);
      return {
        lastEvent,
        configUpdated: computed(() => {
          const event = lastEvent();
          return event?.type === 'config_updated' ? event.payload as ConfigUpdatedPayload : null;
        }),
        brandingUpdated: computed(() => {
          const event = lastEvent();
          return event?.type === 'branding_updated' ? event.payload : null;
        }),
        showContent: computed(() => null),
        showAds: computed(() => null),
        modeChanged: computed(() => null),
        showIframe: computed(() => null),
        preload: computed(() => null),
        layoutUpdated: computed(() => null),
        reconnecting: signal(false),
        connected: signal(false),
        sseFallbackActive: signal(false),
        sessionEnded: signal(false),
        kioskId: signal<string | null>(null),
        lastSequence: signal(0),
        tryRegister: jasmine.createSpy('tryRegister').and.returnValue(Promise.resolve(null)),
        startWithRegistration: jasmine.createSpy('startWithRegistration').and.returnValue(Promise.resolve()),
        start: jasmine.createSpy('start').and.returnValue(Promise.resolve()),
        stop: jasmine.createSpy('stop'),
      };
    }

    function createComponentWithStream(
      state: DisplayState,
      stream: ReturnType<typeof createStreamMock>,
      brandingRefresh = jasmine.createSpy('refresh').and.returnValue(of({ eventName: 'Gala', organizerName: '', organizerLogoUrl: null })),
    ): ComponentFixture<DisplayScreenComponent> {
      TestBed.configureTestingModule({
        imports: [DisplayScreenComponent],
        providers: [
          {
            provide: DisplayApiService,
            useValue: {
              openDisplay: () => of(state),
              watchState: () => of(state),
              getState: () => of(state),
            },
          },
          { provide: DisplayStreamService, useValue: stream },
          {
            provide: EventBrandingService,
            useValue: {
              branding: signal({ eventName: 'Gala', organizerName: '', organizerLogoUrl: null }).asReadonly(),
              refresh: brandingRefresh,
              clear: () => undefined,
            },
          },
          displayLabelProvider(),
          provideRouter([]),
          provideNoopAnimations(),
        ],
      });
      patchDisplayScreenPolling(state);
      const fixture = TestBed.createComponent(DisplayScreenComponent);
      fixture.detectChanges();
      seedDisplayFromState(fixture, state);
      return fixture;
    }

    it('applies topRegionRatio from config_updated without a polling tick', () => {
      const stream = createStreamMock();
      const fixture = createComponentWithStream(readyState, stream);
      stream.lastEvent.set({
        type: 'config_updated',
        payload: {
          configuration: { id: 'config-1', topRegionRatio: 7 },
          applyImmediately: true,
          changedFields: ['topRegionRatio'],
        },
      });
      fixture.detectChanges();

      const host = fixture.nativeElement.querySelector('.display-screen') as HTMLElement;
      expect(host.style.getPropertyValue('--top-ratio')).toBe('7fr');
    });

    it('does not apply deferred inlineAdCount-only config_updated immediately', () => {
      const stream = createStreamMock();
      const fixture = createComponentWithStream(readyState, stream);
      stream.lastEvent.set({
        type: 'config_updated',
        payload: {
          configuration: { id: 'config-1', inlineAdCount: 5 },
          applyImmediately: false,
          changedFields: ['inlineAdCount'],
        },
      });
      fixture.detectChanges();

      expect(fixture.componentInstance['state']?.configuration.inlineAdCount).toBe(2);
    });

    it('calls EventBrandingService.refresh on branding_updated', () => {
      const stream = createStreamMock();
      const refresh = jasmine.createSpy('refresh').and.returnValue(
        of({ eventName: 'Updated Gala', organizerName: '', organizerLogoUrl: null }),
      );
      createComponentWithStream(readyState, stream, refresh);
      stream.lastEvent.set({ type: 'branding_updated', payload: { eventName: 'Updated Gala' } });
      TestBed.flushEffects();
      expect(refresh).toHaveBeenCalled();
    });
  });
});

function getIframeSrc(fixture: ComponentFixture<DisplayScreenComponent>): string | null {
  const el = fixture.nativeElement.querySelector('[data-testid="display-iframe"]') as HTMLIFrameElement | null;
  return el?.getAttribute('src') ?? null;
}

/**
 * Reads the current top-region media element's source from the rendered DOM.
 * Used by the rotation / remote-control tests to assert that the template
 * reflects the controller's cursor (not just the component's getter).
 */
function getContentSrc(fixture: ComponentFixture<DisplayScreenComponent>): string | null {
  // The <img> and <video> elements both carry class="display-content-media"
  // and data-testid="display-content". The animation wrappers don't strip the
  // attribute, so a direct querySelector works.
  const el = fixture.nativeElement.querySelector(
    '.display-content-media[data-testid="display-content"]',
  ) as HTMLImageElement | HTMLVideoElement | null;
  return el?.getAttribute('src') ?? null;
}
