import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DisplayMediaCacheService } from './display-media-cache.service';

describe('DisplayMediaCacheService', () => {
  let service: DisplayMediaCacheService;
  let http: HttpTestingController;
  let revokeSpy: jasmine.Spy;

  beforeEach(() => {
    revokeSpy = spyOn(URL, 'revokeObjectURL');
    TestBed.configureTestingModule({
      providers: [
        DisplayMediaCacheService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DisplayMediaCacheService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.releaseAll();
    http.verify();
  });

  function flushBlob(url: string): void {
    const request = http.expectOne(url);
    request.flush(new Blob(['x'], { type: 'image/jpeg' }));
  }

  it('returns blob url on second resolve without a second HTTP GET', async () => {
    const url = '/api/media/file-1';
    expect(service.getDisplayUrl(url)).toBe('');

    service.retainTop([url]);
    const pending = service.ensure(url);
    const req = http.expectOne(url);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x'], { type: 'image/jpeg' }));
    await pending;

    const blobUrl = service.getDisplayUrl(url);
    expect(blobUrl).toMatch(/^blob:/);
    expect(service.getDisplayUrl(url)).toBe(blobUrl);
    http.expectNone(url);
  });

  it('warm prefetches multiple urls once each', async () => {
    service.retainTop(['/api/media/a', '/api/media/b']);
    const a = http.expectOne('/api/media/a');
    const b = http.expectOne('/api/media/b');
    a.flush(new Blob(['a']));
    b.flush(new Blob(['b']));
    await Promise.all([service.ensure('/api/media/a'), service.ensure('/api/media/b')]);
    expect(service.getDisplayUrl('/api/media/a')).toMatch(/^blob:/);
    expect(service.getDisplayUrl('/api/media/b')).toMatch(/^blob:/);
    http.expectNone('/api/media/a');
    http.expectNone('/api/media/b');
  });

  it('limits warm concurrency to three active downloads', () => {
    const urls = Array.from({ length: 5 }, (_, index) => `/api/media/q${index}`);
    service.warm(urls);
    const pending = http.match(() => true);
    expect(pending.length).toBe(3);
    pending.forEach((req) => req.flush(new Blob(['x'])));
  });

  it('limits direct ensureReady callers to three active preparations globally', async () => {
    const urls = Array.from({ length: 10 }, (_, index) => `/api/media/burst-${index}`);
    const preparations = urls.map((url) => service.ensureReady(url, indexToType(url)));

    for (let completed = 0; completed < urls.length; completed += 3) {
      const active = http.match((request) => request.url.startsWith('/api/media/burst-'));
      expect(active.length).toBe(Math.min(3, urls.length - completed));
      active.forEach((request) => request.flush(new Blob([request.request.url])));
      await Promise.resolve();
      await Promise.resolve();
    }

    await Promise.all(preparations);

    function indexToType(url: string): 'photo' | 'video' {
      const index = Number(url.split('-').pop());
      return index % 2 === 0 ? 'photo' : 'video';
    }
  });

  it('marks non-retained preparation ready without retaining its presentation blob', async () => {
    const url = '/api/media/non-retained-novelty';
    const blobUrl = 'blob:non-retained-novelty';
    spyOn(URL, 'createObjectURL').and.returnValue(blobUrl);

    const pending = service.ensureReady(url, 'video');
    http.expectOne(url).flush(new Blob(['video']));
    await pending;

    expect(service.getReadyState(url)).toBe('ready');
    expect(service.getDisplayUrl(url)).toBe('');
    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
  });

  it('warms only the first announced top preload candidate', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      mediaUrl: `/api/media/next-${index + 1}`,
      contentType: 'photo',
    }));
    service.warmItems(items);

    const request = http.expectOne('/api/media/next-1');
    expect(request.request.url).toBe('/api/media/next-1');
    for (const item of items.slice(1)) {
      http.expectNone(item.mediaUrl);
    }
    request.flush(new Blob(['x']));
  });

  it('keeps at most visible plus one preload after 100 rotations', async () => {
    for (let index = 0; index < 100; index += 1) {
      const visible = `/api/media/rotation-${index}`;
      const preload = `/api/media/rotation-${index + 1}`;
      service.retainTop([visible, preload]);
      const requests = http.match(
        (request) => request.url === visible || request.url === preload,
      );
      const pending = [visible, preload].map((url) => service.ensure(url));
      requests.forEach((request) => request.flush(new Blob([request.request.url])));
      await Promise.all(pending);
    }

    const cache = service as unknown as {
      blobByUrl: Map<string, string>;
      topRetained: Set<string>;
    };
    expect(cache.topRetained.size).toBeLessThanOrEqual(2);
    expect(cache.blobByUrl.size).toBeLessThanOrEqual(2);
  });

  it('prunes queued warm entries when they leave every retained window', async () => {
    service.retainAds(['/api/media/ad-1', '/api/media/ad-2', '/api/media/ad-3']);
    service.retainTop(['/api/media/old-visible', '/api/media/old-next']);
    service.retainTop(['/api/media/new-visible']);

    const active = http.match((request) => request.url.startsWith('/api/media/ad-'));
    expect(active.length).toBe(3);
    const activePromises = active.map((request) => service.ensure(request.request.url));
    active.forEach((request) => request.flush(new Blob(['ad'])));
    await Promise.all(activePromises);

    http.expectNone('/api/media/old-visible');
    http.expectNone('/api/media/old-next');
    const replacement = http.expectOne('/api/media/new-visible');
    replacement.flush(new Blob(['new']));
  });

  it('revokes an in-flight completion that left the retained window', async () => {
    const url = '/api/media/late-photo';
    service.retainTop([url]);
    const pending = service.ensure(url);
    const request = http.expectOne(url);

    service.clearTopRetention();
    request.flush(new Blob(['late']));
    await pending;

    expect(revokeSpy).toHaveBeenCalled();
    expect(service.getDisplayUrl(url)).toBe('');
    expect(service.getReadyState(url)).toBe('ready');
  });

  it('does not restore a completion from a released cache lifecycle', async () => {
    const url = '/api/media/after-destroy';
    service.retainTop([url]);
    const pending = service.ensure(url);
    const request = http.expectOne(url);

    service.releaseAll();
    request.flush(new Blob(['late']));
    await pending;

    expect(revokeSpy).toHaveBeenCalled();
    expect(service.getDisplayUrl(url)).toBe('');
    expect(service.getReadyState(url)).toBe('idle');
  });

  it('does not let an old lifecycle completion erase a newer request for the same URL', async () => {
    const url = '/api/media/reused-after-release';
    service.retainTop([url]);
    const oldPending = service.ensure(url);
    const oldRequest = http.expectOne(url);

    service.releaseAll();
    service.retainTop([url]);
    const newPending = service.ensure(url);
    const newRequest = http.expectOne(url);
    newRequest.flush(new Blob(['new']));
    const newBlobUrl = await newPending;

    oldRequest.flush(new Blob(['old']));
    await oldPending;

    expect(service.getDisplayUrl(url)).toBe(newBlobUrl);
    expect(service.getReadyState(url)).toBe('ready');
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('revokes a temporary object URL when presentation probing fails', async () => {
    const url = '/api/media/broken-photo';
    const blobUrl = 'blob:broken-photo';
    spyOn(URL, 'createObjectURL').and.returnValue(blobUrl);
    spyOn(service as unknown as { shouldSkipPresentationProbe: () => boolean }, 'shouldSkipPresentationProbe')
      .and.returnValue(false);
    spyOn(service as unknown as { probeImage: (value: string) => Promise<void> }, 'probeImage')
      .and.rejectWith(new Error('image_probe_failed'));

    const pending = service.ensure(url);
    http.expectOne(url).flush(new Blob(['broken']));

    await expectAsync(pending).toBeRejected();
    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
    expect(service.getDisplayUrl(url)).toBe('');
  });

  it('retries a transient failure after cooldown instead of failing for the component lifetime', async () => {
    const url = '/api/media/transient-video';
    let now = 10_000;
    spyOn(Date, 'now').and.callFake(() => now);

    const first = service.ensureReady(url, 'video');
    http.expectOne(url).flush(new Blob(['temporary']), { status: 503, statusText: 'Unavailable' });
    await expectAsync(first).toBeRejected();
    await expectAsync(service.ensureReady(url, 'video')).toBeRejected();
    http.expectNone(url);

    now += 60_000;
    const retry = service.ensureReady(url, 'video');
    http.expectOne(url).flush(new Blob(['video']));
    await expectAsync(retry).toBeResolved();
    expect(service.getReadyState(url)).toBe('ready');
  });

  it('marks a fully downloaded video ready when it can start without canplaythrough', fakeAsync(() => {
    const url = '/api/media/rotation-video';
    const blobUrl = 'blob:rotation-video';
    const video = document.createElement('video');
    spyOn(URL, 'createObjectURL').and.returnValue(blobUrl);
    spyOn(service as unknown as { shouldSkipPresentationProbe: () => boolean }, 'shouldSkipPresentationProbe')
      .and.returnValue(false);
    spyOn(document, 'createElement').and.returnValue(video);
    spyOn(video, 'load');

    let resolved = false;
    let rejected = false;
    service.warmItems([{ mediaUrl: url, contentType: 'video' }]);
    service.retainTop([url]);
    void service.ensure(url, 'video')
      .then(() => { resolved = true; })
      .catch(() => { rejected = true; });
    http.expectOne(url).flush(new Blob(['video'], { type: 'video/mp4' }));
    flushMicrotasks();

    video.dispatchEvent(new Event('canplay'));
    flushMicrotasks();
    tick(10_000);
    flushMicrotasks();

    expect(resolved).toBeTrue();
    expect(rejected).toBeFalse();
    expect(service.getReadyState(url)).toBe('ready');
    expect(service.getDisplayUrl(url)).toBe(blobUrl);
  }));

  it('retains visible + one preload and evicts a third top URL', async () => {
    service.retainTop(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    flushBlob('https://example.com/a.jpg');
    flushBlob('https://example.com/b.jpg');
    await service.ensure('https://example.com/a.jpg');
    await service.ensure('https://example.com/b.jpg');

    service.retainTop(['https://example.com/b.jpg', 'https://example.com/c.jpg']);
    flushBlob('https://example.com/c.jpg');
    await service.ensure('https://example.com/c.jpg');

    expect(revokeSpy).toHaveBeenCalled();
    // Evicted URL is no longer ready: gated getDisplayUrl returns '' (CHG-050).
    expect(service.getDisplayUrl('https://example.com/a.jpg')).toBe('');
    expect(service.getDisplayUrl('https://example.com/b.jpg')).toContain('blob:');
    expect(service.getDisplayUrl('https://example.com/c.jpg')).toContain('blob:');
  });

  it('clears top retention in iframe mode', async () => {
    service.retainTop(['https://example.com/a.jpg']);
    flushBlob('https://example.com/a.jpg');
    await service.ensure('https://example.com/a.jpg');

    service.clearTopRetention();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('retains only visible ad window URLs', async () => {
    service.retainAds(['https://example.com/ad1.jpg', 'https://example.com/ad2.jpg']);
    flushBlob('https://example.com/ad1.jpg');
    flushBlob('https://example.com/ad2.jpg');
    await service.ensure('https://example.com/ad1.jpg');
    await service.ensure('https://example.com/ad2.jpg');

    service.retainAds(['https://example.com/ad2.jpg']);
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('releaseAll revokes every blob URL', async () => {
    service.retainTop(['https://example.com/a.jpg']);
    flushBlob('https://example.com/a.jpg');
    await service.ensure('https://example.com/a.jpg');
    revokeSpy.calls.reset();

    service.releaseAll();
    expect(revokeSpy).toHaveBeenCalled();
  });
});
