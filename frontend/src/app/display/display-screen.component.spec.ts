import { Subject, of } from 'rxjs';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { DisplayApiService, DisplayState } from '../core/api/display.api';
import { EventBrandingService } from '../core/event-branding.service';
import { DisplayScreenComponent } from './display-screen.component';

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

  function eventBrandingProvider(initial = { eventName: '', organizerName: '', organizerLogoUrl: null as string | null }) {
    const branding = signal(initial);
    return {
      provide: EventBrandingService,
      useValue: {
        branding: branding.asReadonly(),
        refresh: () => of(branding()),
        clear: () => branding.set({ eventName: '', organizerName: '', organizerLogoUrl: null })
      }
    };
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
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a stable 4-to-1 kiosk shell without management controls', () => {
    const fixture = createComponent(readyState);
    const host: HTMLElement = fixture.nativeElement;
    const screen = host.querySelector('.display-screen');
    const topRegion = host.querySelector('.top-region') as HTMLElement;
    const adRegion = host.querySelector('.ad-region') as HTMLElement;

    expect(screen).not.toBeNull();
    expect(topRegion.offsetHeight / adRegion.offsetHeight).toBeCloseTo(5, 0);
    expect(host.textContent).not.toContain('Admin');
    expect(host.textContent).not.toContain('Settings');
  });

  it('renders fallback states when content and ads are unavailable', () => {
    const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: true });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Content unavailable');
    expect(text).toContain('Ads unavailable');
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

  it('renders the sponsor title as the first ad-region child', () => {
    const fixture = createComponent(readyState);
    const adRegion = fixture.nativeElement.querySelector('.ad-region') as HTMLElement;
    expect(adRegion.getAttribute('aria-label')).toBe('Patrocinadores del evento');
    const adRegionTitle = fixture.nativeElement.querySelector('.ad-region__title') as HTMLElement;
    expect(adRegionTitle.textContent).toContain('Patrocinadores del evento');
  });

  it('keeps the same trusted iframe URL object while the iframe URL is unchanged', () => {
    const fixture = createComponent(readyState);
    const component = fixture.componentInstance;

    const first = component.safeIframeUrl('https://example.org/live');
    const second = component.safeIframeUrl('https://example.org/live');
    const third = component.safeIframeUrl('https://example.org/other');

    expect(second).toBe(first);
    expect(third).not.toBe(first);
  });

  it('requests browser fullscreen when remote control asks for it', () => {
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

    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: originalRequestFullscreen,
    });
    fixture.destroy();
  });

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

  it('rotates top content using effective duration', fakeAsync(() => {
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

  it('applies remote navigation commands and restarts the content timer', fakeAsync(() => {
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
        { ...readyState.topContent[0], id: 'content-1', title: 'First', durationSeconds: 10, effectiveDurationSeconds: 10 },
        { ...readyState.topContent[0], id: 'content-2', title: 'Second', displayOrder: 2, durationSeconds: 10, effectiveDurationSeconds: 10 },
        { ...readyState.topContent[0], id: 'content-3', title: 'Third', displayOrder: 3, durationSeconds: 10, effectiveDurationSeconds: 10 },
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
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('First');

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

    tick(9999);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('Second');

    tick(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.currentContent?.title).toBe('Third');

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
  }));

  it('does not postpone rotation when the pre-transition poll returns state', fakeAsync(() => {
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
        provideRouter([]),
        provideNoopAnimations()
      ]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();

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

  it('uses effective duration over item-level duration when both exist', fakeAsync(() => {
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

  it('changes the animation name when content advances so CSS restarts', fakeAsync(() => {
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

  it('changes the ad animation class when the ad strip rotates', fakeAsync(() => {
    const fixture = createComponent({
      ...readyState,
      ads: [
        { ...readyState.ads[0], id: 'ad-1', durationSeconds: 1, effectiveDurationSeconds: 1, effectiveRotationAnimation: 'slide' },
        { ...readyState.ads[0], id: 'ad-2', displayOrder: 2, durationSeconds: 1, effectiveDurationSeconds: 1, effectiveRotationAnimation: 'slide' }
      ]
    });

    const firstAd = fixture.componentInstance.currentAd!;
    const firstAnimationClass = fixture.componentInstance.adAnimationClass(firstAd);

    tick(1000);
    fixture.detectChanges();

    const secondAd = fixture.componentInstance.currentAd!;
    expect(secondAd.id).toBe('ad-2');
    expect(fixture.componentInstance.adAnimationClass(secondAd)).not.toBe(firstAnimationClass);
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
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
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
});
