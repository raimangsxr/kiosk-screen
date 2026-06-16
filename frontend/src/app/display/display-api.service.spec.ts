import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DisplayApiService } from './display-api.service';

describe('DisplayApiService', () => {
  let service: DisplayApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DisplayApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('opens the display with credentials', () => {
    service.openDisplay().subscribe();

    const request = http.expectOne('/api/display/open');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
  });

  it('reads display state with credentials', () => {
    service.getState().subscribe();

    const request = http.expectOne('/api/display/state');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
  });
});

