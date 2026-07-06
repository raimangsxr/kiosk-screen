import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

import { AdminListComponent } from './admin-list.component';

@Component({ selector: 'app-stub', standalone: true, template: '' })
class StubComponent {}

@Component({
  standalone: true,
  imports: [AdminListComponent],
  template: `
    <app-admin-list
      title="Lista"
      [loading]="false"
      [empty]="false"
      [primaryAction]="{ label: 'Crear', route: '/new' }"
      [refreshAction]="{ label: 'Actualizar' }"
    >
      <ng-template #adminListTable>TABLE</ng-template>
      <ng-template #adminListCards>CARDS</ng-template>
    </app-admin-list>
  `
})
class HostComponent {}

@Component({
  standalone: true,
  imports: [AdminListComponent],
  template: `
    <app-admin-list title="Lista" [loading]="false" [empty]="false" [selectedCount]="2">
      <button adminListBulk type="button" data-testid="bulk-action">Eliminar</button>
      <ng-template #adminListTable>TABLE</ng-template>
    </app-admin-list>
  `
})
class BulkHostComponent {}

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {
      [Breakpoints.HandsetPortrait]: false,
      [Breakpoints.TabletPortrait]: false,
      [Breakpoints.Large]: true,
      [Breakpoints.XLarge]: false,
      [Breakpoints.Medium]: false,
      [Breakpoints.Small]: false,
      [Breakpoints.XSmall]: false
    }
  });

  observe() {
    return this.events.asObservable();
  }
}

const routes: Routes = [{ path: '**', component: StubComponent }];

describe('AdminListComponent', () => {
  it('renders refresh control and table on expanded viewport', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [
        { provide: BreakpointObserver, useValue: new BreakpointObserverStub() },
        provideRouter(routes)
      ]
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('TABLE');
    expect(fixture.nativeElement.querySelector('[data-testid="admin-list-refresh"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="admin-list-fab"]')).toBeNull();
  });

  it('shows bulk actions when items are selected on expanded viewport', () => {
    TestBed.configureTestingModule({
      imports: [BulkHostComponent, NoopAnimationsModule],
      providers: [
        { provide: BreakpointObserver, useValue: new BreakpointObserverStub() },
        provideRouter(routes)
      ]
    });
    const fixture = TestBed.createComponent(BulkHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="admin-list-bulk-bar"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="bulk-action"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('2 seleccionado(s)');
  });
});
