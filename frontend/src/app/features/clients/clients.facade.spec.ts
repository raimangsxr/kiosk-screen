import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { AdsApiService, Client } from '../../ads/ads-api.service';
import { ClientsFacade } from './clients.facade';

function buildClient(partial: Partial<Client> = {}): Client {
  return { id: 'client-1', name: 'Sponsor', isActive: true, ...partial };
}

describe('ClientsFacade', () => {
  let facade: ClientsFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ClientsFacade]
    });
    facade = TestBed.inject(ClientsFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded clients through clients and ready signals', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/clients').flush([buildClient(), buildClient({ id: 'client-2', name: 'Host' })]);
    expect(facade.clients().length).toBe(2);
    expect(facade.ready()).toBeTrue();
  });

  it('refresh sets empty signal when no clients are returned', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/clients').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('loadClient populates current signal when found', () => {
    facade.loadClient('client-1').subscribe();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    expect(facade.current()?.id).toBe('client-1');
  });

  it('loadClient exposes not_found error when client does not exist', () => {
    facade.loadClient('missing').subscribe({ error: () => undefined });
    httpController.expectOne('/api/clients').flush([]);
    expect(facade.current()).toBeNull();
    expect(facade.error()?.category).toBe('not-found');
  });

  it('save creates a new client and refreshes the list', () => {
    facade.save({ name: 'Sponsor', isActive: true }).subscribe();
    const post = httpController.expectOne('/api/clients');
    expect(post.request.method).toBe('POST');
    post.flush(buildClient());
    httpController.expectOne('/api/clients').flush([buildClient()]);
  });

  it('save updates an existing client when id is provided', () => {
    facade.save({ name: 'Sponsor', isActive: false }, 'client-1').subscribe();
    const put = httpController.expectOne('/api/clients/client-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildClient({ isActive: false }));
    httpController.expectOne('/api/clients').flush([buildClient({ isActive: false })]);
  });

  it('toggleActive flips isActive and refreshes the list', () => {
    facade.toggleActive(buildClient({ isActive: true })).subscribe();
    const put = httpController.expectOne('/api/clients/client-1');
    expect(put.request.body).toEqual({ name: 'Sponsor', isActive: false });
    put.flush(buildClient({ isActive: false }));
    httpController.expectOne('/api/clients').flush([buildClient({ isActive: false })]);
  });

  it('remove issues DELETE and refreshes the list', () => {
    facade.remove('client-1').subscribe();
    const del = httpController.expectOne('/api/clients/client-1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    httpController.expectOne('/api/clients').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('remove swallows dependency errors and exposes them through error signal', () => {
    facade.remove('client-1').subscribe();
    httpController.expectOne('/api/clients/client-1').flush(
      { code: 'conflict_state', message: 'Client has active ads.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(facade.error()?.category).toBe('conflict');
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/clients').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });
});
