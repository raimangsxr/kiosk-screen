import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { Component } from '@angular/core';

import { BreadcrumbComponent } from './breadcrumb.component';

@Component({ selector: 'app-admin-stub', standalone: true, template: '' })
class AdminStubComponent {}

@Component({ selector: 'app-edit-stub', standalone: true, template: '' })
class EditStubComponent {}

const testRoutes: Routes = [
  { path: 'admin', component: AdminStubComponent },
  { path: 'admin/content', component: AdminStubComponent },
  { path: 'admin/content/:id/edit', component: EditStubComponent }
];

describe('BreadcrumbComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter(testRoutes)]
    });
  });

  function goTo(url: string): Promise<boolean> {
    const router = TestBed.inject(Router);
    return router.navigateByUrl(url);
  }

  it('renders nothing for non-admin routes', async () => {
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.breadcrumb')).toBeNull();
  });

  it('renders the Panel crumb on /admin', async () => {
    await goTo('/admin');
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.breadcrumb__current')?.textContent).toContain(
      'Panel'
    );
  });

  it('renders a trail of section + edit crumb for /admin/content/:id/edit', async () => {
    await goTo('/admin/content/abc-1/edit');
    const fixture = TestBed.createComponent(BreadcrumbComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('.breadcrumb__link');
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain('Contenido');
    expect(links[0].getAttribute('href')).toBe('/admin/content');
    const current = fixture.nativeElement.querySelector('.breadcrumb__current');
    expect(current?.textContent).toContain('Editar');
  });
});