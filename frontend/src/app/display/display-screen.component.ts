import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
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
import { DisplayStreamService } from './display-stream.service';
import type { ShowAdsPayload, ShowContentPayload, SnapshotPayload } from './display-stream.models';
import { DisplayViewerController } from './display-viewer.controller';
import { KioskBrandingOverlayComponent } from './kiosk-branding-overlay.component';
import { KioskFullscreenPromptComponent } from './kiosk-fullscreen-prompt.component';

const IMMEDIATE_CONFIG_FIELDS = new Set([
  'topRegionRatio',
  'bottomRegionRatio',
  'inlineAdItemBorderRadiusPx',
  'inlineAdItemBorderWidthPx',
  'inlineAdItemBorderColor',
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
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    KioskBrandingOverlayComponent,
    KioskFullscreenPromptComponent,
  ],
  providers: [
    CursorService,
    DisplayPollingService,
    DisplayViewerController,
    DisplayMediaCacheService,
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
                  <img
                    [src]="mediaSource(currentItem)"
                    alt=""
                    class="top-region__media-backdrop"
                    aria-hidden="true"
                    data-testid="display-content-backdrop"
                  />
                  <img
                    [src]="mediaSource(currentItem)"
                    class="display-content-media"
                    data-testid="display-content"
                  />
                }
                @case ('video') {
                  <video
                    [src]="mediaSource(currentItem)"
                    muted
                    autoplay
                    playsinline
                    [loop]="isFixedMode"
                    class="top-region__media-backdrop"
                    aria-hidden="true"
                    data-testid="display-content-backdrop"
                  ></video>
                  <video
                    #fixedVideo
                    [src]="mediaSource(currentItem)"
                    muted
                    autoplay
                    playsinline
                    [loop]="isFixedMode"
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
  private readonly mediaCache = inject(DisplayMediaCacheService);
  private readonly displayApi = inject(DisplayApiService);
  private readonly displayLabel = inject(DisplayLabelService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private displayActive = false;
  private fallbackPollingActive = false;

  protected readonly reconnecting = computed(
    () => this.displayStream.reconnecting() || (this.fallbackPollingActive && this.polling.reconnecting()),
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
        this.displayViewer.applyShowContent(payload);
        this.syncContentRenderItems();
      }
    });
    effect(() => {
      const event = this.displayStream.lastEvent();
      if (event?.type !== 'snapshot') {
        return;
      }
      this.displayViewer.applySnapshot(event.payload as SnapshotPayload);
      this.syncContentRenderItems();
    });
    effect(() => {
      const payload = this.displayStream.showAds();
      if (payload) {
        this.displayViewer.applyShowAds(payload);
      }
    });
    effect(() => {
      const payload = this.displayStream.modeChanged();
      if (payload) {
        this.displayViewer.applyModeChanged(payload);
      }
    });
    effect(() => {
      const payload = this.displayStream.showIframe();
      if (payload) {
        this.displayViewer.applyShowIframe(payload);
        this.cdr.markForCheck();
      }
    });
    effect(() => {
      const payload = this.displayStream.preload();
      if (payload) {
        this.displayViewer.applyPreload(payload);
        this.mediaCache.warm(payload.items.map((item) => item.mediaUrl));
      }
    });

    effect(() => {
      if (!this.displayStream.sessionEnded()) {
        return;
      }
      this.displayStream.stop();
      void this.bootstrapDisplay();
    });

    effect(() => {
      this.mediaCache.revision();
      this.cdr.markForCheck();
    });

    effect(() => {
      const content = this.displayViewer.currentContent();
      if (content) {
        this.mediaCache.warm([this.rawMediaUrl(content)]);
      }
    });

    effect(() => {
      const ads = this.displayViewer.visibleAds();
      if (ads.length) {
        this.mediaCache.warm(ads.map((ad) => this.rawMediaUrl(ad)));
      }
    });

    effect(() => {
      this.brandingViewModel().organizerLogoUrl;
      this.hiddenLogoUrl = null;
    });

    effect(() => {
      if (!this.displayActive) {
        return;
      }
      if (this.displayStream.sseFallbackActive()) {
        if (!this.fallbackPollingActive) {
          this.fallbackPollingActive = true;
          this.polling.start(this.fallbackPollIntervalMs());
        }
        return;
      }
      if (this.fallbackPollingActive) {
        this.fallbackPollingActive = false;
        this.polling.stop();
      }
    });

    effect(() => {
      if (!this.fallbackPollingActive) {
        return;
      }
      const polled = this.polling.state();
      if (polled) {
        this.applyConfigurationState(polled);
      }
    });

    effect(() => {
      const update = this.displayStream.configUpdated();
      if (!update?.applyImmediately || !this.state) {
        return;
      }
      const patch: Partial<DisplayState['configuration']> = {};
      for (const field of update.changedFields) {
        if (IMMEDIATE_CONFIG_FIELDS.has(field)) {
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

    effect(() => {
      if (!this.displayStream.brandingUpdated() || !this.displayActive) {
        return;
      }
      this.eventBranding.refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    });
  }

  private syncContentRenderItems(): void {
    const item = this.displayViewer.currentContent();
    this.contentRenderItems = item ? [item] : [];
    this.cdr.detectChanges();
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
    return `${iframeId}|${commandId}|${url}`;
  });

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

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.portraitQuery?.removeEventListener?.('change', this.portraitListener);
    this.portraitQuery = null;
    this.clearTimers();
    this.polling.stop();
    this.displayStream.stop();
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
        this.displayActive = true;
        await this.displayStream.startWithRegistration(registration);
        return;
      } catch {
        this.displayStream.stop();
      }
    }

    this.polling.open((state) => {
      if (state) {
        this.applyConfigurationState(state);
        this.displayActive = true;
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
    const scaleX = iframe?.scaleX ?? 1;
    const scaleY = iframe?.scaleY ?? 1;
    return {
      '--iframe-scale-x': String(scaleX),
      '--iframe-scale-y': String(scaleY),
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
    const duration = animation === 'none' ? 0 : (this.contentAnimationDurationMs(item) ?? 300);
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

    if (!this.displayViewer.visibleAds().length && state.ads.length) {
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
