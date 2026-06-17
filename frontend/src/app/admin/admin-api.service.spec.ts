import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AdminApiService } from './admin-api.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('updates approved domains through the documented API contract', () => {
    service.updateDomain('domain-1', { domain: 'example.com', isActive: true }).subscribe();

    const request = http.expectOne('/api/approved-domains/domain-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({ domain: 'example.com', isActive: true });
    request.flush({ id: 'domain-1', domain: 'example.com', isActive: true });
  });

  it('creates users with active status and role assignments', () => {
    service.createUser({
      email: 'operator@example.com',
      displayName: 'Operator',
      isActive: true,
      roles: ['event_operator']
    }).subscribe();

    const request = http.expectOne('/api/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body.roles).toEqual(['event_operator']);
    request.flush({ id: 'user-1', ...request.request.body });
  });
});
