import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AdminRouteContextService } from './admin-route-context.service';
import { AdminShellComponent } from '../../features/admin-shell/admin-shell.component';

@Component({ selector: 'app-stub', standalone: true, template: '' })
class StubComponent {}

describe('AdminRouteContextService', () => {
  let service: AdminRouteContextService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'admin',
            component: AdminShellComponent,
            children: [
              { path: '', component: StubComponent },
              { path: 'content/:id/edit', component: StubComponent }
            ]
          }
        ])
      ]
    });
    service = TestBed.inject(AdminRouteContextService);
    router = TestBed.inject(Router);
  });

  it('resolves panel title for /admin', async () => {
    await router.navigateByUrl('/admin');
    expect(service.title()).toBe('Panel');
    expect(service.subtitle()).toBeNull();
  });

  it('resolves edit subtitle for content edit routes', async () => {
    await router.navigateByUrl('/admin/content/item-1/edit');
    expect(service.title()).toBe('Contenido');
    expect(service.subtitle()).toBe('Editar');
    expect(service.breadcrumbs().length).toBeGreaterThan(0);
  });
});
