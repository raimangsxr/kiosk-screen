import { TestBed } from '@angular/core/testing';
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
    service.warm(['/api/media/a', '/api/media/b']);
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
