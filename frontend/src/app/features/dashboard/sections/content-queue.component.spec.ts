import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ContentQueueComponent } from './content-queue.component';

describe('ContentQueueComponent', () => {
  let fixture: ComponentFixture<ContentQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentQueueComponent, NoopAnimationsModule]
    }).compileComponents();
    fixture = TestBed.createComponent(ContentQueueComponent);
  });

  it('renders entries in display order with recurring label', () => {
    fixture.componentRef.setInput('queue', {
      activeContentCount: 2,
      entries: [
        {
          id: '1',
          title: 'Primero',
          displayOrder: 1,
          kind: 'regular',
          recurringEveryXIterations: null,
          isPinnedNow: false
        },
        {
          id: '2',
          title: 'Recurrente',
          displayOrder: 2,
          kind: 'recurring',
          recurringEveryXIterations: 4,
          isPinnedNow: false
        }
      ]
    });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text.indexOf('Primero')).toBeLessThan(text.indexOf('Recurrente'));
    expect(text).toContain('Recurrente cada 4');
  });

  it('highlights pinned row', () => {
    fixture.componentRef.setInput('queue', {
      activeContentCount: 1,
      entries: [
        {
          id: '1',
          title: 'Fijado',
          displayOrder: 1,
          kind: 'fixed-eligible',
          recurringEveryXIterations: null,
          isPinnedNow: true
        }
      ]
    });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.queue__item--pinned')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fijado ahora');
  });

  it('truncates long titles with ellipsis styles', () => {
    fixture.componentRef.setInput('queue', {
      activeContentCount: 1,
      entries: [
        {
          id: '1',
          title: 'Título muy largo que debería truncarse en la interfaz del panel de operaciones',
          displayOrder: 1,
          kind: 'regular',
          recurringEveryXIterations: null,
          isPinnedNow: false
        }
      ]
    });
    fixture.componentRef.setInput('degraded', false);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.queue__title') as HTMLElement;
    expect(getComputedStyle(title).textOverflow).toBe('ellipsis');
  });
});
