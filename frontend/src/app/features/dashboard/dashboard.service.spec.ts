import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { AdminDashboardService } from './dashboard.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AdminDashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function flushAllOk(): void {
    http.expectOne('/api/readiness').flush({
      ready: true,
      blockers: [],
      warnings: []
    });
    http.expectOne('/api/display/configuration').flush({
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 5,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 10,
      defaultAdDurationSeconds: 10,
      isEnabled: true
    });
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/ads').flush([]);
    http.expectOne('/api/iframes').flush({ items: [] });
    http.expectOne('/api/event-configuration').flush({
      eventName: 'Spring Summit',
      organizerName: 'ACME',
      organizerLogoUrl: null,
      eventDurationMinutes: 240
    });
    http.expectOne('/api/users').flush([]);
  }

  it('folds every endpoint into a ready dashboard when all are healthy', async () => {
    const promise = firstValueFrom(service.load());
    flushAllOk();
    const state = await promise;
    expect(state.setupStatus).toBe('ready');
    expect(state.degradedSections).toEqual([]);
    expect(state.sectionSummaries.length).toBe(6);
    expect(state.sectionSummaries.find((s) => s.label === 'Contenido')?.value).toBe('0 elementos');
    expect(state.sectionSummaries.find((s) => s.label === 'Pantalla')?.status).toBe('ready');
  });

  it('marks only the failing section as degraded when one endpoint errors', async () => {
    const promise = firstValueFrom(service.load());

    http.expectOne('/api/readiness').flush({
      ready: true,
      blockers: [],
      warnings: []
    });
    http.expectOne('/api/display/configuration').flush({
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 5,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 10,
      defaultAdDurationSeconds: 10,
      isEnabled: true
    });
    http.expectOne('/api/content').flush('boom', { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/ads').flush([]);
    http.expectOne('/api/iframes').flush({ items: [] });
    http.expectOne('/api/event-configuration').flush({
      eventName: '',
      organizerName: '',
      organizerLogoUrl: null,
      eventDurationMinutes: 240
    });
    http.expectOne('/api/users').flush([]);

    const state = await promise;
    expect(state.setupStatus).toBe('degraded');
    expect(state.degradedSections).toEqual(['Contenido']);
    const content = state.sectionSummaries.find((s) => s.label === 'Contenido');
    expect(content?.status).toBe('degraded');
    expect(content?.value).toBe('—');
    // Other sections kept their real values.
    expect(state.sectionSummaries.find((s) => s.label === 'Anuncios')?.value).toBe('0 anuncios');
  });

  it('falls back to degraded when the readiness endpoint errors', async () => {
    const promise = firstValueFrom(service.load());

    http.expectOne('/api/readiness').flush('boom', {
      status: 503,
      statusText: 'Service Unavailable'
    });
    http.expectOne('/api/display/configuration').flush({
      id: 'config-1',
      name: 'Main',
      topRegionRatio: 5,
      bottomRegionRatio: 1,
      defaultTopDurationSeconds: 10,
      defaultAdDurationSeconds: 10,
      isEnabled: true
    });
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/ads').flush([]);
    http.expectOne('/api/iframes').flush({ items: [] });
    http.expectOne('/api/event-configuration').flush({
      eventName: '',
      organizerName: '',
      organizerLogoUrl: null,
      eventDurationMinutes: 240
    });
    http.expectOne('/api/users').flush([]);

    const state = await promise;
    expect(state.setupStatus).toBe('degraded');
    expect(state.degradedSections[0]).toBe('Readiness');
    // blockers / warnings are not populated when readiness is degraded.
    expect(state.blockers).toEqual([]);
    expect(state.warnings).toEqual([]);
  });

  it('reports multiple degraded sections when several endpoints fail', async () => {
    const promise = firstValueFrom(service.load());

    http.expectOne('/api/readiness').flush({
      ready: true,
      blockers: [],
      warnings: []
    });
    http.expectOne('/api/display/configuration').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/ads').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });
    http.expectOne('/api/iframes').flush({ items: [] });
    http.expectOne('/api/event-configuration').flush({
      eventName: '',
      organizerName: '',
      organizerLogoUrl: null,
      eventDurationMinutes: 240
    });
    http.expectOne('/api/users').flush([]);

    const state = await promise;
    expect(state.degradedSections).toContain('Pantalla');
    expect(state.degradedSections).toContain('Anuncios');
  });
});