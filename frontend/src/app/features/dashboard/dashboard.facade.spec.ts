import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { DashboardFacade, buildLiveKiosksSlice, deriveContextualActions } from './dashboard.facade';

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DashboardFacade]
    });
    facade = TestBed.inject(DashboardFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function flushLiveKiosks(items: unknown[] = []): void {
    http.expectOne('/api/admin/display/kiosks/live').flush(items);
  }

  function flushHappyPath(): void {
    http.expectOne('/api/readiness').flush({
      ready: true,
      blockers: [],
      warnings: []
    });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([
      {
        id: 'c1',
        title: 'Foto 1',
        contentType: 'photo',
        sourceReference: 'x',
        isActive: true,
        displayOrder: 1
      }
    ]);
    http.expectOne('/api/events').flush([]);
  }

  it('folds readiness, live, content, and activity when all sources succeed', async () => {
    const promise = firstValueFrom(facade.load());
    flushHappyPath();
    const state = await promise;
    expect(state.degradedSections).toEqual([]);
    expect(state.readiness?.ready).toBeTrue();
    expect(state.live?.contentMode).toBe('loop');
    expect(state.liveKiosks?.items).toEqual([]);
    expect(state.queue?.activeContentCount).toBe(1);
    expect(state.activity?.items).toEqual([]);
  });

  it('degrades only readiness when readiness endpoint fails', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush('boom', { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/events').flush([]);
    const state = await promise;
    expect(state.readiness).toBeNull();
    expect(state.degradedSections).toContain('Comprobación');
    expect(state.live).not.toBeNull();
  });

  it('degrades only live status when remote control endpoint fails', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush('boom', { status: 500, statusText: 'Error' });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/events').flush([]);
    const state = await promise;
    expect(state.live).toBeNull();
    expect(state.degradedSections).toContain('Estado en vivo');
  });

  it('degrades only content when content list fails', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush('boom', { status: 500, statusText: 'Error' });
    http.expectOne('/api/events').flush([]);
    const state = await promise;
    expect(state.queue).toBeNull();
    expect(state.degradedSections).toContain('Contenido');
  });

  it('degrades activity when events endpoint fails', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/events').flush('boom', { status: 500, statusText: 'Error' });
    const state = await promise;
    expect(state.activity).toBeNull();
    expect(state.degradedSections).toContain('Actividad');
  });

  it('maps activity events newest-first and caps at 15 items', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([]);
    const events = Array.from({ length: 20 }, (_, index) => ({
      id: `e-${index}`,
      eventType: 'mode_changed',
      severity: 'info',
      message: `Event ${index}`,
      createdAt: `2026-07-08T${String(index).padStart(2, '0')}:00:00.000Z`
    }));
    http.expectOne('/api/events').flush(events);
    const state = await promise;
    expect(state.activity?.items.length).toBe(15);
    expect(state.activity?.items[0]?.id).toBe('e-19');
  });

  it('classifies recurring and fixed-eligible queue entries and flags unresolved pinned content', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'fixed',
      selectedIframeId: null,
      selectedFixedContentId: 'missing',
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    flushLiveKiosks();
    http.expectOne('/api/content').flush([
      {
        id: 'r1',
        title: 'Recurrente',
        contentType: 'photo',
        sourceReference: 'a',
        isActive: true,
        displayOrder: 2,
        recurringEveryXIterations: 3
      },
      {
        id: 'f1',
        title: 'Fijo',
        contentType: 'photo',
        sourceReference: 'b',
        isActive: true,
        displayOrder: 1,
        isFixed: true
      },
      {
        id: 'n1',
        title: 'Novedad',
        contentType: 'photo',
        sourceReference: 'c',
        isActive: true,
        displayOrder: 0,
        isNovelty: true
      }
    ]);
    http.expectOne('/api/events').flush([]);
    const state = await promise;
    expect(state.queue?.activeContentCount).toBe(2);
    expect(state.queue?.entries.map((entry) => entry.kind)).toEqual(['fixed-eligible', 'recurring']);
    expect(state.live?.pinnedContentUnresolved).toBeTrue();
  });

  it('degrades live kiosks when layout live endpoint fails', async () => {
    const promise = firstValueFrom(facade.load());
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    http.expectOne('/api/admin/display/kiosks/live').flush('boom', { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/events').flush([]);
    const state = await promise;
    expect(state.liveKiosks).toBeNull();
    expect(state.degradedSections).toContain('Pantallas conectadas');
  });
});

describe('buildLiveKiosksSlice', () => {
  it('maps live kiosk rows for dashboard', () => {
    const slice = buildLiveKiosksSlice([
      {
        kioskId: 'k1',
        displayLabel: 'Sala A',
      },
    ]);
    expect(slice.items[0]?.displayLabel).toBe('Sala A');
    expect(slice.items[0]?.kioskId).toBe('k1');
  });
});

describe('deriveContextualActions', () => {
  it('prioritizes first blocker and omits hero duplicate routes', () => {
    const actions = deriveContextualActions({
      readiness: {
        ready: false,
        blockers: [{ message: 'Sin contenido activo', resolveRoute: '/admin/content' }],
        warnings: []
      },
      live: {
        displaySessionActive: false,
        contentMode: 'loop',
        adsVisible: true,
        updatedAt: '2026-07-08T10:00:00.000Z',
        pinnedContentId: null,
        pinnedContentTitle: null,
        pinnedContentUnresolved: false
      },
      queue: { entries: [], activeContentCount: 0 }
    });
    expect(actions.some((action) => action.route === '/display')).toBeFalse();
    expect(actions[0]?.route).toBe('/admin/content');
    expect(actions.some((action) => action.label === 'Añadir contenido')).toBeTrue();
  });
});
