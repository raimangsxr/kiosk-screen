import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { AdminApiService, ApprovedDomain } from '../../admin/admin-api.service';
import { DomainsFacade } from './domains.facade';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

function buildDomain(partial: Partial<ApprovedDomain> = {}): ApprovedDomain {
  return { id: 'domain-1', domain: 'example.com', isActive: true, ...partial };
}

describe('DomainsFacade', () => {
  let facade: DomainsFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DomainsFacade]
    });
    facade = TestBed.inject(DomainsFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded domains through domains and ready signals', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/approved-domains').flush([buildDomain(), buildDomain({ id: 'd-2', domain: 'other.com' })]);
    expect(facade.domains().length).toBe(2);
    expect(facade.ready()).toBeTrue();
  });

  it('refresh sets empty signal when no domains are returned', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/approved-domains').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('refresh maps backend envelope errors to safe ApplicationErrorContract', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController
      .expectOne('/api/approved-domains')
      .flush({ code: 'permission_denied', message: 'No access', category: 'permission' }, { status: 403, statusText: 'Forbidden' });
    expect(facade.error()?.category).toBe('permission');
  });

  it('loadDomain populates current signal when found', () => {
    facade.loadDomain('domain-1').subscribe();
    httpController.expectOne('/api/approved-domains').flush([buildDomain()]);
    expect(facade.current()?.id).toBe('domain-1');
  });

  it('loadDomain exposes not_found error when domain does not exist', () => {
    facade.loadDomain('missing').subscribe({ error: () => undefined });
    httpController.expectOne('/api/approved-domains').flush([]);
    expect(facade.current()).toBeNull();
    expect(facade.error()?.category).toBe('not-found');
  });

  it('save creates a new domain and refreshes the list', () => {
    facade.save({ domain: 'example.com', isActive: true }).subscribe();
    const post = httpController.expectOne('/api/approved-domains');
    expect(post.request.method).toBe('POST');
    post.flush(buildDomain());
    httpController.expectOne('/api/approved-domains').flush([buildDomain()]);
    expect(facade.domains().length).toBe(1);
  });

  it('save updates an existing domain when id is provided', () => {
    facade.save({ domain: 'example.com', isActive: false }, 'domain-1').subscribe();
    const put = httpController.expectOne('/api/approved-domains/domain-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildDomain({ isActive: false }));
    httpController.expectOne('/api/approved-domains').flush([buildDomain({ isActive: false })]);
  });

  it('toggleActive flips isActive and refreshes the list', () => {
    facade.toggleActive(buildDomain({ isActive: true })).subscribe();
    const put = httpController.expectOne('/api/approved-domains/domain-1');
    expect(put.request.body).toEqual({ domain: 'example.com', isActive: false });
    put.flush(buildDomain({ isActive: false }));
    httpController.expectOne('/api/approved-domains').flush([buildDomain({ isActive: false })]);
  });

  it('remove issues DELETE and refreshes the list', () => {
    facade.remove('domain-1').subscribe();
    const del = httpController.expectOne('/api/approved-domains/domain-1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    httpController.expectOne('/api/approved-domains').flush([]);
    expect(facade.empty()).toBeTrue();
  });

  it('remove swallows dependency errors and exposes them through error signal', () => {
    facade.remove('domain-1').subscribe();
    httpController.expectOne('/api/approved-domains/domain-1').flush(
      { code: 'conflict_state', message: 'Domain has dependent iframe content.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(facade.error()?.category).toBe('conflict');
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/approved-domains').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('falls back to default error envelope when backend error shape is unknown', () => {
    const api = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listDomains']);
    api.listDomains.and.returnValue(throwError(() => 'totally unknown'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: AdminApiService, useValue: api }, DomainsFacade] });
    const isolated = TestBed.inject(DomainsFacade);
    isolated.refresh().subscribe({ error: () => undefined });
    const error = isolated.error();
    expect(error?.code).toBe('unexpected_error');
    expect(error?.category).toBe('unexpected');
  });
});
