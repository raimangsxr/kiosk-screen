import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { OperationsHeroComponent } from './operations-hero.component';
import { LiveStatusSlice, ReadinessSlice } from '../dashboard.models';

describe('OperationsHeroComponent', () => {
  let fixture: ComponentFixture<OperationsHeroComponent>;

  const readiness: ReadinessSlice = {
    ready: true,
    blockers: [],
    warnings: []
  };

  const live: LiveStatusSlice = {
    displaySessionActive: true,
    contentMode: 'loop',
    adsVisible: true,
    updatedAt: '2026-07-08T10:00:00.000Z',
    pinnedContentId: null,
    pinnedContentTitle: null,
    pinnedContentUnresolved: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsHeroComponent, NoopAnimationsModule],
      providers: [provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(OperationsHeroComponent);
  });

  it('renders Spanish live status labels when ready and online', () => {
    fixture.componentRef.setInput('readiness', readiness);
    fixture.componentRef.setInput('live', live);
    fixture.componentRef.setInput('liveDegraded', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Display en línea');
    expect(text).toContain('Rotación');
    expect(text).toContain('Visible');
    expect(text).toContain('Abrir display');
    expect(text).toContain('Control remoto');
  });

  it('shows retry control when live slice is degraded', () => {
    fixture.componentRef.setInput('liveDegraded', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('shows unresolved pinned label in fixed mode', () => {
    fixture.componentRef.setInput('readiness', readiness);
    fixture.componentRef.setInput('live', {
      ...live,
      contentMode: 'fixed',
      pinnedContentId: 'missing',
      pinnedContentUnresolved: true
    });
    fixture.componentRef.setInput('liveDegraded', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Contenido no disponible');
  });
});
