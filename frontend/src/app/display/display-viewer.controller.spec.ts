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

  it('posts a visible video playback error once for the originating active command', () => {
    controller.applyShowContent(showContentPayload);

    controller.onVideoPlaybackError(content, showContentPayload.commandId);
    controller.onVideoPlaybackError(content, showContentPayload.commandId);

    const requests = http.match('/api/display/kiosk/events');
    expect(requests.length).toBe(1);
    expect(requests[0].request.body).toEqual(jasmine.objectContaining({
      type: 'media_error',
      commandId: showContentPayload.commandId,
      contentId: content.id,
      metadata: { source: 'visible_video', code: 'playback_error' },
    }));
    requests[0].flush(null);
  });

  it('ignores a playback error from a video element replaced by a newer command', () => {
    controller.applyShowContent(showContentPayload);
    controller.applyShowContent({
      ...showContentPayload,
      commandId: 'cmd-20260708-000099',
      content: { ...content, id: 'content-2' },
    });

    controller.onVideoPlaybackError(content, showContentPayload.commandId);

    expect(http.match('/api/display/kiosk/events').length).toBe(0);
  });

  it('applies show_ads to visible sponsor strip items', () => {
    controller.applyShowAds(showAdsPayload);
    expect(controller.visibleAds().length).toBe(1);
    expect(controller.visibleAds()[0]?.id).toBe('ad-1');
  });

  it('still animates identical consecutive show_ads when animation is not none', () => {
    controller.applyShowAds(showAdsPayload);
    const runBefore = controller.adAnimationRun();
    controller.applyShowAds(showAdsPayload);
    expect(controller.adAnimationRun()).toBeGreaterThan(runBefore);
  });

  it('does not animate identical consecutive show_ads when animation is none', () => {
    const staticPayload: ShowAdsPayload = {
      ...showAdsPayload,
      transition: { animation: 'none', durationMs: 0 },
      items: [{
        ...showAdsPayload.items[0],
        effectiveRotationAnimation: 'none',
        rotationAnimation: 'none',
      }],
    };
    controller.applyShowAds(staticPayload);
    const runBefore = controller.adAnimationRun();
    controller.applyShowAds(staticPayload);
    expect(controller.adAnimationRun()).toBe(runBefore);
  });

  it('skips an equivalent visible sponsor window when only command identity changes', () => {
    controller.applyShowAds(showAdsPayload);
    const runBefore = controller.adAnimationRun();
    controller.applyShowAds({
      ...showAdsPayload,
      commandId: 'cmd-20260708-000003',
    });
    expect(controller.adAnimationRun()).toBeGreaterThan(runBefore);
  });

  it('applies show_ads when visible presentation changes', () => {
    controller.applyShowAds(showAdsPayload);
    const runBefore = controller.adAnimationRun();
    controller.applyShowAds({
      ...showAdsPayload,
      commandId: 'cmd-20260708-000003',
      border: { ...showAdsPayload.border, widthPx: 3 },
    });
    expect(controller.adAnimationRun()).toBeGreaterThan(runBefore);
  });

  it('stores only the first preload url for the bounded top-media window', () => {
    controller.applyPreload({
      items: [
        { contentId: 'next-1', mediaUrl: 'https://example.com/next.jpg', contentType: 'photo', mediaVersion: 'v1', isNovelty: false },
        { contentId: 'next-2', mediaUrl: 'https://example.com/ignored.jpg', contentType: 'photo', mediaVersion: 'v1', isNovelty: false },
      ],
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

  it('restores iframe mode from snapshot without replaying loop content', () => {
    controller.applyShowContent(showContentPayload);
    controller.applySnapshot({
      configuration: {
        id: 'config-1',
        name: 'Main',
        topRegionRatio: 0.7,
        bottomRegionRatio: 0.3,
        defaultTopDurationSeconds: 10,
        defaultAdDurationSeconds: 8,
        isEnabled: true,
      },
      contentMode: 'iframe',
      isPaused: false,
      adsVisible: true,
      selectedIframe: {
        id: 'iframe-1',
        url: 'https://example.com/live',
      },
      currentTop: showContentPayload,
      currentAds: null,
      fallbackActive: false,
    });
    expect(controller.iframeActive()).toBeTrue();
    expect(controller.currentIframe()?.url).toBe('https://example.com/live');
    expect(controller.currentContent()).toBeNull();
  });
});
