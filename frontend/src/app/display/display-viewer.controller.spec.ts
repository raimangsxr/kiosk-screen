import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DisplayContentItem } from '../core/api/display.api';
import { DisplayStreamService } from './display-stream.service';
import { DisplayViewerController } from './display-viewer.controller';
import type { ShowAdsPayload, ShowContentPayload } from './display-stream.models';

describe('DisplayViewerController', () => {
  let controller: DisplayViewerController;
  let http: HttpTestingController;

  const content: DisplayContentItem = {
    id: 'content-1',
    title: 'Welcome',
    contentType: 'video',
    sourceReference: 'https://example.com/welcome.mp4',
    isActive: true,
    displayOrder: 1,
    durationSeconds: 10,
    effectiveDurationSeconds: 10,
    effectiveRotationAnimation: 'fade',
  };

  const showContentPayload: ShowContentPayload = {
    commandId: 'cmd-20260708-000001',
    content,
    playback: {
      mode: 'video',
      durationSeconds: 10,
      videoEndDelaySeconds: 2,
      loopVideo: false,
    },
    transition: { animation: 'fade', durationMs: 300 },
    reason: 'bootstrap',
  };

  const showAdsPayload: ShowAdsPayload = {
    commandId: 'cmd-20260708-000002',
    items: [{
      id: 'ad-1',
      sourceReference: 'https://example.com/ad.jpg',
      isActive: true,
      displayOrder: 1,
      durationSeconds: 8,
      effectiveDurationSeconds: 8,
      effectiveRotationAnimation: 'slide',
      advertiser: 'Sponsor',
    }],
    startIndex: 0,
    inlineAdCount: 1,
    border: { radiusPx: 5, widthPx: 1, color: '#ffffff' },
    transition: { animation: 'slide', durationMs: 300 },
    durationSeconds: 8,
    reason: 'bootstrap',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DisplayViewerController,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DisplayStreamService,
          useValue: {
            kioskId: () => 'kiosk-1',
          },
        },
      ],
    });
    controller = TestBed.inject(DisplayViewerController);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('applies show_content to render state', () => {
    controller.applyShowContent(showContentPayload);
    expect(controller.currentContent()?.id).toBe('content-1');
    expect(controller.currentCommandId()).toBe('cmd-20260708-000001');
  });

  it('posts video_ended for the active command', () => {
    controller.applyShowContent(showContentPayload);
    controller.onVideoEnded(content);
    const request = http.expectOne('/api/display/kiosk/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(jasmine.objectContaining({
      kioskId: 'kiosk-1',
      type: 'video_ended',
      commandId: 'cmd-20260708-000001',
      contentId: 'content-1',
    }));
    request.flush(null);
  });

  it('posts media_error for the active command', () => {
    controller.applyShowContent(showContentPayload);
    controller.reportMediaError('content-1', { code: 'load_failed' });
    const request = http.expectOne('/api/display/kiosk/events');
    expect(request.request.body).toEqual(jasmine.objectContaining({
      type: 'media_error',
      commandId: 'cmd-20260708-000001',
      contentId: 'content-1',
      metadata: { code: 'load_failed' },
    }));
    request.flush(null);
  });

  it('applies show_ads to visible sponsor strip items', () => {
    controller.applyShowAds(showAdsPayload);
    expect(controller.visibleAds().length).toBe(1);
    expect(controller.visibleAds()[0]?.id).toBe('ad-1');
  });

  it('stores preload urls for prefetch hints', () => {
    controller.applyPreload({
      items: [{ contentId: 'next-1', mediaUrl: 'https://example.com/next.jpg', contentType: 'photo', mediaVersion: 'v1' }],
      leadTimeSeconds: 5,
    });
    expect(controller.preloadUrls()).toEqual(['https://example.com/next.jpg']);
  });

  it('applies mode_changed and show_iframe payloads', () => {
    controller.applyModeChanged({
      contentMode: 'iframe',
      isPaused: false,
      adsVisible: true,
      selectedFixedContentId: null,
      reason: 'remote_mode_change',
    });
    controller.applyShowIframe({
      commandId: 'cmd-iframe',
      iframe: { id: 'iframe-1', title: 'Live', url: 'https://example.com/live' },
      reason: 'remote_mode_change',
    });
    expect(controller.iframeActive()).toBeTrue();
    expect(controller.currentIframe()?.url).toBe('https://example.com/live');
  });
});
