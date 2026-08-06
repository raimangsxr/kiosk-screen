import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';

import { DisplayAdItem, DisplayContentItem, DisplayState, DisplayApiService } from '../core/api/display.api';
import { ApplicationErrorContract } from '../shared/contracts/admin-contracts';
import { EventBrandingService } from '../core/event-branding.service';
import { CursorService } from './cursor.service';
import { DisplayLabelService } from './display-label.service';
import { DisplayPollingService } from './display-polling.service';
import { DisplayMediaCacheService } from './display-media-cache.service';
import { DisplayContentGateService } from './display-content-gate.service';
import { NoveltyQueueTrackerService } from './novelty-queue-tracker.service';
import { NoveltyPreloadReadyService } from './novelty-preload-ready.service';
import { NoveltyQueueIndicatorComponent } from './novelty-queue-indicator.component';
import { DisplayStreamService } from './display-stream.service';
import { IframeScaleService } from './iframe-scale.service';
import type { ShowAdsPayload, ShowContentPayload, SnapshotPayload } from './display-stream.models';
import { DisplayViewerController } from './display-viewer.controller';
import { KioskBrandingOverlayComponent } from './kiosk-branding-overlay.component';
import { KioskFullscreenPromptComponent } from './kiosk-fullscreen-prompt.component';
import { VideoTeardownDirective } from './video-teardown.directive';

const IMMEDIATE_CONFIG_FIELDS = new Set([
  'topRegionRatio',
  'bottomRegionRatio',
  'inlineAdItemBorderRadiusPx',
  'inlineAdItemBorderWidthPx',
  'inlineAdItemBorderColor',
  'noveltyMaxDeferTransitions',
]);

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    KioskBrandingOverlayComponent,
    KioskFullscreenPromptComponent,
    VideoTeardownDirective,
    NoveltyQueueIndicatorComponent,
  ],
  providers: [
    CursorService,
    DisplayPollingService,
    DisplayViewerController,
    DisplayMediaCacheService,
    DisplayContentGateService,
    NoveltyQueueTrackerService,
    NoveltyPreloadReadyService,
  ],
  template: `
    <main
      class="display-screen"
      [class.display-screen--ads-hidden]="!adsVisible"
      [class.display-screen--portrait]="orientation() === 'portrait'"
      [style.gridTemplateRows]="mainGridTemplateRows()"
      [style.--top-ratio]="ratioTop()"
      [style.--bottom-ratio]="ratioBottom()"
      aria-label="Kiosk display"
    >
      @if (orientation() === 'portrait') {
        <div
          class="rotate-device"
          role="status"
          aria-live="polite"
          data-testid="display-rotate-device"
        >Por favor, rota el dispositivo</div>
      }
      <section class="top-region" aria-label="Main content">
        @if (displayAvailable && iframeMountKey()) {
          <div class="iframe-scale-host" [style]="iframeScaleHostStyles()">
            @for (_ of [iframeMountKey()!]; track iframeMountKey()) {
              <iframe
                #displayIframe
                [src]="trustedIframeUrl()!"
                [attr.data-iframe-url]="activeIframeUrl()"
                title="Pinned iframe"
                class="display-content-media display-content-media--iframe"
                data-testid="display-iframe"
                frameborder="0"
                allow="autoplay; fullscreen"
                allowfullscreen
              ></iframe>
            }
          </div>
        }
        @if (displayAvailable && !activeIframeUrl() && contentRenderItems.length) {
          @for (currentItem of contentRenderItems; track trackContent($index, currentItem)) {
            <div
              class="top-region__media-frame"
              [@contentTransition]="contentTransition(currentItem)"
            >
              @switch (currentItem.contentType) {
                @case ('photo') {
                  <div
                    class="top-region__media-backdrop"
                    [style.background-image]="mediaBackdropStyle(currentItem)"
                    aria-hidden="true"
                    data-testid="display-content-backdrop"
                  ></div>
                  <img
                    #photoForeground
                    [src]="mediaSource(currentItem)"
                    (load)="onPhotoBackdropCapture(currentItem, photoForeground)"
                    class="display-content-media"
                    data-testid="display-content"
                  />
                }
                @case ('video') {
                  <div
                    class="top-region__media-backdrop"
                    [style.background-image]="mediaBackdropStyle(currentItem)"
                    aria-hidden="true"
                    data-testid="display-content-backdrop"
                  ></div>
                  <video
                    #fixedVideo
                    appVideoTeardown
                    [src]="mediaSource(currentItem)"
                    muted
                    autoplay
                    playsinline
                    [loop]="isFixedMode"
                    (loadeddata)="onVideoBackdropCapture(currentItem, fixedVideo)"
                    (ended)="onVideoEnded(currentItem)"
                    class="display-content-media"
                    data-testid="display-content"
                  ></video>
                }
              }
            </div>
            <div class="content-label">{{ currentItem.title }}</div>
          }
        }
        @if (!displayAvailable || (!activeIframeUrl() && !contentRenderItems.length)) {
          <div class="fallback" data-testid="display-fallback">
            {{ displayAvailable ? 'Content unavailable' : 'Display unavailable' }}
          </div>
        }
        <app-kiosk-branding-overlay
          [branding]="brandingViewModel()"
          [hiddenLogoUrl]="hiddenLogoUrl"
          [visible]="!activeIframeUrl()"
          (logoBroken)="hideBrokenLogo($event)"
        />
        @if (noveltyIndicatorVisible()) {
          <app-novelty-queue-indicator />
        }
      </section>

      @if (adsVisible) {
        <section
          class="sponsor-strip"
          aria-label="Patrocinadores del evento"
        >
          <h2 class="sponsor-strip__title">Patrocinadores del evento</h2>
          @if (sponsorStripAds().length) {
            <div
              class="sponsor-strip__list"
              [style.--sponsor-count]="sponsorStripAds().length"
              data-testid="sponsor-strip-list"
            >
              @for (ad of sponsorStripAds(); track trackAdByRotation($index, ad)) {
                <figure class="sponsor-strip__item" [ngStyle]="sponsorItemBorderStyle()">
                  <img
                    [src]="mediaSource(ad)"
                    [alt]="ad.advertiser ?? 'Sponsor'"
                    [class]="adAnimationClass(ad)"
                    [style.animation-duration.ms]="animationDurationMs(ad)"
                  />
                </figure>
              }
            </div>
          } @else {
            <div class="fallback">Sponsors unavailable</div>
          }
        </section>
      }

      <app-kiosk-fullscreen-prompt
        [visible]="fullscreenPromptVisible"
        (enter)="enterFullscreenFromDisplay()"
      />

      @if (openError(); as err) {
        <div class="display-open-error" role="alert" data-testid="display-open-error">
          <p>{{ openErrorMessage(err) }}</p>
          <button
            type="button"
            class="display-open-error__retry"
            (click)="retryOpenDisplay()"
            [disabled]="openInProgress()"
            data-testid="display-open-retry"
          >
            Reintentar
          </button>
        </div>
      }

      @if (sseFallbackActive()) {
        <div
          class="display-sse-fallback"
          role="status"
          aria-live="polite"
          data-testid="display-sse-fallback"
        >
          Modo de respaldo: actualización por polling
        </div>
      }

      @if (reconnecting()) {
        <div
          class="display-reconnecting"
          role="status"
          aria-live="polite"
          data-testid="display-reconnecting"
        >
          Reconectando…
        </div>
      }

      @if (labelModalVisible()) {
        <div class="label-modal" data-testid="display-label-modal" role="dialog" aria-modal="true">
          <h2 class="label-modal__title">Identificar pantalla</h2>
          <p class="label-modal__hint">Elige un nombre para esta pantalla (por ejemplo, Sala ultrawide).</p>
          <mat-form-field appearance="outline" class="label-modal__field">
            <mat-label>Nombre de pantalla</mat-label>
            <input matInput [(ngModel)]="labelDraft" (keyup.enter)="confirmLabel()" />
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" (click)="confirmLabel()">Continuar</button>
        </div>
      }

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
  private readonly polling = inject(DisplayPollingService);
  private readonly displayStream = inject(DisplayStreamService);
  private readonly eventBranding = inject(EventBrandingService);
  private readonly displayViewer = inject(DisplayViewerController);
  private readonly iframeScales = inject(IframeScaleService);
  private readonly mediaCache = inject(DisplayMediaCacheService);
  private readonly contentGate = inject(DisplayContentGateService);
  private readonly noveltyTracker = inject(NoveltyQueueTrackerService);
  private readonly noveltyPreloadReady = inject(NoveltyPreloadReadyService);
  private readonly displayApi = inject(DisplayApiService);
  private readonly displayLabel = inject(DisplayLabelService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly displayActive = signal(false);
  private readonly fallbackPollingActive = signal(false);

  protected readonly reconnecting = computed(
    () => this.displayStream.reconnecting() || (this.fallbackPollingActive() && this.polling.reconnecting()),
  );
  protected readonly sseFallbackActive = this.displayStream.sseFallbackActive;
  protected readonly openError = this.polling.openError;
  protected readonly openInProgress = this.polling.openInProgress;

  protected readonly labelModalVisible = signal(false);
  protected labelDraft = '';

  private bootstrapPending = false;

  constructor() {
    effect(() => {
      const payload = this.displayStream.showContent();
      if (payload) {
        untracked(() => {
          this.mediaCache.warmItems([{
            mediaUrl: this.rawMediaUrl(payload.content),
            contentType: payload.content.contentType,
          }]);
          this.contentGate.enqueueShowContent(payload);
          const current = this.displayViewer.currentContent();
          this.mediaCache.retainTop([
            current ? this.rawMediaUrl(current) : null,
            this.rawMediaUrl(payload.content),
          ]);
          this.syncContentRenderItems();
        });
      }
    });
    effect(() => {
      const event = this.displayStream.lastEvent();
      if (event?.type !== 'snapshot') {
        return;
      }
      const snapshot = event.payload as SnapshotPayload;
      untracked(() => {
        this.displayViewer.applyModeChanged({
          contentMode: snapshot.contentMode,
          isPaused: snapshot.isPaused,
          adsVisible: snapshot.adsVisible,
          selectedFixedContentId: null,
          reason: 'snapshot',
        });

        if (snapshot.contentMode === 'iframe' && snapshot.selectedIframe) {
          this.displayViewer.applyShowIframe({
            commandId: 'snapshot',
            iframe: {
              id: snapshot.selectedIframe.id,
              title: snapshot.selectedIframe.url,
              url: snapshot.selectedIframe.url,
              scaleX: snapshot.selectedIframe.scaleX ?? 1,
              scaleY: snapshot.selectedIframe.scaleY ?? 1,
            },
            reason: 'snapshot',
          });
          if (snapshot.currentAds) {
            this.displayViewer.applyShowAds(snapshot.currentAds);
          }
        } else {
          if (snapshot.currentTop) {
            this.mediaCache.warmItems([{
              mediaUrl: this.rawMediaUrl(snapshot.currentTop.content),
              contentType: snapshot.currentTop.content.contentType,
            }]);
            this.contentGate.applySnapshotContent(snapshot.currentTop);
          }
          if (snapshot.currentAds) {
            this.displayViewer.applyShowAds(snapshot.currentAds);
          }
        }

        if (this.isPreloadAllowed()) {
          const pending = snapshot.pendingNovelties ?? [];
          this.displayViewer.applyPreload({ items: pending, leadTimeSeconds: 0 });
          this.mediaCache.warmItems(pending);
          this.noveltyTracker.syncFromSnapshot(snapshot.pendingNovelties);
          this.noveltyPreloadReady.observeNovelties(pending, { reconnect: true });
        }
        this.syncContentRenderItems();
      });
    });
    effect(() => {
      const payload = this.displayStream.showAds();
      if (payload) {
        untracked(() => this.displayViewer.applyShowAds(payload));
      }
    });
    effect(() => {
      const payload = this.displayStream.modeChanged();
      if (payload) {
        untracked(() => this.displayViewer.applyModeChanged(payload));
      }
    });
    effect(() => {
      const payload = this.displayStream.showIframe();
      if (payload) {
        untracked(() => {
          this.displayViewer.applyShowIframe(payload);
          this.cdr.markForCheck();
        });
      }
    });
    effect(() => {
      const payload = this.displayStream.preload();
      if (payload) {
        untracked(() => {
          if (!this.isPreloadAllowed()) {
            return;
          }
          this.displayViewer.applyPreload(payload);
          this.mediaCache.warmItems(payload.items);
          this.noveltyTracker.syncFromPreload(payload.items);
          this.noveltyPreloadReady.observeNovelties(payload.items);
        });
      }
    });

    effect(() => {
      if (!this.displayStream.sessionEnded()) {
        return;
      }
      untracked(() => {
        this.displayStream.stop();
        void this.bootstrapDisplay();
      });
    });

    effect(() => {
      this.mediaCache.revision();
      untracked(() => {
        this.contentGate.retryPendingCommit();
        this.cdr.markForCheck();
      });
    });

    this.contentGate.onCommitted
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contentId) => {
        this.noveltyTracker.removeOnCommit(contentId);
        this.syncContentRenderItems();
      });

    effect(() => {
      const content = this.displayViewer.currentContent();
      const preload = this.displayViewer.preloadUrls();
      if (this.displayViewer.iframeActive()) {
        this.mediaCache.clearTopRetention();
        return;
      }
      const urls: string[] = [];
      if (content) {
        urls.push(this.rawMediaUrl(content));
      }
      for (const url of preload) {
        if (url && !urls.includes(url)) {
          urls.push(url);
        }
      }
      this.mediaCache.retainTop(urls);
    });

    effect(() => {
      const ads = this.displayViewer.visibleAds();
      if (ads.length) {
        this.mediaCache.retainAds(ads.map((ad) => this.rawMediaUrl(ad)));
      } else {
        this.mediaCache.retainAds([]);
      }
    });

    effect(() => {
      this.brandingViewModel().organizerLogoUrl;
      this.hiddenLogoUrl = null;
    });

    effect(() => {
      // Re-read the operator-configured preventive-reload cadence whenever the
      // display state changes, so admin edits take effect without a reload.
      this.stateVersion();
      const seconds = untracked(() => this.state?.configuration?.iframePreventiveReloadSeconds ?? 0);
      this.reconfigureIframePreventiveReload(seconds);
    });

    effect(() => {
      if (!this.displayActive()) {
        return;
      }
      const sseConnected = this.displayStream.connected();
      const fallback = this.displayStream.sseFallbackActive();
      if (sseConnected && this.fallbackPollingActive()) {
        this.fallbackPollingActive.set(false);
        untracked(() => this.polling.stop());
        return;
      }
      if (!sseConnected && fallback) {
        if (!this.fallbackPollingActive()) {
          this.fallbackPollingActive.set(true);
          untracked(() => this.polling.start(this.fallbackPollIntervalMs()));
        }
      }
    });

    effect(() => {
      if (!this.fallbackPollingActive()) {
        return;
      }
      const polled = this.polling.state();
      if (polled) {
        untracked(() => this.applyConfigurationState(polled));
      }
    });

    effect(() => {
      const update = this.displayStream.configUpdated();
      if (!update) {
        return;
      }
      untracked(() => {
        if (!this.state) {
          return;
        }
        const patch: Partial<DisplayState['configuration']> = {};
        for (const field of update.changedFields) {
          const applyField = update.applyImmediately || field === 'noveltyMaxDeferTransitions';
          if (applyField && IMMEDIATE_CONFIG_FIELDS.has(field)) {
            const value = (update.configuration as Record<string, unknown>)[field];
            (patch as Record<string, unknown>)[field] = value;
          }
        }
        if (Object.keys(patch).length === 0) {
          return;
        }
        this.state = {
          ...this.state,
          configuration: {
            ...this.state.configuration,
            ...patch,
          },
        };
        this.stateVersion.update((value) => value + 1);
        this.cdr.markForCheck();
      });
    });

    effect(() => {
      if (!this.displayStream.brandingUpdated() || !this.displayActive()) {
        return;
      }
      untracked(() => {
        this.eventBranding.refresh()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      });
    });
  }

  protected readonly noveltyIndicatorVisible = computed(
    () => this.isPreloadAllowed() && this.noveltyTracker.hasEntries(),
  );

  private isPreloadAllowed(): boolean {
    return this.displayViewer.contentMode() === 'loop'
      && !this.displayViewer.isPaused()
      && !this.displayViewer.iframeActive();
  }

  private syncContentRenderItems(): void {
    const item = this.displayViewer.currentContent();
    this.releaseBackdropExcept(item ? this.contentRenderKey(item) : null);
    this.contentRenderItems = item ? [item] : [];
    this.cdr.markForCheck();
  }

  private readonly mediaBackdropByKey = new Map<string, string>();
  private readonly prefersReducedMotion =
    typeof globalThis.matchMedia === 'function'
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected mediaBackdropStyle(item: DisplayContentItem): string | null {
    if (this.prefersReducedMotion) {
      return null;
    }
    const url = this.mediaBackdropByKey.get(this.contentRenderKey(item));
    return url ? `url("${url}")` : null;
  }

  /** A small, pre-filtered capture avoids a second original media decoder and
   *  continuous viewport-sized blur composition (CHG-053 / ADR-0007). */
  private static readonly BACKDROP_MAX_WIDTH = 320;
  private static readonly BACKDROP_BLUR_PX = 12;
  private backdropCanvas: HTMLCanvasElement | null = null;

  protected onPhotoBackdropCapture(item: DisplayContentItem, image: HTMLImageElement): void {
    this.captureBackdrop(item, image, image.naturalWidth, image.naturalHeight);
  }

  protected onVideoBackdropCapture(item: DisplayContentItem, video: HTMLVideoElement): void {
    this.captureBackdrop(item, video, video.videoWidth, video.videoHeight);
  }

  private captureBackdrop(
    item: DisplayContentItem,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
  ): void {
    if (this.prefersReducedMotion || !sourceWidth || !sourceHeight) {
      return;
    }
    const key = this.contentRenderKey(item);
    if (this.mediaBackdropByKey.has(key)) {
      return;
    }
    try {
      const canvas = this.backdropCanvas ??= globalThis.document?.createElement('canvas') ?? null;
      if (!canvas) {
        return;
      }
      const scale = Math.min(1, DisplayScreenComponent.BACKDROP_MAX_WIDTH / sourceWidth);
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      context.save();
      context.fillStyle = '#102832';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.filter = `blur(${DisplayScreenComponent.BACKDROP_BLUR_PX}px) saturate(1.1)`;
      const overscan = Math.max(2, Math.round(canvas.width * 0.04));
      context.drawImage(
        source,
        -overscan,
        -overscan,
        canvas.width + (overscan * 2),
        canvas.height + (overscan * 2),
      );
      context.restore();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      this.mediaBackdropByKey.set(key, dataUrl);
      this.cdr.markForCheck();
    } catch {
      // Canvas capture may fail on cross-origin media; backdrop degrades to solid frame color.
    }
  }

  private releaseBackdropExcept(activeKey: string | null): void {
    for (const [key, url] of this.mediaBackdropByKey.entries()) {
      if (key === activeKey) {
        continue;
      }
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      this.mediaBackdropByKey.delete(key);
    }
  }


  @ViewChild('fixedVideo') private fixedVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('displayIframe') private displayIframeRef?: ElementRef<HTMLIFrameElement>;

  private lastFullscreenRequested: boolean | null = null;
  protected hiddenLogoUrl: string | null = null;

  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  /**
   * The polled state lives in a plain field so the existing template
   * bindings (`this.state?.X`) keep working. We expose a private
   * `stateVersion` signal that the component's effect tracks; the
   * component bumps it whenever the state changes, which forces the
   * effect to re-evaluate the input accessors.
   *
   * The `stateFingerprint` computed wraps `stateVersion` plus a stable
   * serialisation of the inputs that actually matter to the rotation
   * timers. When two consecutive polls return the same state, the
   * fingerprint string is identical, the computed's value does not
   * change, and the effect does NOT re-run — so the content timer is
   * NOT reset on every poll.
   */
  state: DisplayState | null = null;
  private readonly stateVersion = signal(0);

  protected readonly activeIframeUrl = computed(() => {
    if (!this.displayViewer.iframeActive()) {
      return null;
    }
    return this.displayViewer.currentIframe()?.url ?? null;
  });

  protected readonly trustedIframeUrl = computed(() => {
    const url = this.activeIframeUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /**
   * Forces a fresh iframe document load whenever the active iframe URL or
   * show_iframe command changes (needed for sibling apps that read query
   * params such as embed_token only on first navigation).
   */
  protected readonly iframeMountKey = computed(() => {
    const url = this.activeIframeUrl();
    if (!url) {
      return null;
    }
    const commandId = this.displayViewer.currentCommandId() ?? 'bootstrap';
    const iframeId = this.displayViewer.currentIframe()?.id ?? 'iframe';
    // The reload nonce lets an optional preventive reload (CHG-051) remount the
    // iframe without any change to id/commandId/url.
    return `${iframeId}|${commandId}|${url}|${this.iframeReloadNonce()}`;
  });

  /** Bumped by the optional preventive-reload timer to force an iframe remount. */
  private readonly iframeReloadNonce = signal(0);
  private iframeReloadTimer: ReturnType<typeof setInterval> | null = null;
  private armedIframeReloadSeconds = -1;

  /** Reactive sponsor strip so inline ad count and border config apply without a full reload. */
  protected readonly sponsorStripAds = computed(() => {
    this.stateVersion();
    this.displayViewer.adAnimationRun();
    const adsVisible = this.displayViewer.adsVisible();
    if (!this.sponsorStripVisible() || !adsVisible) {
      return [] as DisplayAdItem[];
    }
    return this.displayViewer.visibleAds();
  });

  protected readonly sponsorItemBorderStyle = computed(() => {
    this.stateVersion();
    this.displayViewer.adAnimationRun();
    return this.displayViewer.adBorderStyle();
  });

  private sponsorStripVisible(): boolean {
    return this.state?.configuration.isEnabled !== false
      && this.displayViewer.adsVisible();
  }
  contentRenderItems: DisplayContentItem[] = [];
  fullscreenPromptVisible = false;
  readonly branding = this.eventBranding.branding;

  /**
   * Adapter signal that hands the branding snapshot to the
   * `<app-kiosk-branding-overlay>` child component. The child expects
   * a `BrandingViewModel` (string + nullable url); the host owns the
   * full branding state including `organizerName` for future extensions.
   */
  protected readonly brandingViewModel = computed(() => {
    const b = this.branding();
    return {
      eventName: b.eventName ?? '',
      organizerName: b.organizerName ?? '',
      organizerLogoUrl: b.organizerLogoUrl ?? null,
      logoLayout: b.logoLayout ?? null,
      eventNameLayout: b.eventNameLayout ?? null
    };
  });

  readonly orientation = signal<'landscape' | 'portrait'>('landscape');
  private portraitQuery: MediaQueryList | null = null;
  private readonly portraitListener = (event: MediaQueryListEvent): void => {
    this.orientation.set(event.matches ? 'portrait' : 'landscape');
  };

  ratioTop(): string {
    const value = this.state?.configuration?.topRegionRatio;
    return `${value !== undefined && value >= 1 ? value : 5}fr`;
  }

  ratioBottom(): string {
    const value = this.state?.configuration?.bottomRegionRatio;
    return `${value !== undefined && value >= 1 ? value : 1}fr`;
  }

  mainGridTemplateRows(): string {
    if (!this.adsVisible) {
      return '1fr';
    }
    return `${this.ratioTop()} ${this.ratioBottom()}`;
  }

  get currentContent(): DisplayContentItem | null {
    return this.displayViewer.currentContent();
  }

  get visibleAds(): DisplayAdItem[] {
    return this.sponsorStripAds();
  }

  get currentAd(): DisplayAdItem | null {
    return this.sponsorStripAds()[0] ?? null;
  }

  get isFixedMode(): boolean {
    return this.displayViewer.isFixedMode();
  }

  get adsVisible(): boolean {
    return this.displayAvailable && this.displayViewer.adsVisible();
  }

  get displayAvailable(): boolean {
    return this.state?.configuration.isEnabled !== false;
  }

  ngOnInit(): void {
    globalThis.addEventListener?.('keydown', this.escapeHandler);
    if (!this.displayLabel.label()) {
      this.labelModalVisible.set(true);
    }
    if (typeof globalThis.matchMedia === 'function') {
      this.portraitQuery = globalThis.matchMedia('(orientation: portrait)');
      this.orientation.set(this.portraitQuery.matches ? 'portrait' : 'landscape');
      this.portraitQuery.addEventListener?.('change', this.portraitListener);
    }
    // All RxJS subscriptions are tied to the component's DestroyRef so
    // they cannot leak when the operator navigates away from /display.
    void this.bootstrapDisplay();
    this.eventBranding.refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /**
   * (Re)arms the optional preventive iframe reload from the operator-configured
   * `iframePreventiveReloadSeconds`. 0 (default) disables it. Driven by config
   * so it can be changed per event from the admin without redeploying.
   */
  private reconfigureIframePreventiveReload(seconds: number): void {
    if (seconds === this.armedIframeReloadSeconds) {
      return;
    }
    this.armedIframeReloadSeconds = seconds;
    if (this.iframeReloadTimer !== null) {
      globalThis.clearInterval?.(this.iframeReloadTimer);
      this.iframeReloadTimer = null;
    }
    if (!seconds || seconds <= 0 || typeof globalThis.setInterval !== 'function') {
      return;
    }
    this.iframeReloadTimer = globalThis.setInterval(() => {
      // Only reclaim while an iframe is actually on screen; reloading resets
      // the embedded app, so we never do it needlessly.
      if (this.displayViewer.iframeActive()) {
        this.iframeReloadNonce.update((value) => value + 1);
        this.cdr.markForCheck();
      }
    }, seconds * 1000);
  }

  ngOnDestroy(): void {
    this.displayActive.set(false);
    this.fallbackPollingActive.set(false);
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.portraitQuery?.removeEventListener?.('change', this.portraitListener);
    this.portraitQuery = null;
    if (this.iframeReloadTimer !== null) {
      globalThis.clearInterval?.(this.iframeReloadTimer);
      this.iframeReloadTimer = null;
    }
    this.clearTimers();
    this.polling.stop();
    this.displayStream.stop();
    this.releaseBackdropExcept(null);
    this.mediaCache.releaseAll();
  }

  protected openErrorMessage(err: ApplicationErrorContract): string {
    return err.message || 'No se pudo abrir la pantalla. Comprueba la conexión e inténtalo de nuevo.';
  }

  retryOpenDisplay(): void {
    this.polling.retryOpen();
  }

  private async bootstrapDisplay(): Promise<void> {
    if (!this.displayLabel.label()) {
      this.labelModalVisible.set(true);
      return;
    }
    const registration = await this.displayStream.tryRegister();
    if (registration) {
      try {
        const state = await firstValueFrom(this.displayApi.getState());
        this.applyConfigurationState(state);
        this.displayActive.set(true);
        await this.displayStream.startWithRegistration(registration);
        return;
      } catch {
        this.displayStream.stop();
      }
    }

    this.polling.open((state) => {
      if (state) {
        this.applyConfigurationState(state);
        this.displayActive.set(true);
        void this.displayStream.start();
      }
    });
  }

  protected confirmLabel(): void {
    const clean = this.labelDraft.trim();
    if (!clean) {
      return;
    }
    this.displayLabel.setLabel(clean);
    this.labelModalVisible.set(false);
    if (!this.bootstrapPending) {
      this.bootstrapPending = true;
      void this.bootstrapDisplay().finally(() => {
        this.bootstrapPending = false;
      });
    }
  }

  iframeScaleHostStyles(): Record<string, string> {
    const iframe = this.displayViewer.currentIframe();
    const resolved = this.iframeScales.resolveScale(iframe?.id, iframe?.scaleX ?? 1, iframe?.scaleY ?? 1);
    return {
      '--iframe-scale-x': String(resolved.scaleX),
      '--iframe-scale-y': String(resolved.scaleY),
    };
  }

  mediaSource(item: DisplayRenderableItem): string {
    this.mediaCache.revision();
    return this.mediaCache.getDisplayUrl(this.rawMediaUrl(item));
  }

  private rawMediaUrl(item: DisplayRenderableItem): string {
    return item.mediaFile?.mediaUrl ?? item.sourceReference;
  }

  animationClass(item: DisplayRenderableItem): string {
    if ('isNovelty' in item && this.usesNoveltyDefaults(item as DisplayContentItem)) {
      return `rotation-${this.state?.configuration.defaultTopRotationAnimation ?? 'none'}`;
    }
    return `rotation-${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`;
  }

  adAnimationClass(item: DisplayRenderableItem): string {
    return `${this.animationClass(item)} sponsor-animation-run-${this.displayViewer.adAnimationRun() % 2 === 0 ? 'a' : 'b'}`;
  }

  contentTransition(item: DisplayContentItem): {
    value: string;
    params: { duration: number; easing: string; enterTransform: string; leaveTransform: string };
  } {
    const animation = this.contentRotationAnimation(item);
    const duration = this.prefersReducedMotion || animation === 'none'
      ? 0
      : (this.contentAnimationDurationMs(item) ?? 300);
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
    const ms = item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds;
    if (ms && ms > 0) return ms;
    return this.state?.configuration.defaultAdAnimationDurationMilliseconds ?? 300;
  }

  hasBranding(): boolean {
    const branding = this.branding();
    return Boolean(branding.eventName || branding.organizerName || branding.organizerLogoUrl);
  }

  showBrandingSeparator(): boolean {
    const branding = this.branding();
    const pieces = [branding.organizerLogoUrl, branding.organizerName, branding.eventName].filter(Boolean).length;
    return pieces >= 2 && Boolean(branding.organizerName && branding.eventName);
  }

  logoVisible(url: string): boolean {
    return this.hiddenLogoUrl !== url;
  }

  hideBrokenLogo(url: string | null): void {
    this.hiddenLogoUrl = url;
  }

  onVideoEnded(item: DisplayContentItem): void {
    this.displayViewer.onVideoEnded(item);
  }

  readonly trackContent = (_index: number, item: DisplayContentItem): string => this.contentRenderKey(item);

  readonly trackAdByRotation = (_index: number, ad: DisplayAdItem): string => ad.id;

  private applyConfigurationState(state: DisplayState): void {
    this.state = state;
    this.stateVersion.update((v) => v + 1);
    this.applyFullscreenPreference(state.remoteControl?.fullscreenRequested === true);
    this.seedViewerFromState(state);
    const current = this.displayViewer.currentContent();
    if (current) {
      this.mediaCache.warmItems([{
        mediaUrl: this.rawMediaUrl(current),
        contentType: current.contentType,
      }]);
    }
    this.syncContentRenderItems();
    this.cdr.markForCheck();
  }

  private seedViewerFromState(state: DisplayState): void {
    const remote = state.remoteControl;
    if (remote) {
      this.displayViewer.applyModeChanged({
        contentMode: remote.contentMode,
        isPaused: remote.navigationCommand === 'pause',
        adsVisible: remote.adsVisible,
        selectedFixedContentId: remote.selectedFixedContentId ?? null,
        reason: 'bootstrap',
      });
    }

    if (remote?.contentMode === 'iframe' && state.selectedIframe) {
      this.displayViewer.applyShowIframe({
        commandId: 'bootstrap',
        iframe: {
          id: state.selectedIframe.id,
          title: state.selectedIframe.url,
          url: state.selectedIframe.url,
          scaleX: state.selectedIframe.scaleX ?? 1,
          scaleY: state.selectedIframe.scaleY ?? 1,
        },
        reason: 'bootstrap',
      });
    } else if (remote?.contentMode === 'fixed' && remote.selectedFixedContentId) {
      const fixedItem = state.topContent.find((item) => item.id === remote.selectedFixedContentId);
      if (fixedItem) {
        this.displayViewer.currentContent.set(fixedItem);
      }
    } else if (remote?.contentMode !== 'iframe' && !this.displayViewer.currentContent() && state.topContent[0]) {
      this.displayViewer.currentContent.set(state.topContent[0]);
    }

    if (state.currentTop) {
      this.displayViewer.applyShowContent(state.currentTop);
    }
    if (state.currentAds) {
      this.displayViewer.applyShowAds(state.currentAds);
    } else if (!this.displayViewer.visibleAds().length && state.ads.length) {
      const count = Math.max(1, state.configuration.inlineAdCount ?? 1);
      this.displayViewer.visibleAds.set(state.ads.slice(0, count));
    }
  }

  private usesNoveltyDefaults(item: DisplayContentItem): boolean {
    return this.displayViewer.currentShowReason() === 'novelty' || item.isNovelty === true;
  }

  private contentRotationAnimation(item: DisplayContentItem): string {
    if (this.usesNoveltyDefaults(item)) {
      return this.state?.configuration.defaultTopRotationAnimation ?? 'none';
    }
    return item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none';
  }

  private contentAnimationDurationMs(item: DisplayContentItem): number | null {
    const animation = this.contentRotationAnimation(item);
    if (animation === 'none') {
      return 0;
    }
    if (this.usesNoveltyDefaults(item)) {
      return this.state?.configuration.defaultTopAnimationDurationMilliseconds ?? 300;
    }
    const ms = item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds;
    if (ms && ms > 0) {
      return ms;
    }
    return this.state?.configuration.defaultTopAnimationDurationMilliseconds ?? 300;
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

  private clearTimers(): void {
    // Reserved for future timer cleanup; SSE fallback uses DisplayPollingService lifecycle.
  }

  private fallbackPollIntervalMs(): number {
    return (this.state?.configuration.remoteControlPollingSeconds ?? 5) * 1000;
  }

  private contentRenderKey(item: DisplayContentItem): string {
    return [
      item.id,
      this.rawMediaUrl(item),
      item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none',
      item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds ?? 'default',
      item.contentType,
    ].join('|');
  }
}
