import { TestBed } from '@angular/core/testing';

import { NoveltyQueueIndicatorComponent } from './novelty-queue-indicator.component';
import { NoveltyQueueTrackerService } from './novelty-queue-tracker.service';

describe('NoveltyQueueIndicatorComponent', () => {
  it('renders icons, check, error, and overflow badge', () => {
    const tracker = {
      hasEntries: () => true,
      visibleIcons: () => [
        { contentId: 'a', contentType: 'photo' as const, downloadStatus: 'ready' as const, displayOrder: 0 },
        { contentId: 'b', contentType: 'video' as const, downloadStatus: 'error' as const, displayOrder: 1 },
      ],
      overflowCount: () => 2,
    };

    TestBed.configureTestingModule({
      imports: [NoveltyQueueIndicatorComponent],
      providers: [{ provide: NoveltyQueueTrackerService, useValue: tracker }],
    });

    const fixture = TestBed.createComponent(NoveltyQueueIndicatorComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="novelty-queue-indicator"]')).toBeTruthy();
    expect(element.querySelectorAll('.novelty-indicator__icon').length).toBe(2);
    expect(element.querySelector('[data-testid="novelty-check"]')).toBeTruthy();
    expect(element.querySelector('[data-testid="novelty-error"]')).toBeTruthy();
    expect(element.querySelector('[data-testid="novelty-overflow"]')?.textContent).toContain('+2');
  });

  it('is hidden when tracker has no entries', () => {
    const tracker = {
      hasEntries: () => false,
      visibleIcons: () => [],
      overflowCount: () => 0,
    };

    TestBed.configureTestingModule({
      imports: [NoveltyQueueIndicatorComponent],
      providers: [{ provide: NoveltyQueueTrackerService, useValue: tracker }],
    });

    const fixture = TestBed.createComponent(NoveltyQueueIndicatorComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="novelty-queue-indicator"]')).toBeNull();
  });
});
