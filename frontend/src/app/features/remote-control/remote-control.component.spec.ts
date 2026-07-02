import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { RemoteControlComponent } from './remote-control.component';
import { RemoteControlFacade } from './remote-control.facade';
import { RemoteControlFixedContentOption, RemoteControlState } from './remote-control.models';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

class MatSnackBarStub {
  open = jasmine.createSpy('open').and.returnValue({} as MatSnackBarRef<TextOnlySnackBar>);
}

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {}
  });

  observe() {
    return this.events.asObservable();
  }

  isMatched(_query: string | string[]): boolean {
    return false;
  }
}

const baseState: RemoteControlState = {
  contentMode: 'loop',
  selectedIframeId: null,
  selectedIframe: null,
  adsVisible: true,
  fullscreenRequested: false,
  updatedAt: '2026-06-18T00:00:00Z',
  displaySessionActive: true
};

const iframeOption = {
  id: 'content-1',
  organizationId: 'org-1',
  url: 'https://example.org/agenda',
  createdAt: '2026-06-18T00:00:00Z',
  updatedAt: '2026-06-18T00:00:00Z'
};

const loadError: ApplicationErrorContract = {
  code: 'load',
  message: 'Network down',
  category: 'dependency'
};

const fixedContentOption: RemoteControlFixedContentOption = {
  id: 'fixed-1',
  title: 'Sponsor loop',
  contentType: 'photo',
  mediaUrl: '/media/fixed-1.jpg',
  thumbnailUrl: '/media/fixed-1-thumb.jpg',
  durationSeconds: 12
};

function buildFacade(overrides: {
  state?: ReturnType<typeof signal<RemoteControlState | null>>;
  iframeOptions?: ReturnType<typeof signal<typeof iframeOption[]>>;
  fixedContentOptions?: ReturnType<typeof signal<RemoteControlFixedContentOption[]>>;
  loading?: ReturnType<typeof signal<boolean>>;
  saving?: ReturnType<typeof signal<boolean>>;
  error?: ReturnType<typeof signal<ApplicationErrorContract | null>>;
} = {}) {
  return jasmine.createSpyObj<RemoteControlFacade>(
    'RemoteControlFacade',
    ['refresh', 'setLoopMode', 'setIframeMode', 'setFixedMode', 'setAdsVisible', 'setFullscreenRequested', 'navigate'],
    {
      state: (overrides.state ?? signal(baseState)).asReadonly(),
      iframeOptions: (overrides.iframeOptions ?? signal([iframeOption])).asReadonly(),
      fixedContentOptions: (overrides.fixedContentOptions ?? signal([])).asReadonly(),
      loading: (overrides.loading ?? signal(false)).asReadonly(),
      saving: (overrides.saving ?? signal(false)).asReadonly(),
      ready: signal(true).asReadonly(),
      isPaused: signal(false).asReadonly(),
      error: (overrides.error ?? signal(null)).asReadonly()
    }
  );
}

function configureTestBed(facade: jasmine.SpyObj<RemoteControlFacade>, snackBar: MatSnackBarStub) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RemoteControlComponent, NoopAnimationsModule],
    providers: [
      { provide: RemoteControlFacade, useValue: facade },
      { provide: MatSnackBar, useValue: snackBar },
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BreakpointObserver, useValue: new BreakpointObserverStub() }
    ]
  });
  TestBed.overrideComponent(RemoteControlComponent, {
    remove: { imports: [MatSnackBarModule] }
  });
  return TestBed.compileComponents();
}

describe('RemoteControlComponent', () => {
  let fixture: ComponentFixture<RemoteControlComponent>;
  let facade: jasmine.SpyObj<RemoteControlFacade>;
  let snackBar: MatSnackBarStub;

  beforeEach(async () => {
    facade = buildFacade();
    facade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    facade.setLoopMode.and.returnValue(of(baseState));
    facade.setIframeMode.and.returnValue(
      of({ ...baseState, contentMode: 'iframe', selectedIframeId: 'content-1' })
    );
    facade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));
    facade.setFullscreenRequested.and.returnValue(of({ ...baseState, fullscreenRequested: true }));
    facade.navigate.and.returnValue(of({ ...baseState, navigationCommand: 'next', navigationCommandId: 'nav-1' }));

    snackBar = new MatSnackBarStub();
    await configureTestBed(facade, snackBar);

    fixture = TestBed.createComponent(RemoteControlComponent);
    fixture.detectChanges();
  });

  it('does not render a local toolbar because admin shell owns navigation', () => {
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });

  it('renders the page header with the Administration eyebrow and the Remote control title', () => {
    const header = fixture.nativeElement.querySelector('app-page-header');
    expect(header).not.toBeNull();
    const text = header.textContent;
    expect(text).toContain('Administration');
    expect(text).toContain('Remote control');
  });

  it('renders the status pill with the current mode, ads visibility, display online, and updated time', () => {
    const pill = fixture.nativeElement.querySelector('.remote-control__status');
    expect(pill).not.toBeNull();
    const text = pill.textContent;
    expect(text).toContain('Rotation');
    expect(text).toContain('Visible');
    expect(text).toContain('Fullscreen Off');
    expect(text).toContain('Display online');
    expect(text).toMatch(/Updated/);
  });

  it('renders the Rotation, Iframe, and Fixed radio buttons with the active mode preselected', () => {
    const modeGroup = fixture.nativeElement.querySelector(
      '[data-testid="remote-control-mode-group"]'
    );
    expect(modeGroup).not.toBeNull();
    const radios = modeGroup.querySelectorAll('mat-radio-button');
    expect(radios.length).toBe(3);
    expect(radios[0].textContent).toContain('Rotation');
    expect(radios[1].textContent).toContain('Iframe');

    expect(fixture.componentInstance['mode']()).toBe('loop');
  });

  it('renders the iframe list as a sibling radio group when iframe mode is selected', async () => {
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe', selectedIframeId: 'content-1' })
    });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(
      of({ ...baseState, contentMode: 'iframe', selectedIframeId: 'content-1' })
    );
    customFacade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const iframeList = customFixture.nativeElement.querySelector('.remote-control__iframe-list');
    expect(iframeList).not.toBeNull();
    const iframeRadios = iframeList.querySelectorAll('mat-radio-button');
    expect(iframeRadios.length).toBe(1);
    expect(iframeRadios[0].textContent).toContain('https://example.org/agenda');
    expect(iframeRadios[0].textContent).toContain('https://example.org/agenda');
    expect(iframeRadios[0].textContent).toContain('Currently showing');
  });

  it('disables the Iframe radio and shows the empty-state CTA when no iframes are configured', async () => {
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe' }),
      iframeOptions: signal([])
    });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(of(baseState));
    customFacade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const iframeRadio = customFixture.nativeElement.querySelector(
      '[data-testid="remote-control-iframe-radio"]'
    ) as HTMLElement;
    expect(iframeRadio).not.toBeNull();
    const iframeInput = iframeRadio.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(iframeInput.disabled).toBeTrue();

    const empty = customFixture.nativeElement.querySelector('.remote-control__iframe-empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain('No iframes configured');
    const cta = empty.querySelector('a[href="/admin/iframes/new"]') as HTMLAnchorElement;
    expect(cta).not.toBeNull();
  });

  it('truncates the source URL to 48 characters with an ellipsis when longer', async () => {
    const longUrl =
      'https://example.org/this/is/a/very/long/path/that/exceeds/the/forty/eight/character/limit';
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe', selectedIframeId: 'content-2' }),
      iframeOptions: signal([
        { id: 'content-2', organizationId: 'org-1', url: longUrl, createdAt: '2026-06-18T00:00:00Z', updatedAt: '2026-06-18T00:00:00Z' }
      ])
    });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(of(baseState));
    customFacade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const text = customFixture.nativeElement.textContent;
    expect(text).toContain('…');
    expect(text).not.toContain(longUrl);
  });

  it('renders fixed content options with a preview thumbnail', async () => {
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'fixed', selectedFixedContentId: 'fixed-1' }),
      fixedContentOptions: signal([fixedContentOption])
    });
    customFacade.refresh.and.returnValue(of({
      state: { ...baseState, contentMode: 'fixed', selectedFixedContentId: 'fixed-1' },
      options: { items: [iframeOption], fixedEligibleContents: [fixedContentOption] }
    }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setFixedMode.and.returnValue(of({ ...baseState, contentMode: 'fixed', selectedFixedContentId: 'fixed-1' }));
    customFacade.setAdsVisible.and.returnValue(of(baseState));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const fixedList = customFixture.nativeElement.querySelector('[data-testid="remote-control-fixed-list"]');
    expect(fixedList).not.toBeNull();
    expect(fixedList.textContent).toContain('Sponsor loop');
    const preview = fixedList.querySelector('[data-testid="remote-control-fixed-preview"]') as HTMLImageElement;
    expect(preview).not.toBeNull();
    expect(preview.getAttribute('src')).toBe('/media/fixed-1-thumb.jpg');
    expect(fixedList.textContent).toContain('Currently showing');
  });

  it('does not render mode/ads controls and shows the error block with a retry button when initial load fails', async () => {
    const customFacade = buildFacade({
      state: signal<RemoteControlState | null>(null),
      error: signal<ApplicationErrorContract | null>(loadError)
    });
    customFacade.refresh.and.returnValue(throwError(() => new Error('boom')));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    expect(customFixture.nativeElement.querySelector('mat-radio-group')).toBeNull();
    expect(customFixture.nativeElement.querySelector('mat-slide-toggle')).toBeNull();
    const error = customFixture.nativeElement.querySelector('app-admin-state');
    expect(error).not.toBeNull();
    const retry = customFixture.nativeElement.querySelector(
      '[data-testid="remote-control-retry"]'
    ) as HTMLButtonElement;
    expect(retry).not.toBeNull();
  });

  it('disables the radio group, the iframe list, and the ads toggle when saving', async () => {
    const customFacade = buildFacade({ saving: signal(true) });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(of(baseState));
    customFacade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const slideToggle = customFixture.nativeElement.querySelector(
      'mat-slide-toggle button'
    ) as HTMLButtonElement;
    expect(slideToggle.disabled).toBeTrue();
    const pill = customFixture.nativeElement.querySelector('.remote-control__status');
    expect(pill.textContent).toContain('Saving');
  });

  it('emits a snackbar with "Switched to rotation mode." after a successful setLoopMode', fakeAsync(() => {
    fixture.componentInstance.selectLoopMode();
    tick();

    expect(facade.setLoopMode).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Switched to rotation mode.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('emits a snackbar with the selected iframe URL after a successful setIframeMode', fakeAsync(() => {
    fixture.componentInstance.selectIframe('content-1');
    tick();

    expect(facade.setIframeMode).toHaveBeenCalledWith('content-1');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Now showing: https://example.org/agenda.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('emits a snackbar with "Ads are now visible." after enabling ads', fakeAsync(() => {
    fixture.componentInstance.setAdsVisible(true);
    tick();

    expect(facade.setAdsVisible).toHaveBeenCalledWith(true);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Ads are now visible.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('emits a snackbar with "Ads are now hidden." after disabling ads', fakeAsync(() => {
    fixture.componentInstance.setAdsVisible(false);
    tick();

    expect(facade.setAdsVisible).toHaveBeenCalledWith(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Ads are now hidden.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('toggles display fullscreen and shows feedback', fakeAsync(() => {
    fixture.componentInstance.setFullscreenRequested(true);
    tick();

    expect(facade.setFullscreenRequested).toHaveBeenCalledWith(true);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Fullscreen requested.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('renders rotation navigation buttons only in loop mode', async () => {
    expect(fixture.nativeElement.querySelector('[data-testid="remote-control-previous"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="remote-control-next"]')).not.toBeNull();

    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe', selectedIframeId: 'content-1' })
    });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(of(baseState));
    customFacade.setAdsVisible.and.returnValue(of(baseState));
    customFacade.navigate.and.returnValue(of(baseState));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    expect(customFixture.nativeElement.querySelector('[data-testid="remote-control-previous"]')).toBeNull();
    expect(customFixture.nativeElement.querySelector('[data-testid="remote-control-next"]')).toBeNull();
  });

  it('issues rotation navigation commands and shows feedback', fakeAsync(() => {
    fixture.componentInstance.navigateRotation('next');
    tick();
    expect(facade.navigate).toHaveBeenCalledWith('next');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Skipped to next content.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );

    fixture.componentInstance.navigateRotation('previous');
    tick();
    expect(facade.navigate).toHaveBeenCalledWith('previous');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Returned to previous content.',
      'Dismiss',
      jasmine.objectContaining({ duration: 3000 })
    );
  }));

  it('does not emit a snackbar when the backend reports an error', fakeAsync(() => {
    facade.setLoopMode.and.returnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.selectLoopMode();
    tick();

    expect(facade.setLoopMode).toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  }));

  it('does not expose a local hall link because admin shell provides it', () => {
    const hallLink = fixture.nativeElement.querySelector('a[href="/hall"]');
    expect(hallLink).toBeNull();
  });
});
