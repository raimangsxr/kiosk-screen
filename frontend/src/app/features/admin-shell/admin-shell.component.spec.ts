import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { provideRouter, Router, Routes } from '@angular/router';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

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
      { path: 'users', component: StubPageComponent }
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

  it('renders accessible admin navigation with a kiosk entry', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const nav = fixture.nativeElement.querySelector('mat-nav-list');

    expect(nav?.getAttribute('aria-label')).toBe('Admin sections');
    expect(text).toContain('Iframes');
    expect(text).toContain('Content');
    expect(text).toContain('Users and roles');
    expect(text).toContain('Setup check');
    expect(text).toContain('Remote control');
    expect(text).toContain('Back to hall');
    expect(text).toContain('Enter kiosk mode');

    const hallLink = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((link) => link.getAttribute('href') === '/hall');
    expect(hallLink).toBeTruthy();
    expect(hallLink?.textContent).toContain('Back to hall');

    const kioskLink = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((link) => link.getAttribute('href') === '/display');
    expect(kioskLink).toBeTruthy();
    expect(kioskLink?.textContent).toContain('Enter kiosk mode');

    const remoteLink = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((link) => link.getAttribute('href') === '/admin/remote-control');
    expect(remoteLink).toBeTruthy();
    expect(remoteLink?.textContent).toContain('Remote control');
  });

  it('renders the brand in the admin toolbar and not in the sidenav', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const toolbar = fixture.nativeElement.querySelector('mat-toolbar');

    expect(toolbar?.textContent).toContain('Kiosk Screen');
    expect(toolbar?.textContent).toContain('Administration');

    expect(fixture.nativeElement.querySelector('[aria-label="Signed in user"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.drawer-header__user')).toBeNull();
  });

  it('updates the toolbar title when navigation changes', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    await router.navigateByUrl('/admin');
    fixture.detectChanges();
    expect(fixture.componentInstance['toolbarTitle']()).toBe('Dashboard');

    await router.navigateByUrl('/admin/users');
    fixture.detectChanges();
    expect(fixture.componentInstance['toolbarTitle']()).toBe('Users and roles');

    await router.navigateByUrl('/admin/remote-control');
    fixture.detectChanges();
    expect(fixture.componentInstance['toolbarTitle']()).toBe('Remote control');
  });

  it('hides the section breadcrumb on handset viewports', async () => {
    emitBreakpoints(breakpointObserver, {
      HandsetPortrait: true,
      XSmall: true,
      Small: false,
      Medium: false,
      Large: false,
      XLarge: false
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/users');
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-breadcrumb')).toBeNull();
  });

  it('renders the section breadcrumb on desktop viewports', async () => {
    emitBreakpoints(breakpointObserver, {
      HandsetPortrait: false,
      Web: true,
      XSmall: false,
      Small: false,
      Medium: false,
      Large: true,
      XLarge: false
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/admin/users');
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-breadcrumb')).not.toBeNull();
  });
});
