import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, Injector, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DisplayAdItem, DisplayApiService, DisplayContentItem, DisplayState } from '../core/api/display.api';
import { DisplayControlSyncService } from '../core/display-control-sync.service';
import { EventBrandingService } from '../core/event-branding.service';
import { EventConfigSyncService } from '../core/event-config-sync.service';
import { CursorService } from './cursor.service';
import { DisplayPollingService } from './display-polling.service';
import { KioskBrandingOverlayComponent } from './kiosk-branding-overlay.component';
import { KioskFullscreenPromptComponent } from './kiosk-fullscreen-prompt.component';
import { KioskRotationController } from './kiosk-rotation.controller';
import { RecurringCadenceService } from './recurring-cadence.service';
import { RotationSchedulerService } from './rotation-scheduler.service';

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
    KioskBrandingOverlayComponent,
    KioskFullscreenPromptComponent
  ],
  providers: [
    KioskRotationController,
    CursorService,
    RecurringCadenceService,
    RotationSchedulerService,
    DisplayPollingService
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
        @if (displayAvailable && iframeUrl(); as url) {
          <iframe
            [src]="safeIframeUrl(url)"
            title="Pinned iframe"
            class="display-content-media"
            data-testid="display-iframe"
            frameborder="0"
            allowfullscreen
          ></iframe>
        }
        @if (displayAvailable && !iframeUrl() && contentRenderItems[0]; as currentItem) {
          <ng-container [ngSwitch]="currentItem.contentType">
            @switch (currentItem.contentType) {
              @case ('photo') {
                <img
                  [src]="mediaSource(currentItem)"
                  class="display-content-media"
                  [@contentTransition]="contentTransition(currentItem)"
                  data-testid="display-content"
                />
              }
              @case ('video') {
                <video
                  #fixedVideo
                  [src]="mediaSource(currentItem)"
                  muted
                  autoplay
                  playsinline
                  [loop]="isFixedMode"
                  (ended)="onVideoEnded(currentItem)"
                  class="display-content-media"
                  [@contentTransition]="contentTransition(currentItem)"
                  data-testid="display-content"
                ></video>
              }
            }
          </ng-container>
          <div class="content-label">{{ contentRenderItems[0].title }}</div>
        }
        @if (!displayAvailable || (!iframeUrl() && !contentRenderItems.length)) {
          <div class="fallback" data-testid="display-fallback">
            {{ displayAvailable ? 'Content unavailable' : 'Display unavailable' }}
          </div>
        }
        <app-kiosk-branding-overlay
          [branding]="brandingViewModel()"
          [hiddenLogoUrl]="hiddenLogoUrl"
          [visible]="!iframeUrl()"
          (logoBroken)="hideBrokenLogo($event)"
        />
      </section>

      @if (adsVisible) {
        <section
          class="sponsor-strip"
          aria-label="Patrocinadores del evento"
        >
          <h2 class="sponsor-strip__title">Patrocinadores del evento</h2>
          @if (visibleAds.length) {
            <div
              class="sponsor-strip__list"
              [style.--sponsor-count]="visibleAds.length"
              data-testid="sponsor-strip-list"
            >
              @for (ad of visibleAds; track trackAdById($index, ad)) {
                <figure class="sponsor-strip__item">
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
  private readonly eventBranding = inject(EventBrandingService);
  private readonly eventConfigSync = inject(EventConfigSyncService);
  private readonly displaySync = inject(DisplayControlSyncService);
  protected readonly kioskRotation = inject(KioskRotationController);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /**
   * Subscribe to the controller's content-advance ticks via the public
   * `registerContentAdvanceListener` API so we get back an unsubscribe
   * handle and can release the listener in `ngOnDestroy`. The listener
   * mirrors the controller cursor into the template's render array
   * regardless of which path advanced it (timer, remote-control
   * next/previous, fixed-mode).
   */
  private unsubscribeAdvanceListener: (() => void) | undefined;

  constructor() {
    this.unsubscribeAdvanceListener = this.kioskRotation.registerContentAdvanceListener(() => {
      this.syncContentRenderItems();
    });

    // Wire the polled inputs into the controller. The controller creates
    // a reactive `effect()` to re-arm timers when inputs change, but we
    // pass the COMPONENT'S Injector so the effect is destroyed with the
    // component (CHG-019 fix). Previously the controller was
    // `providedIn: 'root'` and the effect leaked one per visit to
    // /display.
    //
    // The inputs read `stateFingerprint` (a computed signal) so the
    // controller effect only re-runs when the polled fingerprint ACTUALLY
    // changes — not on every 5 s poll that returns the same state. This
    // prevents the content timer from being reset on every poll.
    this.kioskRotation.bindInputs({
      contentMode: () => this.stateFingerprint()?.mode ?? 'loop',
      contentQueue: () => this.state?.topContent ?? [],
      ads: () => this.stateFingerprint()?.ads ?? [],
      fixedContentId: () => this.stateFingerprint()?.fixedId ?? null,
      effectiveDurationSeconds: (item) => this.computeContentDurationSeconds(item),
      adDurationSeconds: () => this.stateFingerprint()?.adDuration ?? 10,
      inlineAdCount: () => this.stateFingerprint()?.inlineAdCount ?? 1,
      videoEndDelaySeconds: () => this.stateFingerprint()?.videoEndDelay ?? 2,
    }, this.injector);
  }

  /**
   * Mirror the controller's current content into the template's array.
   * Read directly from the controller's internal contentQueue + cursor
   * so the value is correct even if the component's effect hasn't
   * observed the latest controller-side effect yet.
   */
  private syncContentRenderItems(): void {
    const queue = this.state?.topContent ?? [];
    const id = this.kioskRotation.currentContentId();
    const item = id ? queue.find((c) => c.id === id) ?? null : null;
    this.contentRenderItems = item ? [item] : [];
    this.cdr.detectChanges();
  }


  @ViewChild('fixedVideo') private fixedVideoRef?: ElementRef<HTMLVideoElement>;

  private preTransitionPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;
  private syncSub: Subscription | null = null;
  private currentPollIntervalMs = 0;
  private lastNavigationCommandId: string | null = null;
  private cachedIframeUrl: string | null = null;
  private cachedSafeIframeUrl: SafeResourceUrl | null = null;
  private lastFullscreenRequested: boolean | null = null;
  protected hiddenLogoUrl: string | null = null;
  private lastFixedContentId: string | null = null;

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
  /**
   * Stable, parsed view of the polled state. Each field is its own
   * computed so the controller effect only re-runs when the relevant
   * field changes — not on every 5 s poll that returns the same state.
   * The `stateVersion` signal is read by every accessor so they all
   * invalidate together when `applyState` bumps it.
   */
  private readonly stateFingerprint = computed<{
    mode: 'loop' | 'iframe' | 'fixed';
    fixedId: string | null;
    ads: ReadonlyArray<{ id: string; displayOrder: number }>;
    adDuration: number;
    inlineAdCount: number;
    videoEndDelay: number;
  } | null>(() => {
    this.stateVersion();
    const s = this.state;
    if (!s) {
      return null;
    }
    return {
      mode: s.remoteControl?.contentMode ?? 'loop',
      fixedId: s.remoteControl?.selectedFixedContentId ?? null,
      ads: (s.ads ?? []) as ReadonlyArray<{ id: string; displayOrder: number }>,
      adDuration: s.configuration.defaultAdDurationSeconds ?? 10,
      inlineAdCount: s.configuration.inlineAdCount ?? 1,
      videoEndDelay: s.configuration.videoEndDelaySeconds ?? 2,
    };
  });
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
    return `${this.ratioTop()} ${this.ratioBottom()}`;
  }

  get currentContent(): DisplayContentItem | null {
    return this.kioskRotation.currentContent();
  }

  get visibleAds(): DisplayAdItem[] {
    if (!this.adsVisible) {
      return [];
    }
    return this.kioskRotation.visibleAds() as unknown as DisplayAdItem[];
  }

  get currentAd(): DisplayAdItem | null {
    if (!this.adsVisible) {
      return null;
    }
    return this.kioskRotation.currentAd() as unknown as DisplayAdItem | null;
  }

  get isFixedMode(): boolean {
    return this.kioskRotation.contentMode() === 'fixed';
  }

  get adsVisible(): boolean {
    return this.displayAvailable && this.state?.remoteControl?.adsVisible !== false;
  }

  get displayAvailable(): boolean {
    return this.state?.configuration.isEnabled !== false;
  }

  ngOnInit(): void {
    globalThis.addEventListener?.('keydown', this.escapeHandler);
    if (typeof globalThis.matchMedia === 'function') {
      this.portraitQuery = globalThis.matchMedia('(orientation: portrait)');
      this.orientation.set(this.portraitQuery.matches ? 'portrait' : 'landscape');
      this.portraitQuery.addEventListener?.('change', this.portraitListener);
    }
    // All RxJS subscriptions are tied to the component's DestroyRef so
    // they cannot leak when the operator navigates away from /display.
    // The previous design called .subscribe() without storing the
    // subscription, which leaked one observable per poll.
    this.api.openDisplay()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.applyState(state, { resetRotation: true });
        this.startPolling();
      });
    this.syncSub = this.displaySync.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pollNow());
    this.eventConfigSync.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.eventBranding.refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe());
    this.eventBranding.refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.portraitQuery?.removeEventListener?.('change', this.portraitListener);
    this.portraitQuery = null;
    this.clearTimers();
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.syncSub?.unsubscribe();
    this.syncSub = null;
    this.unsubscribeAdvanceListener?.();
    this.unsubscribeAdvanceListener = undefined;
    this.kioskRotation.detach();
  }

  mediaSource(item: DisplayRenderableItem): string {
    return item.mediaFile?.mediaUrl ?? item.sourceReference;
  }

  animationClass(item: DisplayRenderableItem): string {
    return `rotation-${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`;
  }

  adAnimationClass(item: DisplayRenderableItem): string {
    return `${this.animationClass(item)} sponsor-animation-run-${this.kioskRotation.adAnimationRun() % 2 === 0 ? 'a' : 'b'}`;
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
    const ms = item.effectiveAnimationDurationMilliseconds ?? item.animationDurationMilliseconds;
    if (ms && ms > 0) return ms;
    // FR-013: never derive the CSS animation duration from defaultAdDurationSeconds
    // (the rotation cadence). Fall back to the kiosk animation default.
    return this.state?.configuration.defaultAdAnimationDurationMilliseconds ?? 300;
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
    if (item.id !== this.currentContent?.id || this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    if (this.kioskRotation.contentMode() === 'fixed') {
      // FR-014: in fixed mode the kiosk restarts the video in place; the
      // [loop] attribute on the <video> element already restarts it, but we
      // also explicitly seek to 0 so a fresh `ended` event can re-fire if the
      // browser ever drops the loop attribute.
      const video = this.fixedVideoRef?.nativeElement;
      if (video) {
        video.currentTime = 0;
        const play = video.play();
        if (play && typeof play.catch === 'function') {
          play.catch(() => undefined);
        }
      }
      return;
    }
    this.kioskRotation.onVideoEnded();
  }

  readonly trackContent = (_index: number, item: DisplayContentItem): string => this.contentRenderKey(item);

  readonly trackAdById = (_index: number, ad: DisplayAdItem): string => ad.id;

  private applyState(state: DisplayState, options: { resetRotation: boolean }): void {
    const previousContentMode = this.state?.remoteControl?.contentMode;
    const previousDisplayAvailable = this.displayAvailable;
    this.state = state;
    this.stateVersion.update((v) => v + 1);
    this.applyFullscreenPreference(state.remoteControl?.fullscreenRequested === true);

    const newContentMode = state.remoteControl?.contentMode ?? 'loop';
    const newFixedContentId = state.remoteControl?.selectedFixedContentId ?? null;

    if (options.resetRotation) {
      this.kioskRotation.adIndex.set(0);
      this.lastNavigationCommandId = state.remoteControl?.navigationCommandId ?? null;
      if (newContentMode === 'fixed' && newFixedContentId) {
        const fixedItem = state.topContent.find((c) => c.id === newFixedContentId) ?? null;
        this.kioskRotation.enterFixedMode(newFixedContentId);
        this.setCurrentContent(fixedItem);
      } else if (newContentMode === 'loop') {
        const first = state.topContent[0] ?? null;
        this.kioskRotation.setCursor(first?.id ?? null);
        this.setCurrentContent(first);
      } else {
        this.setCurrentContent(null);
      }
      this.lastFixedContentId = newFixedContentId;
    } else {
      this.handleFixedModeTransition(previousContentMode ?? 'loop', newContentMode, newFixedContentId);
      this.applyNavigationCommand();
      this.syncCurrentContentForModeChange(previousContentMode ?? 'loop', newContentMode, newFixedContentId, state);
    }

    const contentModeChanged = previousContentMode !== newContentMode;
    const displayAvailabilityChanged = previousDisplayAvailable !== this.displayAvailable;
    if (contentModeChanged || displayAvailabilityChanged) {
      this.schedulePreTransitionPoll();
    }
    this.reconfigurePollingIfNeeded();
  }

  private handleFixedModeTransition(
    previousMode: 'loop' | 'iframe' | 'fixed',
    newMode: 'loop' | 'iframe' | 'fixed',
    newFixedContentId: string | null,
  ): void {
    if (newMode === 'fixed' && newFixedContentId) {
      if (previousMode !== 'fixed' || this.lastFixedContentId !== newFixedContentId) {
        this.kioskRotation.enterFixedMode(newFixedContentId);
      }
      this.lastFixedContentId = newFixedContentId;
      return;
    }
    if (newMode === 'loop' && previousMode === 'fixed') {
      this.kioskRotation.exitFixedMode();
      this.lastFixedContentId = null;
      return;
    }
    if (newMode !== 'fixed') {
      this.lastFixedContentId = null;
    }
  }

  private syncCurrentContentForModeChange(
    previousMode: 'loop' | 'iframe' | 'fixed',
    newMode: 'loop' | 'iframe' | 'fixed',
    newFixedContentId: string | null,
    state: DisplayState,
  ): void {
    if (newMode === 'fixed' && newFixedContentId) {
      const item = state.topContent.find((c) => c.id === newFixedContentId) ?? null;
      this.setCurrentContent(item);
      return;
    }
    if (previousMode === 'fixed' && newMode === 'loop') {
      const restored = this.kioskRotation.currentContentId();
      const item = restored ? state.topContent.find((c) => c.id === restored) ?? null : null;
      this.setCurrentContent(item);
    }
  }

  private applyNavigationCommand(): boolean {
    const commandId = this.state?.remoteControl?.navigationCommandId ?? null;
    const command = this.state?.remoteControl?.navigationCommand ?? null;
    if (!commandId || commandId === this.lastNavigationCommandId) {
      return false;
    }
    if (command === 'pause' || command === 'resume') {
      // FR-011: forward pause/resume only when in loop.
      this.lastNavigationCommandId = commandId;
      this.kioskRotation.applyNavigationCommand(command);
      return true;
    }
    if (command === 'jump_to') {
      // Spec 014 addendum 2 (US7): forward jump_to with the polled
      // `jumpToContentId`. The controller ignores commands that target an
      // id no longer in the polled topContent.
      this.lastNavigationCommandId = commandId;
      const targetId = this.state?.remoteControl?.jumpToContentId ?? null;
      this.kioskRotation.applyNavigationCommand('jump_to', targetId);
      return true;
    }
    if (this.state?.remoteControl?.contentMode !== 'loop') {
      return false;
    }
    this.lastNavigationCommandId = commandId;
    if (command === 'next' || command === 'previous') {
      this.kioskRotation.applyNavigationCommand(command);
    }
    return true;
  }

  private computeContentDurationSeconds(item: DisplayContentItem | null): number {
    if (!item) {
      return this.state?.configuration.defaultTopDurationSeconds ?? 10;
    }
    const effective = item.effectiveDurationSeconds ?? item.durationSeconds;
    return effective ?? this.state?.configuration.defaultTopDurationSeconds ?? 10;
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

  private schedulePreTransitionPoll(): void {
    this.clearPreTransitionPoll();
    if (!this.displayAvailable) return;
    const mode = this.state?.remoteControl?.contentMode ?? 'loop';
    if (mode !== 'loop') return;
    if (!this.currentContent || this.currentContent.contentType === 'video') return;
    const durationMs = this.computeContentDurationSeconds(this.currentContent) * 1000;
    if (durationMs <= 1000) return;
    this.preTransitionPollTimer = setTimeout(() => {
      this.eventBranding.refresh()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
      this.api.getState()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((pollState) => {
          if (this.state !== null) {
            this.applyState(pollState, { resetRotation: false });
          }
        });
    }, durationMs - 1000);
  }

  private clearPreTransitionPoll(): void {
    if (this.preTransitionPollTimer) {
      clearTimeout(this.preTransitionPollTimer);
      this.preTransitionPollTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearPreTransitionPoll();
  }

  private pollIntervalMs(): number {
    return (this.state?.configuration.remoteControlPollingSeconds ?? 5) * 1000;
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.currentPollIntervalMs = this.pollIntervalMs();
    this.pollSub = this.api.watchState(this.currentPollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pollState) => {
        this.eventBranding.refresh()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
        this.applyState(pollState, { resetRotation: false });
      });
  }

  private pollNow(): void {
    if (this.state === null) {
      return;
    }
    this.eventBranding.refresh()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.api.getState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.applyState(state, { resetRotation: false });
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

  private setCurrentContent(item: DisplayContentItem | null): void {
    // Use setCursor() so the controller also syncs its internal regular
    // cursor; otherwise the next advance would lose the position and
    // restart from the first item (per spec 014 addendum 2).
    this.kioskRotation.setCursor(item?.id ?? null);
    this.contentRenderItems = item ? [item] : [];
    this.cdr.markForCheck();
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
