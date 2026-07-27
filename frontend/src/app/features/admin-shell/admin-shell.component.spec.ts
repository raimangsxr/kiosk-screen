import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { provideRouter, Router, Routes } from '@angular/router';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

import { AdminRouteContextService } from '../../core/layout/admin-route-context.service';
import { AdminShellComponent } from './admin-shell.component';

@Component({ selector: 'app-stub-page', standalone: true, template: '' })
class StubPageComponent {}

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

function emitBreakpoints(
  observer: BreakpointObserverStub,
  breakpoints: Partial<Record<keyof typeof Breakpoints, boolean>>
): void {
  const next: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(breakpoints)) {
    next[Breakpoints[key as keyof typeof Breakpoints]] = Boolean(value);
  }
  observer.events.next({
    matches: false,
    breakpoints: next
  });
}

const stubRoutes: Routes = [
  {
    path: 'admin',
    component: AdminShellComponent,
    children: [
      { path: '', component: StubPageComponent },
      { path: 'remote-control', component: StubPageComponent },
      { path: 'users', component: StubPageComponent },
      { path: 'content/:id/edit', component: StubPageComponent }
    ]
  }
];

describe('AdminShellComponent', () => {
  let breakpointObserver: BreakpointObserverStub;

  beforeEach(() => {
    localStorage.clear();
    breakpointObserver = new BreakpointObserverStub();
    TestBed.configureTestingModule({
      imports: [AdminShellComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(stubRoutes),
        { provide: BreakpointObserver, useValue: breakpointObserver }
      ]
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders grouped navigation with Spanish labels and kiosk entry', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Operación');
    expect(text).toContain('Contenido');
    expect(text).toContain('Usuarios');
    expect(text).toContain('Control remoto');
    expect(text).toContain('Volver al hall');
    expect(text).toContain('Abrir display');
  });

  it('renders the brand in the sidebar rail', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('.rail__brand');
    expect(brand?.textContent).toContain('Kiosk Screen');
  });

  it('shows menu button on compact non-handset viewports', () => {
    emitBreakpoints(breakpointObserver, {
      HandsetPortrait: false,
      XSmall: true,
      Small: false,
      Medium: false,
      Large: false,
      XLarge: false
    });

    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Abrir navegación"]')).not.toBeNull();
  });

  it('updates route context title when navigation changes', async () => {
    const router = TestBed.inject(Router);
    const routeContext = TestBed.inject(AdminRouteContextService);
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/admin');
    fixture.detectChanges();
    expect(routeContext.title()).toBe('Panel');

    await router.navigateByUrl('/admin/users');
    fixture.detectChanges();
    expect(routeContext.title()).toBe('Usuarios');

    await router.navigateByUrl('/admin/remote-control');
    fixture.detectChanges();
    expect(routeContext.title()).toBe('Control remoto');
  });

  it('exposes edit subtitle on deep routes', async () => {
    const router = TestBed.inject(Router);
    const routeContext = TestBed.inject(AdminRouteContextService);
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/admin/content/abc/edit');
    fixture.detectChanges();
    expect(routeContext.subtitle()).toBe('Editar');
  });

  it('renders the breadcrumb trail with the active section in the topbar', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/users');
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const crumbs = fixture.nativeElement.querySelector('.crumbs');
    expect(crumbs).not.toBeNull();
    expect(crumbs.textContent).toContain('Administración');
    expect(crumbs.textContent).toContain('Usuarios');
  });
});
