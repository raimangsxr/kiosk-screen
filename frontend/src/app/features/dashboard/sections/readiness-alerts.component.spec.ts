import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ReadinessAlertsComponent } from './readiness-alerts.component';

describe('ReadinessAlertsComponent', () => {
  let fixture: ComponentFixture<ReadinessAlertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadinessAlertsComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(ReadinessAlertsComponent);
  });

  it('renders resolver link for blockers', () => {
    fixture.componentRef.setInput('readiness', {
      ready: false,
      blockers: [{ message: 'Sin contenido activo', resolveRoute: '/admin/content' }],
      warnings: []
    });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href="/admin/content"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Resolver');
  });
});
