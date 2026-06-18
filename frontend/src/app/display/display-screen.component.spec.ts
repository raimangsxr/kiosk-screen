import { of } from 'rxjs';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { DisplayApiService, DisplayState } from './display-api.service';
import { DisplayScreenComponent } from './display-screen.component';

describe('DisplayScreenComponent', () => {
  const readyState: DisplayState = {
    configuration: {
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 4,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 15,
      defaultAdDurationSeconds: 10,
      defaultTopRotationAnimation: 'fade',
      defaultAdRotationAnimation: 'slide',
      defaultTopAnimationDurationMilliseconds: 300,
      defaultAdAnimationDurationMilliseconds: 300,
      inlineAdCount: 2,
      remoteControlPollingSeconds: 3,
      configuredEventDurationMinutes: 120,
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
      clientId: 'client-1',
      label: 'Sponsor',
      sourceReference: 'https://example.com/ad.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 10,
      effectiveDurationSeconds: 10,
      effectiveRotationAnimation: 'slide'
    }],
    fallbackActive: false
  };

  function createComponent(state: DisplayState, nextState: DisplayState = state): ComponentFixture<DisplayScreenComponent> {
    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: { openDisplay: () => of(state), getState: () => of(nextState) }
        },
        provideRouter([])
      ]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    return fixture;
  }

  function createComponentWithStateSequence(states: DisplayState[]): {
    fixture: ComponentFixture<DisplayScreenComponent>;
    getState: jasmine.Spy<() => ReturnType<DisplayApiService['getState']>>;
  } {
    const [initialState, ...pollStates] = states;
    const getState = jasmine.createSpy('getState').and.callFake(() => of(pollStates.shift() ?? states.at(-1) ?? initialState));
    TestBed.configureTestingModule({
      imports: [DisplayScreenComponent],
      providers: [
        {
          provide: DisplayApiService,
          useValue: { openDisplay: () => of(initialState), getState }
        },
        provideRouter([])
      ]
    });
    const fixture = TestBed.createComponent(DisplayScreenComponent);
    fixture.detectChanges();
    return { fixture, getState };
  }

  it('renders a stable 4-to-1 kiosk shell without management controls', () => {
    const fixture = createComponent(readyState);
    const host: HTMLElement = fixture.nativeElement;
    const screen = host.querySelector('.display-screen');
    const topRegion = host.querySelector('.top-region') as HTMLElement;
    const adRegion = host.querySelector('.ad-region') as HTMLElement;

    expect(screen).not.toBeNull();
    expect(topRegion.offsetHeight / adRegion.offsetHeight).toBeCloseTo(4, 0);
    expect(host.textContent).not.toContain('Admin');
    expect(host.textContent).not.toContain('Settings');
  });

  it('renders fallback states when content and ads are unavailable', () => {
    const fixture = createComponent({ ...readyState, topContent: [], ads: [], fallbackActive: true });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Content unavailable');
    expect(text).toContain('Ads unavailable');
  });

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
        { ...readyState.ads[0], id: 'ad-2', label: 'Hall', displayOrder: 2 },
        { ...readyState.ads[0], id: 'ad-3', label: 'Lobby', displayOrder: 3 }
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
    expect(fixture.componentInstance.currentAd).toBeNull();
    expect(fixture.componentInstance.visibleAds).toEqual([]);
  });

  it('starts with loop content and visible ads when remote control state is absent', () => {
    const fixture = createComponent({ ...readyState, remoteControl: undefined, selectedIframe: undefined });

    expect(fixture.componentInstance.currentContent?.id).toBe('content-1');
    expect(fixture.componentInstance.adsVisible).toBeTrue();
    expect(fixture.nativeElement.querySelector('.ad-region')).not.toBeNull();
  });

  it('produces a rotation-fade class for fade animation', () => {
    const fixture = createComponent(readyState);
    const expected = `rotation-${readyState.topContent[0].effectiveRotationAnimation}`;

    expect(fixture.componentInstance.animationClass(readyState.topContent[0])).toBe(expected);
  });

  it('polls display state and applies remote iframe mode', fakeAsync(() => {
    const iframeState: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'iframe',
        selectedContentId: 'content-iframe',
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:00Z'
      },
      selectedIframe: {
        ...readyState.topContent[0],
        id: 'content-iframe',
        title: 'Agenda',
        contentType: 'embedded_web',
        sourceReference: 'https://example.org/agenda',
        displayOrder: 2
      }
    };
    const fixture = createComponent(readyState, iframeState);

    tick(3000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.id).toBe('content-iframe');
    expect(fixture.nativeElement.querySelector('iframe')?.getAttribute('src')).toBe('https://example.org/agenda');
  }));

  it('hides ads and expands content when remote ads visibility is disabled', fakeAsync(() => {
    const hiddenAdsState: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedContentId: null,
        adsVisible: false,
        updatedAt: '2026-06-18T00:00:00Z'
      }
    };
    const fixture = createComponent(readyState, hiddenAdsState);

    tick(3000);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.display-screen')?.classList).toContain('display-screen--ads-hidden');
    expect(fixture.nativeElement.querySelector('.ad-region')).toBeNull();
    expect(fixture.componentInstance.visibleAds).toEqual([]);
  }));

  it('restores ads layout when remote ads visibility is enabled again', fakeAsync(() => {
    const hiddenAdsState: DisplayState = {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedContentId: null,
        adsVisible: false,
        updatedAt: '2026-06-18T00:00:00Z'
      }
    };
    const fixture = createComponent(hiddenAdsState, {
      ...readyState,
      remoteControl: {
        contentMode: 'loop',
        selectedContentId: null,
        adsVisible: true,
        updatedAt: '2026-06-18T00:00:01Z'
      }
    });

    expect(fixture.nativeElement.querySelector('.ad-region')).toBeNull();

    tick(3000);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.display-screen')?.classList).not.toContain('display-screen--ads-hidden');
    expect(fixture.nativeElement.querySelector('.ad-region')).not.toBeNull();
    expect(fixture.componentInstance.visibleAds.length).toBe(1);
  }));

  it('reschedules polling with the hot-applied configuration interval', fakeAsync(() => {
    const { getState } = createComponentWithStateSequence([
      readyState,
      { ...readyState, configuration: { ...readyState.configuration, remoteControlPollingSeconds: 1 } }
    ]);

    tick(3000);
    expect(getState).toHaveBeenCalledTimes(1);

    tick(999);
    expect(getState).toHaveBeenCalledTimes(1);

    tick(1);
    expect(getState).toHaveBeenCalledTimes(2);
  }));

  it('hot-applies timing, animation, and inline ad count changes from display polling', fakeAsync(() => {
    const hotState: DisplayState = {
      ...readyState,
      configuration: {
        ...readyState.configuration,
        defaultTopDurationSeconds: 1,
        defaultTopRotationAnimation: 'slide',
        inlineAdCount: 1
      },
      topContent: [
        {
          ...readyState.topContent[0],
          title: 'First',
          durationSeconds: null,
          effectiveDurationSeconds: 1,
          effectiveRotationAnimation: 'slide'
        },
        {
          ...readyState.topContent[0],
          id: 'content-2',
          title: 'Second',
          displayOrder: 2,
          durationSeconds: null,
          effectiveDurationSeconds: 1,
          effectiveRotationAnimation: 'slide'
        }
      ],
      ads: [
        readyState.ads[0],
        { ...readyState.ads[0], id: 'ad-2', label: 'Second ad', displayOrder: 2 }
      ]
    };
    const { fixture } = createComponentWithStateSequence([readyState, hotState]);

    tick(3000);
    fixture.detectChanges();

    expect(fixture.componentInstance.visibleAds.length).toBe(1);
    expect(fixture.componentInstance.animationClass(fixture.componentInstance.currentContent!)).toBe('rotation-slide');

    tick(1000);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentContent?.title).toBe('Second');
  }));

  it('shows a display unavailable fallback when hot configuration disables the kiosk', fakeAsync(() => {
    const disabledState: DisplayState = {
      ...readyState,
      configuration: { ...readyState.configuration, isEnabled: false }
    };
    const { fixture } = createComponentWithStateSequence([readyState, disabledState]);

    tick(3000);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Display unavailable');
    expect(fixture.componentInstance.currentContent).toBeNull();
    expect(fixture.componentInstance.visibleAds).toEqual([]);
  }));
});
