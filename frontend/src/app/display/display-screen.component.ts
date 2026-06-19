import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DisplayAdItem, DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

type DisplayRenderableItem = Pick<
  DisplayContentItem,
  'sourceReference' | 'mediaFile' | 'rotationAnimation' | 'effectiveRotationAnimation'
>;

@Component({
  selector: 'app-display-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="display-screen" aria-label="Kiosk display">
      <section class="top-region" aria-label="Main content">
        <ng-container *ngIf="currentContent; else contentFallback">
          <img
            *ngIf="currentContent.contentType === 'photo'"
            [src]="mediaSource(currentContent)"
            [alt]="currentContent.title"
            [class]="animationClass(currentContent)"
            data-testid="display-content"
          />
          <video
            *ngIf="currentContent.contentType === 'video'"
            [src]="mediaSource(currentContent)"
            muted
            autoplay
            loop
            [class]="animationClass(currentContent)"
            data-testid="display-content"
          ></video>
          <iframe
            *ngIf="currentContent.contentType === 'embedded_web'"
            [src]="currentContent.sourceReference"
            [title]="currentContent.title"
            data-testid="display-content"
          ></iframe>
          <div class="content-label">{{ currentContent.title }}</div>
        </ng-container>
        <ng-template #contentFallback>
          <div class="fallback" data-testid="display-fallback">Content unavailable</div>
        </ng-template>
      </section>

      <section class="ad-region" aria-label="Client ads">
        <ng-container *ngIf="visibleAds.length; else adFallback">
          <figure *ngFor="let ad of visibleAds">
            <img [src]="mediaSource(ad)" [alt]="ad.label" [class]="animationClass(ad)" />
            <figcaption>{{ ad.label }}</figcaption>
          </figure>
        </ng-container>
        <ng-template #adFallback>
          <div class="fallback">Ads unavailable</div>
        </ng-template>
      </section>
    </main>
  `,
  styleUrl: './display-screen.component.css',
})
export class DisplayScreenComponent implements OnInit, OnDestroy {
  private readonly api = inject(DisplayApiService);
  private readonly rotation = inject(DisplayRotationService);
  private readonly router = inject(Router);

  private contentTimer: ReturnType<typeof setTimeout> | null = null;
  private preTransitionPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  state: DisplayState | null = null;
  currentContent: DisplayContentItem | null = null;
  defaultTopDurationSeconds = 10;

  ngOnInit(): void {
    globalThis.addEventListener?.('keydown', this.escapeHandler);
    this.api.openDisplay().subscribe((state) => {
      this.state = state;
      this.defaultTopDurationSeconds = state.configuration.defaultTopDurationSeconds;
      this.rotation.initialize(state.topContent);
      // Render the first item directly (no advance). The first transition
      // will fire after the first item's duration.
      this.currentContent = this.rotation.getFullState()[0] ?? null;
      this.scheduleTransition(this.durationOfCurrent());
    });

    this.pollSub = this.api.watchState(5000).subscribe((state) => {
      if (this.state === null) {
        return;
      }
      const previousContent = this.currentContent;
      this.state = state;
      this.rotation.applyPollState(state.topContent);
      // If the currently-displayed item is gone, advance immediately.
      if (previousContent && !state.topContent.find((i) => i.id === previousContent.id)) {
        this.advanceNow();
      }
    });
  }

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.clearTimers();
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.rotation.reset();
  }

  mediaSource(item: DisplayRenderableItem): string {
    return item.mediaFile?.mediaUrl ?? item.sourceReference;
  }

  animationClass(item: DisplayRenderableItem): string {
    return `rotation-${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`;
  }

  get visibleAds(): DisplayAdItem[] {
    if (!this.state) {
      return [];
    }
    const ads = this.rotation.ordered(this.state.ads);
    const limit = this.state.configuration.inlineAdCount ?? ads.length ?? 1;
    return ads.slice(0, Math.min(limit, ads.length));
  }

  private scheduleTransition(durationMs: number): void {
    this.clearTimers();
    if (durationMs > 1000) {
      this.preTransitionPollTimer = setTimeout(() => {
        this.api.getState().subscribe((s) => {
          if (this.state !== null) {
            this.state = s;
            this.rotation.applyPollState(s.topContent);
          }
        });
      }, durationMs - 1000);
    }
    this.contentTimer = setTimeout(() => this.advanceNow(), durationMs);
  }

  private advanceNow(): void {
    this.currentContent = this.rotation.pickNext();
    if (this.currentContent === null && this.state && this.state.topContent.length > 0) {
      // Edge case: fullState exists but pickNext returned null. Re-anchor.
      this.rotation.initialize(this.state.topContent);
      this.currentContent = this.rotation.pickNext();
    }
    this.scheduleTransition(this.durationOfCurrent());
  }

  private durationOfCurrent(): number {
    if (this.currentContent === null) {
      return this.defaultTopDurationSeconds * 1000;
    }
    return this.rotation.duration(this.currentContent, this.defaultTopDurationSeconds) * 1000;
  }

  private clearTimers(): void {
    if (this.contentTimer) {
      clearTimeout(this.contentTimer);
      this.contentTimer = null;
    }
    if (this.preTransitionPollTimer) {
      clearTimeout(this.preTransitionPollTimer);
      this.preTransitionPollTimer = null;
    }
  }
}
