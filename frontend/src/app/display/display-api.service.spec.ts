import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { DisplayApiService, DisplayState } from '../core/api/display.api';
import { DisplayApiService as DisplayApiServiceShim } from './display-api.service';

describe('DisplayApiService (re-export)', () => {
  it('re-exports the same service as core/api/display.api', () => {
    expect(DisplayApiServiceShim).toBe(DisplayApiService);
  });
});

describe('DisplayApiService', () => {
  let service: DisplayApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DisplayApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('opens the display with credentials', () => {
    service.openDisplay().subscribe();

    const request = http.expectOne('/api/display/open');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
  });

  it('reads display state with credentials', () => {
    service.getState().subscribe();

    const request = http.expectOne('/api/display/state');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
  });

  it('watchState polls the endpoint and emits when display-relevant state changes', fakeAsync(() => {
    const base: DisplayState = {
      configuration: {
        id: 'c1',
        name: 'Main',
        topRegionRatio: 4,
        bottomRegionRatio: 1,
        defaultTopDurationSeconds: 10,
        defaultAdDurationSeconds: 10,
        defaultTopRotationAnimation: 'none',
        defaultAdRotationAnimation: 'none',
        defaultTopAnimationDurationMilliseconds: 300,
        defaultAdAnimationDurationMilliseconds: 300,
        inlineAdCount: 1,
        configuredEventDurationMinutes: 60,
        isEnabled: true,
      },
      topContent: [
        { id: 'a', title: 'A', contentType: 'photo', sourceReference: 'a.jpg', isActive: true, displayOrder: 1, durationSeconds: 5, effectiveDurationSeconds: 5, effectiveRotationAnimation: 'none' },
      ],
      ads: [],
      fallbackActive: false,
    };

    const emissions: DisplayState[] = [];
    const sub = service.watchState(2000).subscribe((s) => emissions.push(s));

    // First poll: initial timer fires at t=0.
    tick(0);
    http.expectOne('/api/display/state').flush(base);
    expect(emissions.length).toBe(1);

    // Second poll: t=2000ms. Identical payload → suppressed.
    tick(2000);
    http.expectOne('/api/display/state').flush(base);
    expect(emissions.length).toBe(1);

    // Third poll: state with same display fingerprint (different object reference) -> suppressed.
    tick(2000);
    http.expectOne('/api/display/state').flush({
      ...base,
      topContent: [{ ...base.topContent[0] }],
    });
    expect(emissions.length).toBe(1);

    // Fourth poll: a display configuration field changes -> emission.
    tick(2000);
    http.expectOne('/api/display/state').flush({
      ...base,
      configuration: {
        ...base.configuration,
        defaultTopDurationSeconds: 12,
      },
    });
    expect(emissions.length).toBe(2);
    expect(emissions[1].configuration.defaultTopDurationSeconds).toBe(12);

    // Fifth poll: a new content item -> emission.
    tick(2000);
    http.expectOne('/api/display/state').flush({
      ...base,
      topContent: [
        ...base.topContent,
        { id: 'b', title: 'B', contentType: 'photo', sourceReference: 'b.jpg', isActive: true, displayOrder: 2, durationSeconds: 5, effectiveDurationSeconds: 5, effectiveRotationAnimation: 'none' },
      ],
    });
    expect(emissions.length).toBe(3);
    expect(emissions[2].topContent.length).toBe(2);

    // Clean up: unsubscribe so the timer stops firing and http.verify() passes.
    sub.unsubscribe();
    // Drain any pending timers.
    tick(2000);
    // http.verify() in afterEach checks there are no open requests.
  }));
});
