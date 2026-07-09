import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DisplayMediaCacheService } from './display-media-cache.service';

describe('DisplayMediaCacheService', () => {
  let service: DisplayMediaCacheService;
  let http: HttpTestingController;

  beforeEach(() => {
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

  it('returns blob url on second resolve without a second HTTP GET', async () => {
    const url = '/api/media/file-1';
    expect(service.getDisplayUrl(url)).toBe(url);

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
});
