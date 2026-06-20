import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DisplayAdItem, DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

type DisplayRenderableItem = Pick<
  DisplayContentItem | DisplayAdItem,
  | 'sourceReference'
  | 'mediaFile'
  | 'rotationAnimation'
  | 'effectiveRotationAnimation'
  | 'animationDurationMilliseconds'
  | 'effectiveAnimationDurationMilliseconds'
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
            *ngIf="outgoingContent?.contentType === 'photo'"
            [src]="mediaSource(outgoingContent!)"
            [alt]="outgoingContent!.title"
            [class]="contentAnimationClass(outgoingContent!, 'out')"
            [style.animation-duration.ms]="animationDurationMs(outgoingContent!)"
            aria-hidden="true"
          />
          <video
            *ngIf="outgoingContent?.contentType === 'video'"
            [src]="mediaSource(outgoingContent!)"
            muted
            autoplay
            loop
            [class]="contentAnimationClass(outgoingContent!, 'out')"
            [style.animation-duration.ms]="animationDurationMs(outgoingContent!)"
            aria-hidden="true"
          ></video>
          <iframe
            *ngIf="outgoingContent?.contentType === 'embedded_web'"
            [src]="iframeSource(outgoingContent!)"
            [title]="outgoingContent!.title"
            [class]="contentAnimationClass(outgoingContent!, 'out')"
            [style.animation-duration.ms]="animationDurationMs(outgoingContent!)"
            aria-hidden="true"
          ></iframe>
          <img
            *ngIf="currentContent.contentType === 'photo'"
            [src]="mediaSource(currentContent)"
            [alt]="currentContent.title"
            [class]="contentAnimationClass(currentContent, 'in')"
            [style.animation-duration.ms]="animationDurationMs(currentContent)"
            data-testid="display-content"
          />
          <video
            *ngIf="currentContent.contentType === 'video'"
            [src]="mediaSource(currentContent)"
            muted
            autoplay
            loop
            [class]="contentAnimationClass(currentContent, 'in')"
            [style.animation-duration.ms]="animationDurationMs(currentContent)"
            data-testid="display-content"
          ></video>
          <iframe
            *ngIf="currentContent.contentType === 'embedded_web'"
            [src]="iframeSource(currentContent)"
            [title]="currentContent.title"
            [class]="contentAnimationClass(currentContent, 'in')"
            [style.animation-duration.ms]="animationDurationMs(currentContent)"
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
            <img
              [src]="mediaSource(ad)"
              [alt]="ad.advertiser ?? 'Ad'"
              [class]="adAnimationClass(ad)"
              [style.animation-duration.ms]="animationDurationMs(ad)"
            />
            <figcaption>{{ ad.advertiser ?? 'Ad' }}</figcaption>
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
  private contentAnimationRun = 0;
  private adAnimationRun = 0;
  private currentContentRenderSignature = '';
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  state: DisplayState | null = null;
  currentContent: DisplayContentItem | null = null;
  outgoingContent: DisplayContentItem | null = null;
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

  contentAnimationClass(item: DisplayRenderableItem, direction: 'in' | 'out'): string {
    return `${this.animationClass(item)} display-content-media display-content-media--${direction} animation-run-${this.contentAnimationRun % 2 === 0 ? 'a' : 'b'}`;
  }

  adAnimationClass(item: DisplayRenderableItem): string {
    return `${this.animationClass(item)} ad-animation-run-${this.adAnimationRun % 2 === 0 ? 'a' : 'b'}`;
  }

  animationDurationMs(item: DisplayRenderableItem): number | null {
    return item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds ?? null;
  }

  iframeSource(item: DisplayContentItem): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(item.sourceReference);
  }

  private applyState(state: DisplayState, options: { resetRotation: boolean; preserveContentTimer?: boolean }): void {
    const previousContent = this.currentContent;
    const previousContentMode = this.state?.remoteControl?.contentMode;
    const previousDisplayAvailable = this.displayAvailable;
    this.state = state;
    this.defaultTopDurationSeconds = state.configuration.defaultTopDurationSeconds;

    if (options.resetRotation) {
      this.rotation.initialize(state.topContent);
      this.setCurrentContent(this.remoteSelectedContent() ?? this.rotation.getFullState()[0] ?? null);
      this.adIndex = 0;
    } else {
      this.rotation.applyPollState(state.topContent);
      this.setCurrentContent(this.remoteSelectedContent() ?? this.currentContent);
      if (
        previousContent &&
        state.remoteControl?.contentMode !== 'iframe' &&
        !state.topContent.find((item) => item.id === previousContent.id)
      ) {
        this.advanceNow();
        return;
      }
    }

    const contentModeChanged = previousContentMode !== state.remoteControl?.contentMode;
    const displayAvailabilityChanged = previousDisplayAvailable !== this.displayAvailable;
    if (options.resetRotation || !options.preserveContentTimer || contentModeChanged || displayAvailabilityChanged) {
      this.scheduleTransition(this.durationOfCurrent());
    }
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
            this.applyState(state, { resetRotation: false, preserveContentTimer: true });
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
      this.adAnimationRun += 1;
      this.scheduleNextAd();
    }, durationSeconds * 1000);
  }

  private advanceNow(): void {
    if (!this.displayAvailable || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    this.setCurrentContent(this.rotation.pickNext());
    if (this.currentContent === null && this.state && this.state.topContent.length > 0) {
      this.rotation.initialize(this.state.topContent);
      this.setCurrentContent(this.rotation.pickNext());
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
      this.applyState(pollState, { resetRotation: false, preserveContentTimer: true });
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
    this.clearTransitionTimer();
    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = null;
    }
  }

  private setCurrentContent(item: DisplayContentItem | null): void {
    const nextSignature = item
      ? `${item.id}|${item.sourceReference}|${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`
      : '';
    if (nextSignature !== this.currentContentRenderSignature) {
      const previousContent = this.currentContent;
      this.contentAnimationRun += 1;
      this.currentContentRenderSignature = nextSignature;
      this.clearTransitionTimer();
      this.outgoingContent = previousContent && item ? previousContent : null;
      if (this.outgoingContent && item) {
        this.transitionTimer = setTimeout(() => {
          this.outgoingContent = null;
          this.transitionTimer = null;
        }, this.animationDurationMs(item) ?? 300);
      }
    }
    this.currentContent = item;
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }
}
