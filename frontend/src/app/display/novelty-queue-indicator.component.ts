import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { NoveltyQueueTrackerService } from './novelty-queue-tracker.service';

@Component({
  selector: 'app-novelty-queue-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tracker.hasEntries()) {
      <div class="novelty-indicator" aria-hidden="true" data-testid="novelty-queue-indicator">
        @for (entry of tracker.visibleIcons(); track entry.contentId) {
          <span
            class="novelty-indicator__icon"
            [class.novelty-indicator__icon--ready]="entry.downloadStatus === 'ready'"
            [class.novelty-indicator__icon--error]="entry.downloadStatus === 'error'"
            [attr.data-content-id]="entry.contentId"
          >
            @if (entry.contentType === 'video') {
              <span class="novelty-indicator__glyph" aria-hidden="true">▶</span>
            } @else {
              <span class="novelty-indicator__glyph" aria-hidden="true">◻</span>
            }
            @if (entry.downloadStatus === 'ready') {
              <span class="novelty-indicator__check" data-testid="novelty-check">✓</span>
            }
            @if (entry.downloadStatus === 'error') {
              <span class="novelty-indicator__error" data-testid="novelty-error">!</span>
            }
          </span>
        }
        @if (tracker.overflowCount() > 0) {
          <span class="novelty-indicator__overflow" data-testid="novelty-overflow">
            +{{ tracker.overflowCount() }}
          </span>
        }
      </div>
    }
  `,
  styleUrl: './novelty-queue-indicator.component.css',
})
export class NoveltyQueueIndicatorComponent {
  protected readonly tracker = inject(NoveltyQueueTrackerService);
}
