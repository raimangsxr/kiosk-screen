import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { AdItem, AdsApiService, Client } from '../../ads/ads-api.service';
import { AdsFacade } from './ads.facade';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

function buildAd(partial: Partial<AdItem> = {}): AdItem {
  return {
    id: 'ad-1',
    clientId: 'client-1',
    label: 'Lobby ad',
    sourceReference: 'https://example.com/ad.jpg',
    isActive: true,
    displayOrder: 1,
    ...partial
  };
}

function buildClient(partial: Partial<Client> = {}): Client {
  return { id: 'client-1', name: 'Sponsor', isActive: true, ...partial };
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
    httpController.expectOne('/api/ads').flush([buildAd(), buildAd({ id: 'ad-2', label: 'Hall ad' })]);
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

  it('loadClients exposes active client list', () => {
    facade.loadClients().subscribe();
    httpController.expectOne('/api/clients').flush([buildClient(), buildClient({ id: 'client-2', name: 'Host' })]);
    expect(facade.clients().length).toBe(2);
  });

  it('loadAd populates current signal', () => {
    facade.loadAd('ad-1').subscribe();
    httpController.expectOne('/api/ads/ad-1').flush(buildAd({ label: 'Featured' }));
    expect(facade.current()?.label).toBe('Featured');
  });

  it('save creates an ad without file and refreshes list', () => {
    facade.save({ clientId: 'client-1', label: 'Lobby', sourceReference: 'x', isActive: true, displayOrder: 1 }).subscribe();
    const post = httpController.expectOne('/api/ads');
    expect(post.request.method).toBe('POST');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save updates an existing ad when id is provided', () => {
    facade.save({ clientId: 'client-1', label: 'Lobby', sourceReference: 'x', isActive: true, displayOrder: 1 }, 'ad-1').subscribe();
    const put = httpController.expectOne('/api/ads/ad-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save uploads multipart FormData when a file is provided on create', () => {
    const file = new File(['binary'], 'ad.jpg', { type: 'image/jpeg' });
    facade.save({ clientId: 'client-1', label: 'Lobby', sourceReference: '', isActive: true, displayOrder: 1 }, undefined, file).subscribe();
    const post = httpController.expectOne('/api/ads/upload');
    expect(post.request.method).toBe('POST');
    expect(post.request.body instanceof FormData).toBeTrue();
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('save updates without file when id is provided', () => {
    facade.save({ clientId: 'client-1', label: 'Lobby', sourceReference: 'x', isActive: true, displayOrder: 1 }, 'ad-1').subscribe();
    const put = httpController.expectOne('/api/ads/ad-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildAd());
    httpController.expectOne('/api/ads').flush([]);
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
