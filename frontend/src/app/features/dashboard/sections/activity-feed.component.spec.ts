import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ActivityFeedComponent } from './activity-feed.component';

describe('ActivityFeedComponent', () => {
  let fixture: ComponentFixture<ActivityFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityFeedComponent, NoopAnimationsModule]
    }).compileComponents();
    fixture = TestBed.createComponent(ActivityFeedComponent);
  });

  it('shows empty state when there are no items', () => {
    fixture.componentRef.setInput('activity', { items: [] });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin actividad');
  });

  it('shows error state when degraded', () => {
    fixture.componentRef.setInput('degraded', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Actividad no disponible');
  });

  it('renders items newest-first', () => {
    fixture.componentRef.setInput('activity', {
      items: [
        {
          id: '2',
          eventType: 'mode_changed',
          severity: 'info',
          message: 'Segundo',
          createdAt: '2026-07-08T11:00:00.000Z'
        },
        {
          id: '1',
          eventType: 'mode_changed',
          severity: 'warning',
          message: 'Primero',
          createdAt: '2026-07-08T10:00:00.000Z'
        }
      ]
    });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    const messages = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.activity__message')).map(
      (node) => node.textContent?.trim()
    );
    expect(messages).toEqual(['Segundo', 'Primero']);
  });
});
