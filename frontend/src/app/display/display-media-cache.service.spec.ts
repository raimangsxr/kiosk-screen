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

  it('retains visible + one preload and evicts a third top URL', async () => {
    service.retainTop(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    flushBlob('https://example.com/a.jpg');
    flushBlob('https://example.com/b.jpg');
    await Promise.resolve();

    service.retainTop(['https://example.com/b.jpg', 'https://example.com/c.jpg']);
    flushBlob('https://example.com/c.jpg');
    await Promise.resolve();

    expect(revokeSpy).toHaveBeenCalled();
    expect(service.getDisplayUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(service.getDisplayUrl('https://example.com/b.jpg')).toContain('blob:');
    expect(service.getDisplayUrl('https://example.com/c.jpg')).toContain('blob:');
  });

  it('clears top retention in iframe mode', async () => {
    service.retainTop(['https://example.com/a.jpg']);
    flushBlob('https://example.com/a.jpg');
    await Promise.resolve();

    service.clearTopRetention();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('retains only visible ad window URLs', async () => {
    service.retainAds(['https://example.com/ad1.jpg', 'https://example.com/ad2.jpg']);
    flushBlob('https://example.com/ad1.jpg');
    flushBlob('https://example.com/ad2.jpg');
    await Promise.resolve();

    service.retainAds(['https://example.com/ad2.jpg']);
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('releaseAll revokes every blob URL', async () => {
    service.retainTop(['https://example.com/a.jpg']);
    flushBlob('https://example.com/a.jpg');
    await Promise.resolve();
    revokeSpy.calls.reset();

    service.releaseAll();
    expect(revokeSpy).toHaveBeenCalled();
  });
});
