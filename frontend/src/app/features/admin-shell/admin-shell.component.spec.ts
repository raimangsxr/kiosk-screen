import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { provideRouter, Router, Routes } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';

@Component({ selector: 'app-stub-page', standalone: true, template: '' })
class StubPageComponent {}

const stubRoutes: Routes = [
  {
    path: 'admin',
    component: AdminShellComponent,
    children: [
      { path: '', component: StubPageComponent },
      { path: 'users', component: StubPageComponent }
    ]
  }
];

describe('AdminShellComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AdminShellComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(stubRoutes)]
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
    expect(text).toContain('Iframe domains');
    expect(text).toContain('Content');
    expect(text).toContain('Users and roles');
    expect(text).toContain('Enter kiosk mode');

    const kioskLink = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>)
      .find((link) => link.getAttribute('href') === '/display');
    expect(kioskLink).toBeTruthy();
    expect(kioskLink?.textContent).toContain('Enter kiosk mode');
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
  });
});
