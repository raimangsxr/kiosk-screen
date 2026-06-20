import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RemoteControlFacade } from './remote-control.facade';

const state = {
  contentMode: 'loop',
  selectedIframeId: null,
  selectedIframe: null,
  adsVisible: true,
  updatedAt: '2026-06-18T00:00:00Z',
  displaySessionActive: true
};

describe('RemoteControlFacade', () => {
  let facade: RemoteControlFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RemoteControlFacade, provideHttpClient(), provideHttpClientTesting()]
    });
    facade = TestBed.inject(RemoteControlFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads current state and iframe options', () => {
    facade.refresh().subscribe();

    http.expectOne('/api/display/remote-control/state').flush(state);
    http.expectOne('/api/display/remote-control/iframe-options').flush({
      items: [{ id: 'content-1', organizationId: 'org-1', url: 'https://example.org/agenda', createdAt: '2026-06-18T00:00:00Z', updatedAt: '2026-06-18T00:00:00Z' }]
    });

    expect(facade.state()?.contentMode).toBe('loop');
    expect(facade.iframeOptions().length).toBe(1);
    expect(facade.ready()).toBeTrue();
  });

  it('updates mode immediately with latest selected iframe state', () => {
    facade.setIframeMode('content-1').subscribe();

    const request = http.expectOne('/api/display/remote-control/state');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      contentMode: 'iframe',
      selectedIframeId: 'content-1',
      adsVisible: true
    });
    request.flush({ ...state, contentMode: 'iframe', selectedIframeId: 'content-1' });

    expect(facade.state()?.contentMode).toBe('iframe');
    expect(facade.state()?.selectedIframeId).toBe('content-1');
  });

  it('returns to loop mode without a selected iframe', () => {
    facade.setLoopMode().subscribe();

    const request = http.expectOne('/api/display/remote-control/state');
    expect(request.request.body).toEqual({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true
    });
    request.flush(state);

    expect(facade.state()?.contentMode).toBe('loop');
  });

  it('updates ads visibility while preserving the current content mode', () => {
    facade.setIframeMode('content-1').subscribe();
    http.expectOne('/api/display/remote-control/state').flush({
      ...state,
      contentMode: 'iframe',
      selectedIframeId: 'content-1',
      adsVisible: true
    });

    facade.setAdsVisible(false).subscribe();

    const request = http.expectOne('/api/display/remote-control/state');
    expect(request.request.body).toEqual({
      contentMode: 'iframe',
      selectedIframeId: 'content-1',
      adsVisible: false
    });
    request.flush({
      ...state,
      contentMode: 'iframe',
      selectedIframeId: 'content-1',
      adsVisible: false
    });

    expect(facade.state()?.contentMode).toBe('iframe');
    expect(facade.state()?.selectedIframeId).toBe('content-1');
    expect(facade.state()?.adsVisible).toBeFalse();
  });

  it('posts rotation navigation commands and updates state', () => {
    facade.navigate('next').subscribe();

    const request = http.expectOne('/api/display/remote-control/navigation');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ command: 'next' });
    request.flush({ ...state, navigationCommand: 'next', navigationCommandId: '11111111-1111-4111-8111-111111111111' });

    expect(facade.state()?.navigationCommand).toBe('next');
    expect(facade.state()?.navigationCommandId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('maps safe errors when update fails', () => {
    facade.setIframeMode('missing').subscribe({ error: () => undefined });

    http.expectOne('/api/display/remote-control/state').flush(
      { code: 'invalid_iframe', message: 'Selected iframe is not available.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(facade.error()?.message).toContain('Selected iframe');
  });
});
