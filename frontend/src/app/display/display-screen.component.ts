import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DisplayAdItem, DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

type DisplayRenderableItem = Pick<
  DisplayContentItem | DisplayAdItem,
  'sourceReference' | 'mediaFile' | 'rotationAnimation' | 'effectiveRotationAnimation'
>;

@Component({
  selector: 'app-display-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="display-screen" [class.display-screen--ads-hidden]="!adsVisible" aria-label="Kiosk display">
      <section class="top-region" aria-label="Main content">
        <ng-container *ngIf="displayAvailable && currentContent; else contentFallback">
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
            [src]="iframeSource(currentContent)"
            [title]="currentContent.title"
            data-testid="display-content"
          ></iframe>
          <div class="content-label">{{ currentContent.title }}</div>
        </ng-container>
        <ng-template #contentFallback>
          <div class="fallback" data-testid="display-fallback">
            {{ displayAvailable ? 'Content unavailable' : 'Display unavailable' }}
          </div>
        </ng-template>
      </section>

      <section *ngIf="adsVisible" class="ad-region" aria-label="Client ads">
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
  private readonly sanitizer = inject(DomSanitizer);

  private contentTimer: ReturnType<typeof setTimeout> | null = null;
  private adTimer: ReturnType<typeof setTimeout> | null = null;
  private preTransitionPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;
  private currentPollIntervalMs = 0;
  private adIndex = 0;

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  state: DisplayState | null = null;
  currentContent: DisplayContentItem | null = null;
  defaultTopDurationSeconds = 10;

  get currentAd(): DisplayAdItem | null {
    if (!this.adsVisible) {
      return null;
    }
    return this.rotation.current(this.state?.ads ?? [], this.adIndex);
  }

  get visibleAds(): DisplayAdItem[] {
    if (!this.adsVisible) {
      return [];
    }
    const ads = this.rotation.ordered(this.state?.ads ?? []);
    if (!ads.length) {
      return [];
    }
    const inlineCount = this.state?.configuration.inlineAdCount ?? ads.length;
    const rotated = [...ads.slice(this.adIndex), ...ads.slice(0, this.adIndex)];
    return rotated.slice(0, Math.min(inlineCount, rotated.length));
  }

  get adsVisible(): boolean {
    return this.displayAvailable && this.state?.remoteControl?.adsVisible !== false;
  }

  get displayAvailable(): boolean {
    return this.state?.configuration.isEnabled !== false;
  }

  ngOnInit(): void {
    globalThis.addEventListener?.('keydown', this.escapeHandler);
    this.api.openDisplay().subscribe((state) => {
      this.applyState(state, { resetRotation: true });
      this.startPolling();
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

  iframeSource(item: DisplayContentItem): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(item.sourceReference);
  }

  private applyState(state: DisplayState, options: { resetRotation: boolean }): void {
    const previousContent = this.currentContent;
    this.state = state;
    this.defaultTopDurationSeconds = state.configuration.defaultTopDurationSeconds;

    if (options.resetRotation) {
      this.rotation.initialize(state.topContent);
      this.currentContent = this.remoteSelectedContent() ?? this.rotation.getFullState()[0] ?? null;
      this.adIndex = 0;
    } else {
      this.rotation.applyPollState(state.topContent);
      this.currentContent = this.remoteSelectedContent() ?? this.currentContent;
      if (
        previousContent &&
        state.remoteControl?.contentMode !== 'iframe' &&
        !state.topContent.find((item) => item.id === previousContent.id)
      ) {
        this.advanceNow();
        return;
      }
    }

    this.scheduleTransition(this.durationOfCurrent());
    this.scheduleNextAd();
    this.reconfigurePollingIfNeeded();
  }

  private remoteSelectedContent(): DisplayContentItem | null {
    if (!this.displayAvailable) {
      return null;
    }
    if (this.state?.remoteControl?.contentMode === 'iframe') {
      return this.state.selectedIframe ?? null;
    }
    return null;
  }

  private scheduleTransition(durationMs: number): void {
    this.clearContentTimers();
    if (!this.displayAvailable || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    if (durationMs > 1000) {
      this.preTransitionPollTimer = setTimeout(() => {
        this.api.getState().subscribe((state) => {
          if (this.state !== null) {
            this.applyState(state, { resetRotation: false });
          }
        });
      }, durationMs - 1000);
    }
    this.contentTimer = setTimeout(() => this.advanceNow(), durationMs);
  }

  private scheduleNextAd(): void {
    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = null;
    }
    if (!this.adsVisible) {
      return;
    }
    const ads = this.state?.ads ?? [];
    if (ads.length <= 1) {
      return;
    }
    const durationSeconds = this.rotation.duration(this.currentAd, this.state?.configuration.defaultAdDurationSeconds ?? 10);
    this.adTimer = setTimeout(() => {
      this.adIndex = (this.adIndex + 1) % ads.length;
      this.scheduleNextAd();
    }, durationSeconds * 1000);
  }

  private advanceNow(): void {
    if (!this.displayAvailable || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    this.currentContent = this.rotation.pickNext();
    if (this.currentContent === null && this.state && this.state.topContent.length > 0) {
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

  private pollIntervalMs(): number {
    return (this.state?.configuration.remoteControlPollingSeconds ?? 5) * 1000;
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.currentPollIntervalMs = this.pollIntervalMs();
    this.pollSub = this.api.watchState(this.currentPollIntervalMs).subscribe((pollState) => {
      this.applyState(pollState, { resetRotation: false });
    });
  }

  private reconfigurePollingIfNeeded(): void {
    if (!this.pollSub) {
      return;
    }
    const nextInterval = this.pollIntervalMs();
    if (nextInterval !== this.currentPollIntervalMs) {
      this.startPolling();
    }
  }

  private clearContentTimers(): void {
    if (this.contentTimer) {
      clearTimeout(this.contentTimer);
      this.contentTimer = null;
    }
    if (this.preTransitionPollTimer) {
      clearTimeout(this.preTransitionPollTimer);
      this.preTransitionPollTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearContentTimers();
    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = null;
    }
  }
}
