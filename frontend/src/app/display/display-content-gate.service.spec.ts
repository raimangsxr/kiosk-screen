import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DisplayContentItem } from '../core/api/display.api';
import { DisplayContentGateService, GATE_TIMEOUT_MS } from './display-content-gate.service';
import { DisplayMediaCacheService } from './display-media-cache.service';
import { DisplayStreamService } from './display-stream.service';
import type { ShowContentPayload } from './display-stream.models';
import { DisplayViewerController } from './display-viewer.controller';

describe('DisplayContentGateService', () => {
  let gate: DisplayContentGateService;
  let viewer: DisplayViewerController;
  let http: HttpTestingController;
  let ensureReady: jasmine.Spy<DisplayMediaCacheService['ensureReady']>;

  const content: DisplayContentItem = {
    id: 'content-1',
    title: 'Slide',
    contentType: 'photo',
    sourceReference: '/api/media/slide.jpg',
    isActive: true,
    displayOrder: 1,
    durationSeconds: 15,
    effectiveDurationSeconds: 15,
    effectiveRotationAnimation: 'fade',
  };

  const payload = (commandId: string, contentId = 'content-1'): ShowContentPayload => ({
    commandId,
    content: { ...content, id: contentId },
    playback: { mode: 'timer', durationSeconds: 15, videoEndDelaySeconds: 0, loopVideo: false },
    transition: { animation: 'fade', durationMs: 300 },
    reason: 'rotation_advance',
  });

  beforeEach(() => {
    ensureReady = jasmine.createSpy('ensureReady').and.returnValue(Promise.resolve('blob:cached'));
    TestBed.configureTestingModule({
      providers: [
        DisplayContentGateService,
        DisplayViewerController,
        {
          provide: DisplayMediaCacheService,
          useValue: {
            revision: () => 0,
            getReadyState: () => 'idle',
            ensureReady,
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
    gate = TestBed.inject(DisplayContentGateService);
    viewer = TestBed.inject(DisplayViewerController);
    http = TestBed.inject(HttpTestingController);
    viewer.contentMode.set('loop');
    viewer.isPaused.set(false);
  });

  afterEach(() => {
    http.match('/api/display/kiosk/events')?.forEach((request) => request.flush(null));
    http.verify();
  });

  it('holds previous content until media is ready', async () => {
    ensureReady.and.returnValue(new Promise(() => undefined));
    viewer.currentContent.set(content);
    gate.enqueueShowContent(payload('cmd-2'));
    await Promise.resolve();
    expect(viewer.currentContent()?.id).toBe('content-1');
  });

  it('latest show_content replaces pending before commit', fakeAsync(() => {
    const committed: string[] = [];
    gate.onCommitted.subscribe((id) => committed.push(id));

    gate.enqueueShowContent(payload('cmd-1', 'content-1'));
    gate.enqueueShowContent(payload('cmd-2', 'content-2'));
    tick();

    expect(viewer.currentContent()?.id).toBe('content-2');
    expect(committed).toEqual(['content-2']);
  }));

  it('commits quickly when media is pre-cached', fakeAsync(() => {
    const committed: string[] = [];
    gate.onCommitted.subscribe((id) => committed.push(id));

    const started = performance.now();
    gate.enqueueShowContent(payload('cmd-ready'));
    tick();
    const elapsed = performance.now() - started;

    expect(viewer.currentContent()?.id).toBe('content-1');
    expect(committed).toEqual(['content-1']);
    expect(elapsed).toBeLessThan(500);
  }));

  it('posts media_error on gate timeout without committing failed content', fakeAsync(() => {
    ensureReady.and.returnValue(new Promise(() => undefined));
    gate.enqueueShowContent(payload('cmd-timeout'));
    tick(GATE_TIMEOUT_MS + 1);

    const req = http.expectOne('/api/display/kiosk/events');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      type: 'media_error',
      commandId: 'cmd-timeout',
      contentId: 'content-1',
    }));
    expect(viewer.currentContent()).toBeNull();
  }));

  it('commits novelty immediately without waiting for media cache', fakeAsync(() => {
    ensureReady.and.returnValue(new Promise(() => undefined));
    const noveltyPayload: ShowContentPayload = {
      ...payload('cmd-novelty'),
      reason: 'novelty',
    };
    gate.enqueueShowContent(noveltyPayload);
    tick();

    expect(viewer.currentContent()?.id).toBe('content-1');
    http.expectNone('/api/display/kiosk/events');
  }));

  it('still holds regular content until media is ready', async () => {
    ensureReady.and.returnValue(new Promise(() => undefined));
    viewer.currentContent.set(content);
    gate.enqueueShowContent(payload('cmd-regular', 'content-2'));
    await Promise.resolve();
    expect(viewer.currentContent()?.id).toBe('content-1');
  });
});
