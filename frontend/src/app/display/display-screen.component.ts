import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DisplayAdItem, DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { DisplayControlSyncService } from '../core/display-control-sync.service';
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
        <iframe
          *ngIf="displayAvailable && iframeUrl() as url"
          [src]="safeIframeUrl(url)"
          title="Pinned iframe"
          class="display-content-media"
          data-testid="display-iframe"
          frameborder="0"
          allowfullscreen
        ></iframe>
        <ng-container *ngIf="displayAvailable && !iframeUrl() && currentContent">
          <ng-container *ngFor="let content of contentRenderItems; trackBy: trackContent" [ngSwitch]="content.contentType">
            <img
              *ngSwitchCase="'photo'"
              [src]="mediaSource(content)"
              class="display-content-media"
              [@contentTransition]="contentTransition(content)"
              data-testid="display-content"
            />
            <video
              *ngSwitchCase="'video'"
              [src]="mediaSource(content)"
              muted
              autoplay
              playsinline
              (ended)="onVideoEnded(content)"
              class="display-content-media"
              [@contentTransition]="contentTransition(content)"
              data-testid="display-content"
            ></video>
          </ng-container>
          <div class="content-label">{{ currentContent.title }}</div>
        </ng-container>
        <ng-template [ngIf]="!displayAvailable || (!iframeUrl() && !currentContent)">
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
          </figure>
        </ng-container>
        <ng-template #adFallback>
          <div class="fallback">Ads unavailable</div>
        </ng-template>
      </section>

      <button
        *ngIf="fullscreenPromptVisible"
        type="button"
        class="fullscreen-prompt"
        (click)="enterFullscreenFromDisplay()"
        data-testid="display-fullscreen-prompt"
      >
        Enter fullscreen
      </button>
    </main>
  `,
  styleUrl: './display-screen.component.css',
  animations: [
    trigger('contentTransition', [
      transition(':enter', [
        style({ opacity: 0, transform: '{{enterTransform}}', zIndex: 2 }),
        animate(
          '{{duration}}ms {{easing}}',
          style({ opacity: 1, transform: 'translateX(0)', zIndex: 2 }),
        ),
      ], {
        params: { duration: 300, easing: 'ease-out', enterTransform: 'translateX(0)' },
      }),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)', zIndex: 1, pointerEvents: 'none' }),
        animate(
          '{{duration}}ms {{easing}}',
          style({ opacity: 0, transform: '{{leaveTransform}}', zIndex: 1, pointerEvents: 'none' }),
        ),
      ], {
        params: { duration: 300, easing: 'ease-out', leaveTransform: 'translateX(0)' },
      }),
    ]),
  ],
})
export class DisplayScreenComponent implements OnInit, OnDestroy {
  private readonly api = inject(DisplayApiService);
  private readonly displaySync = inject(DisplayControlSyncService);
  private readonly rotation = inject(DisplayRotationService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  private contentTimer: ReturnType<typeof setTimeout> | null = null;
  private adTimer: ReturnType<typeof setTimeout> | null = null;
  private preTransitionPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;
  private syncSub: Subscription | null = null;
  private currentPollIntervalMs = 0;
  private adIndex = 0;
  private adAnimationRun = 0;
  private currentContentRenderSignature = '';
  private lastNavigationCommandId: string | null = null;
  private cachedIframeUrl: string | null = null;
  private cachedSafeIframeUrl: SafeResourceUrl | null = null;
  private lastFullscreenRequested: boolean | null = null;

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  state: DisplayState | null = null;
  currentContent: DisplayContentItem | null = null;
  contentRenderItems: DisplayContentItem[] = [];
  defaultTopDurationSeconds = 10;
  fullscreenPromptVisible = false;

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
    this.syncSub = this.displaySync.changes$.subscribe(() => this.pollNow());
  }

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.clearTimers();
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.syncSub?.unsubscribe();
    this.syncSub = null;
    this.rotation.reset();
  }

  mediaSource(item: DisplayRenderableItem): string {
    return item.mediaFile?.mediaUrl ?? item.sourceReference;
  }

  animationClass(item: DisplayRenderableItem): string {
    return `rotation-${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`;
  }

  adAnimationClass(item: DisplayRenderableItem): string {
    return `${this.animationClass(item)} ad-animation-run-${this.adAnimationRun % 2 === 0 ? 'a' : 'b'}`;
  }

  contentTransition(item: DisplayContentItem): {
    value: string;
    params: { duration: number; easing: string; enterTransform: string; leaveTransform: string };
  } {
    const animation = item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none';
    const duration = animation === 'none' ? 0 : (this.animationDurationMs(item) ?? 300);
    return {
      value: this.contentRenderKey(item),
      params: {
        duration,
        easing: animation === 'fade' ? 'ease-in' : 'ease-out',
        enterTransform: animation === 'slide' ? 'translateX(16px)' : 'translateX(0)',
        leaveTransform: animation === 'slide' ? 'translateX(-16px)' : 'translateX(0)',
      },
    };
  }

  animationDurationMs(item: DisplayRenderableItem): number | null {
    return item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds ?? null;
  }

  iframeUrl(): string | null {
    if (this.state?.remoteControl?.contentMode === 'iframe') {
      return this.state.selectedIframe?.url ?? null;
    }
    return null;
  }

  safeIframeUrl(url: string): SafeResourceUrl {
    if (this.cachedIframeUrl !== url || this.cachedSafeIframeUrl === null) {
      this.cachedIframeUrl = url;
      this.cachedSafeIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return this.cachedSafeIframeUrl;
  }

  private applyState(state: DisplayState, options: { resetRotation: boolean; preserveContentTimer?: boolean }): void {
    const previousContent = this.currentContent;
    const previousContentMode = this.state?.remoteControl?.contentMode;
    const previousDisplayAvailable = this.displayAvailable;
    this.state = state;
    this.defaultTopDurationSeconds = state.configuration.defaultTopDurationSeconds;
    this.applyFullscreenPreference(state.remoteControl?.fullscreenRequested === true);

    if (options.resetRotation) {
      this.rotation.initialize(state.topContent);
      this.setCurrentContent(this.rotation.getFullState()[0] ?? null);
      this.adIndex = 0;
      this.lastNavigationCommandId = state.remoteControl?.navigationCommandId ?? null;
    } else {
      this.rotation.applyPollState(state.topContent);
      this.setCurrentContent(this.currentContent);
      if (
        previousContent &&
        state.remoteControl?.contentMode !== 'iframe' &&
        !state.topContent.find((item) => item.id === previousContent.id)
      ) {
        this.advanceNow();
        return;
      }
      if (this.applyNavigationCommand()) {
        this.scheduleNextAd();
        this.reconfigurePollingIfNeeded();
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

  private scheduleTransition(durationMs: number): void {
    this.clearContentTimers();
    if (!this.displayAvailable || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    if (this.currentContent?.contentType === 'video') {
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

  private applyFullscreenPreference(requested: boolean): void {
    if (this.lastFullscreenRequested === requested) {
      return;
    }
    this.lastFullscreenRequested = requested;
    const documentRef = globalThis.document;
    if (!documentRef) {
      return;
    }
    if (requested && !documentRef.fullscreenElement) {
      this.requestFullscreen();
    }
    if (!requested && documentRef.fullscreenElement) {
      const exit = documentRef.exitFullscreen?.();
      exit?.catch(() => undefined);
    }
    if (!requested) {
      this.fullscreenPromptVisible = false;
    }
  }

  enterFullscreenFromDisplay(): void {
    this.requestFullscreen();
  }

  private requestFullscreen(): void {
    const request = globalThis.document?.documentElement.requestFullscreen?.();
    if (!request) {
      this.fullscreenPromptVisible = true;
      return;
    }
    request
      .then(() => {
        this.fullscreenPromptVisible = false;
      })
      .catch(() => {
        this.fullscreenPromptVisible = true;
      });
  }

  onVideoEnded(item: DisplayContentItem): void {
    if (item.id !== this.currentContent?.id || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    this.clearContentTimers();
    const delaySeconds = this.state?.configuration.videoEndDelaySeconds ?? 2;
    this.contentTimer = setTimeout(() => this.advanceNow(), delaySeconds * 1000);
  }

  readonly trackContent = (_index: number, item: DisplayContentItem): string => this.contentRenderKey(item);

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

  private previousNow(): void {
    if (!this.displayAvailable || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    this.setCurrentContent(this.rotation.pickPrevious());
    if (this.currentContent === null && this.state && this.state.topContent.length > 0) {
      this.rotation.initialize(this.state.topContent);
      this.setCurrentContent(this.rotation.pickPrevious());
    }
    this.scheduleTransition(this.durationOfCurrent());
  }

  private applyNavigationCommand(): boolean {
    const commandId = this.state?.remoteControl?.navigationCommandId ?? null;
    const command = this.state?.remoteControl?.navigationCommand ?? null;
    if (!commandId || commandId === this.lastNavigationCommandId || this.state?.remoteControl?.contentMode !== 'loop') {
      return false;
    }
    this.lastNavigationCommandId = commandId;
    if (command === 'next') {
      this.advanceNow();
      return true;
    }
    if (command === 'previous') {
      this.previousNow();
      return true;
    }
    return false;
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

  private pollNow(): void {
    if (this.state === null) {
      return;
    }
    this.api.getState().subscribe((state) => {
      this.applyState(state, { resetRotation: false, preserveContentTimer: true });
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

  private setCurrentContent(item: DisplayContentItem | null): void {
    const nextSignature = item ? this.contentRenderKey(item) : '';
    if (nextSignature !== this.currentContentRenderSignature) {
      this.currentContentRenderSignature = nextSignature;
    }
    this.currentContent = item;
    this.contentRenderItems = item ? [item] : [];
  }

  private contentRenderKey(item: DisplayContentItem): string {
    return [
      item.id,
      this.mediaSource(item),
      item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none',
      item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds ?? 'default',
      item.contentType,
    ].join('|');
  }
}
