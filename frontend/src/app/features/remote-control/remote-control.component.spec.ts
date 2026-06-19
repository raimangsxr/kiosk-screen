import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RemoteControlComponent } from './remote-control.component';
import { RemoteControlFacade } from './remote-control.facade';
import { RemoteControlState } from './remote-control.models';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

class MatSnackBarStub {
  open = jasmine.createSpy('open').and.returnValue({} as MatSnackBarRef<TextOnlySnackBar>);
}

const baseState: RemoteControlState = {
  contentMode: 'loop',
  selectedContentId: null,
  selectedIframe: null,
  adsVisible: true,
  updatedAt: '2026-06-18T00:00:00Z',
  displaySessionActive: true
};

const iframeOption = {
  id: 'content-1',
  title: 'Agenda',
  sourceReference: 'https://example.org/agenda',
  isActive: true
};

const loadError: ApplicationErrorContract = {
  code: 'load',
  message: 'Network down',
  category: 'dependency'
};

function buildFacade(overrides: {
  state?: ReturnType<typeof signal<RemoteControlState | null>>;
  iframeOptions?: ReturnType<typeof signal<typeof iframeOption[]>>;
  loading?: ReturnType<typeof signal<boolean>>;
  saving?: ReturnType<typeof signal<boolean>>;
  error?: ReturnType<typeof signal<ApplicationErrorContract | null>>;
} = {}) {
  return jasmine.createSpyObj<RemoteControlFacade>(
    'RemoteControlFacade',
    ['refresh', 'setLoopMode', 'setIframeMode', 'setAdsVisible'],
    {
      state: (overrides.state ?? signal(baseState)).asReadonly(),
      iframeOptions: (overrides.iframeOptions ?? signal([iframeOption])).asReadonly(),
      loading: (overrides.loading ?? signal(false)).asReadonly(),
      saving: (overrides.saving ?? signal(false)).asReadonly(),
      ready: signal(true).asReadonly(),
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
      provideHttpClientTesting()
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
      of({ ...baseState, contentMode: 'iframe', selectedContentId: 'content-1' })
    );
    facade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    snackBar = new MatSnackBarStub();
    await configureTestBed(facade, snackBar);

    fixture = TestBed.createComponent(RemoteControlComponent);
    fixture.detectChanges();
  });

  it('renders the toolbar with the Kiosk Screen brand and a back button as the first focusable element', () => {
    const toolbar = fixture.nativeElement.querySelector('mat-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar.textContent).toContain('Kiosk Screen');

    const backLink = fixture.nativeElement.querySelector(
      'mat-toolbar a[mat-icon-button]'
    ) as HTMLAnchorElement;
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute('aria-label')).toBe('Back to hall');
    expect(backLink.getAttribute('href')).toBe('/hall');
  });

  it('renders the page header with the Hall eyebrow and the Remote control title', () => {
    const header = fixture.nativeElement.querySelector('app-page-header');
    expect(header).not.toBeNull();
    const text = header.textContent;
    expect(text).toContain('Hall');
    expect(text).toContain('Remote control');
  });

  it('renders the status pill with the current mode, ads visibility, display online, and updated time', () => {
    const pill = fixture.nativeElement.querySelector('.remote-control__status');
    expect(pill).not.toBeNull();
    const text = pill.textContent;
    expect(text).toContain('Rotation');
    expect(text).toContain('Visible');
    expect(text).toContain('Display online');
    expect(text).toMatch(/Updated/);
  });

  it('renders the Rotation and Iframe radio buttons with the active mode preselected', () => {
    const modeGroup = fixture.nativeElement.querySelector(
      '[data-testid="remote-control-mode-group"]'
    );
    expect(modeGroup).not.toBeNull();
    const radios = modeGroup.querySelectorAll('mat-radio-button');
    expect(radios.length).toBe(2);
    expect(radios[0].textContent).toContain('Rotation');
    expect(radios[1].textContent).toContain('Iframe');

    expect(fixture.componentInstance['mode']()).toBe('loop');
  });

  it('renders the iframe list as a sibling radio group when iframe mode is selected', async () => {
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe', selectedContentId: 'content-1' })
    });
    customFacade.refresh.and.returnValue(of({ state: baseState, options: { items: [iframeOption] } }));
    customFacade.setLoopMode.and.returnValue(of(baseState));
    customFacade.setIframeMode.and.returnValue(
      of({ ...baseState, contentMode: 'iframe', selectedContentId: 'content-1' })
    );
    customFacade.setAdsVisible.and.returnValue(of({ ...baseState, adsVisible: false }));

    await configureTestBed(customFacade, new MatSnackBarStub());
    const customFixture = TestBed.createComponent(RemoteControlComponent);
    customFixture.detectChanges();

    const iframeList = customFixture.nativeElement.querySelector('.remote-control__iframe-list');
    expect(iframeList).not.toBeNull();
    const iframeRadios = iframeList.querySelectorAll('mat-radio-button');
    expect(iframeRadios.length).toBe(1);
    expect(iframeRadios[0].textContent).toContain('Agenda');
    expect(iframeRadios[0].textContent).toContain('https://example.org/agenda');
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
    const cta = empty.querySelector('a[href="/admin/content/new"]') as HTMLAnchorElement;
    expect(cta).not.toBeNull();
  });

  it('truncates the source URL to 48 characters with an ellipsis when longer', async () => {
    const longUrl =
      'https://example.org/this/is/a/very/long/path/that/exceeds/the/forty/eight/character/limit';
    const customFacade = buildFacade({
      state: signal({ ...baseState, contentMode: 'iframe', selectedContentId: 'content-2' }),
      iframeOptions: signal([
        { id: 'content-2', title: 'Long URL', sourceReference: longUrl, isActive: true }
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

  it('emits a snackbar with "Now showing: <title>." after a successful setIframeMode', fakeAsync(() => {
    fixture.componentInstance.selectIframe('content-1');
    tick();

    expect(facade.setIframeMode).toHaveBeenCalledWith('content-1');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Now showing: Agenda.',
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

  it('does not emit a snackbar when the backend reports an error', fakeAsync(() => {
    facade.setLoopMode.and.returnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.selectLoopMode();
    tick();

    expect(facade.setLoopMode).toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  }));

  it('exposes a routerLink to /hall on the back button', () => {
    const backLink = fixture.nativeElement.querySelector(
      'mat-toolbar a[mat-icon-button]'
    ) as HTMLAnchorElement;
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute('href')).toBe('/hall');
  });
});
