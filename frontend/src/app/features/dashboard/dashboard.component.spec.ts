import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

import { AdminDashboardComponent } from './dashboard.component';

class BreakpointObserverStub {
  readonly events = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

  observe() {
    return this.events.asObservable();
  }

  isMatched(): boolean {
    return false;
  }
}

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: BreakpointObserver, useClass: BreakpointObserverStub }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminDashboardComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function flushDashboard(): void {
    http.expectOne('/api/readiness').flush({ ready: true, blockers: [], warnings: [] });
    http.expectOne('/api/display/remote-control/state').flush({
      contentMode: 'loop',
      selectedIframeId: null,
      adsVisible: true,
      fullscreenRequested: false,
      updatedAt: '2026-07-08T10:00:00.000Z',
      displaySessionActive: true
    });
    http.expectOne('/api/content').flush([]);
    http.expectOne('/api/events').flush([]);
  }

  it('renders operations hero and removes legacy section grid', () => {
    fixture.detectChanges();
    flushDashboard();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-operations-hero')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.dashboard__grid')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Accesos rápidos');
  });
});
