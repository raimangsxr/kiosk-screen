import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

import { ReadinessApiService, ReadinessReport } from '../../core/api/readiness.api';
import { ReadinessFacade } from './readiness.facade';
import { ReadinessComponent } from './readiness.component';

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

function buildReport(partial: Partial<ReadinessReport> = {}): ReadinessReport {
  return { ready: false, blockers: ['Missing ad'], warnings: [], ...partial };
}

describe('ReadinessFacade', () => {
  let facade: ReadinessFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReadinessFacade]
    });
    facade = TestBed.inject(ReadinessFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded report and signals', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/readiness').flush(buildReport());
    expect(facade.report()?.ready).toBeFalse();
    expect(facade.blockers()).toEqual(['Missing ad']);
    expect(facade.blocked()).toBeTrue();
  });

  it('refresh sets ready when report is ready', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/readiness').flush(buildReport({ ready: true, blockers: [], warnings: [] }));
    expect(facade.ready()).toBeTrue();
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/readiness').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });
});

describe('ReadinessComponent (Material)', () => {
  let fixture: ComponentFixture<ReadinessComponent>;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReadinessComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: new BreakpointObserverStub() }
      ]
    });
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReadinessComponent);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('resolves blocker messages to the right admin section', () => {
    const component = fixture.componentInstance;
    expect(component.resolveRoute('No content available')).toBe('/admin/content');
    expect(component.resolveRoute('Missing ad image')).toBe('/admin/ads');
    expect(component.resolveRoute('Missing iframe')).toBe('/admin/iframes');
    expect(component.resolveRoute('Display configuration incomplete')).toBe('/admin/configuration');
    expect(component.resolveRoute('No user with role')).toBe('/admin/users');
    expect(component.resolveRoute('Unknown blocker')).toBe('/admin');
  });

  it('renders blocked state with blockers and resolve links', () => {
    fixture.detectChanges();
    httpController.expectOne('/api/readiness').flush(buildReport({ blockers: ['Missing ad image', 'No client'] }));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bloqueado');
    expect(text).toContain('Missing ad image');
    expect(text).toContain('No client');
    expect(text).toContain('Resolver');
  });

  it('renders ready state when report says ready', () => {
    fixture.detectChanges();
    httpController.expectOne('/api/readiness').flush(buildReport({ ready: true, blockers: [] }));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Listo para abrir el quiosco');
  });

  it('uses Comprobación as the page title and description', () => {
    fixture.detectChanges();
    httpController.expectOne('/api/readiness').flush(buildReport({ ready: true, blockers: [] }));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Comprobación');
    expect(text).toContain(
      'Verifica que la configuración del quiosco esté completa antes del evento.'
    );
  });
});
