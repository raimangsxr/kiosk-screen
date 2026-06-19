import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { throwError } from 'rxjs';

import { AdItem, AdsApiService } from '../../core/api/ads.api';
import { AdsFacade } from './ads.facade';

function buildAd(partial: Partial<AdItem> = {}): AdItem {
  return {
    id: 'ad-1',
    sourceReference: 'https://example.com/ad.jpg',
    isActive: true,
    displayOrder: 1,
    advertiser: 'Sponsor',
    ...partial
  };
}

describe('AdsFacade', () => {
  let facade: AdsFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AdsFacade]
    });
    facade = TestBed.inject(AdsFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded ads through ads and ready signals', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/ads').flush([buildAd(), buildAd({ id: 'ad-2' })]);
    expect(facade.ads().length).toBe(2);
    expect(facade.ready()).toBeTrue();
  });

  it('refresh sets empty signal when no ads are returned', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/ads').flush([]);
    expect(facade.empty()).toBeTrue();
    expect(facade.ready()).toBeFalse();
  });

  it('refresh maps backend envelope errors to safe ApplicationErrorContract', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController
      .expectOne('/api/ads')
      .flush({ code: 'permission_denied', message: 'You are not allowed.', category: 'permission' }, { status: 403, statusText: 'Forbidden' });
    expect(facade.error()?.category).toBe('permission');
  });

  it('loadAd populates current signal', () => {
    facade.loadAd('ad-1').subscribe();
    httpController.expectOne('/api/ads/ad-1').flush(buildAd({ displayOrder: 5 }));
    expect(facade.current()?.displayOrder).toBe(5);
  });

  it('save creates an ad without file and refreshes list', () => {
    facade.save({ sourceReference: 'x', isActive: true, displayOrder: 1, advertiser: 'Sponsor' }).subscribe();
    const post = httpController.expectOne('/api/ads');
    expect(post.request.method).toBe('POST');
    const body = post.request.body as Record<string, unknown>;
    expect('clientId' in body).toBeFalse();
    expect('label' in body).toBeFalse();
    expect(body['advertiser']).toBe('Sponsor');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save updates an existing ad when id is provided', () => {
    facade.save({ sourceReference: 'x', isActive: true, displayOrder: 1, advertiser: 'Sponsor' }, 'ad-1').subscribe();
    const put = httpController.expectOne('/api/ads/ad-1');
    expect(put.request.method).toBe('PUT');
    const body = put.request.body as Record<string, unknown>;
    expect('clientId' in body).toBeFalse();
    expect('label' in body).toBeFalse();
    put.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save uploads multipart FormData when a file is provided on create', () => {
    const file = new File(['binary'], 'ad.jpg', { type: 'image/jpeg' });
    facade.save({ sourceReference: '', isActive: true, displayOrder: 1, advertiser: 'Sponsor' }, undefined, file).subscribe();
    const post = httpController.expectOne('/api/ads/upload');
    expect(post.request.method).toBe('POST');
    expect(post.request.body instanceof FormData).toBeTrue();
    const formData = post.request.body as FormData;
    expect(formData.has('clientId')).toBeFalse();
    expect(formData.has('label')).toBeFalse();
    expect(formData.get('advertiser')).toBe('Sponsor');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save updates without file when id is provided', () => {
    facade.save({ sourceReference: 'x', isActive: true, displayOrder: 1, advertiser: 'Sponsor' }, 'ad-1').subscribe();
    const put = httpController.expectOne('/api/ads/ad-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildAd());
    httpController.expectOne('/api/ads').flush([]);
  });

  it('reorder sends the orderedIds list to the new endpoint', () => {
    facade.reorder(['ad-2', 'ad-1', 'ad-3']).subscribe();
    const req = httpController.expectOne('/api/ads/reorder');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ orderedIds: ['ad-2', 'ad-1', 'ad-3'] });
    req.flush(null);
    httpController.expectOne('/api/ads').flush([buildAd(), buildAd({ id: 'ad-2' })]);
  });

  it('remove issues DELETE and refreshes the list', () => {
    facade.remove('ad-1').subscribe();
    httpController.expectOne('/api/ads/ad-1').flush(null);
    httpController.expectOne('/api/ads').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('remove swallows errors and exposes them through error signal', () => {
    facade.remove('ad-1').subscribe();
    httpController
      .expectOne('/api/ads/ad-1')
      .flush({ code: 'conflict_state', message: 'Cannot delete.' }, { status: 409, statusText: 'Conflict' });
    expect(facade.error()?.category).toBe('conflict');
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/ads').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('falls back to default error envelope when backend error shape is unknown', () => {
    const api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['listAds']);
    api.listAds.and.returnValue(throwError(() => 42));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AdsApiService, useValue: api }, AdsFacade] });
    const isolated = TestBed.inject(AdsFacade);
    isolated.refresh().subscribe({ error: () => undefined });
    const error = isolated.error();
    expect(error?.code).toBe('unexpected_error');
    expect(error?.category).toBe('unexpected');
  });
});
