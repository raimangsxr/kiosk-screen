import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DisplayMediaCacheService } from './display-media-cache.service';
import { NoveltyPreloadReadyService } from './novelty-preload-ready.service';
import { DisplayStreamService } from './display-stream.service';
import { DisplayViewerController } from './display-viewer.controller';
import type { PreloadItem } from './display-stream.models';

describe('NoveltyPreloadReadyService', () => {
  let service: NoveltyPreloadReadyService;
  let http: HttpTestingController;
  let ensureReady: jasmine.Spy<DisplayMediaCacheService['ensureReady']>;
  let getReadyState: jasmine.Spy<DisplayMediaCacheService['getReadyState']>;
  let viewer: DisplayViewerController;

  const novelty: PreloadItem = {
    contentId: 'novelty-1',
    mediaUrl: '/api/media/novelty.jpg',
    contentType: 'photo',
    mediaVersion: 'novelty-1',
    isNovelty: true,
  };

  beforeEach(() => {
    ensureReady = jasmine.createSpy('ensureReady').and.returnValue(Promise.resolve('blob:cached'));
    getReadyState = jasmine.createSpy('getReadyState').and.returnValue('idle');
    TestBed.configureTestingModule({
      providers: [
        NoveltyPreloadReadyService,
        DisplayViewerController,
        {
          provide: DisplayMediaCacheService,
          useValue: {
            ensureReady,
            getReadyState,
          },
        },
        {
          provide: DisplayStreamService,
          useValue: {
            kioskId: () => 'kiosk-1',
          },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NoveltyPreloadReadyService);
    viewer = TestBed.inject(DisplayViewerController);
    http = TestBed.inject(HttpTestingController);
    viewer.contentMode.set('loop');
    viewer.isPaused.set(false);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts novelty_preload_ready once when cache becomes ready', fakeAsync(() => {
    service.observeNovelties([novelty]);
    tick();

    const req = http.expectOne('/api/display/kiosk/events');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      type: 'novelty_preload_ready',
      kioskId: 'kiosk-1',
      contentId: 'novelty-1',
    }));
    req.flush(null);

    service.observeNovelties([novelty]);
    tick();
    http.expectNone('/api/display/kiosk/events');
  }));

  it('re-posts ready on reconnect snapshot backfill', fakeAsync(() => {
    service.observeNovelties([{
      ...novelty,
      deferCount: 2,
      maxDefer: 5,
    }], { reconnect: true });
    tick();
    const req = http.expectOne('/api/display/kiosk/events');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      type: 'novelty_preload_ready',
      contentId: 'novelty-1',
    }));
  }));

  it('does not post when paused', fakeAsync(() => {
    viewer.isPaused.set(true);
    service.observeNovelties([novelty]);
    tick();
    expect(http.match('/api/display/kiosk/events').length).toBe(0);
  }));

  it('does not post when fixed content mode is active', fakeAsync(() => {
    viewer.contentMode.set('fixed');
    service.observeNovelties([novelty]);
    tick();
    expect(http.match('/api/display/kiosk/events').length).toBe(0);
  }));

  it('does not post when iframe mode is active', fakeAsync(() => {
    viewer.contentMode.set('iframe');
    service.observeNovelties([novelty]);
    tick();
    expect(http.match('/api/display/kiosk/events').length).toBe(0);
  }));
});
