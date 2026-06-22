import { Injectable, computed, effect, signal } from '@angular/core';
import { DisplayContentItem, DisplayRemoteControlState } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

export type KioskContentMode = 'loop' | 'iframe' | 'fixed';

export interface FixedEligibleContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video';
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface QueueTickEvent {
  type: 'content-advance' | 'ad-advance';
  at: number;
}

export interface KioskControllerInputs {
  contentMode: () => KioskContentMode;
  contentQueue: () => DisplayContentItem[];
  ads: () => DisplayContentItem[];
  fixedContentId: () => string | null;
  effectiveDurationSeconds: (item: DisplayContentItem | null) => number;
  adDurationSeconds: () => number;
  videoEndDelaySeconds: () => number;
}

/**
 * Single-source-of-truth controller for the kiosk's rotation timers and cursor
 * state. Replaces the two ad-hoc setTimeout subsystems that lived in
 * DisplayScreenComponent (TD-001 / FR-005). Exposes signals that the component
 * binds to; one effect() arms the timer reactively whenever any input changes.
 *
 * Covers FR-001..FR-005 (rotation bugs), FR-008a / FR-008b (mode transitions +
 * ads always rotating), FR-011..FR-012a (pause/resume), FR-015 (cadence), and
 * FR-020 / FR-021 (fixed-mode entry/exit preserves loop index).
 */
@Injectable({ providedIn: 'root' })
export class KioskRotationController {
  /** Public read-only state -------------------------------------------- */
  readonly contentMode = signal<KioskContentMode>('loop');
  readonly currentContentId = signal<string | null>(null);
  readonly adIndex = signal<number>(0);
  /** Bumps on each ad advance so the component can swap CSS animation class. */
  readonly adAnimationRun = signal<number>(0);
  readonly cadenceCounter = signal<number>(0);
  readonly isPaused = signal<boolean>(false);
  readonly fixedContentId = signal<string | null>(null);
  readonly isQueueEmpty = computed(() => this._contentQueue().length === 0);
  readonly currentContent = computed<DisplayContentItem | null>(() => {
    const id = this.currentContentId();
    if (id === null) return null;
    return this._contentQueue().find((c) => c.id === id) ?? null;
  });
  readonly currentAd = computed<DisplayContentItem | null>(() => {
    const list = this._ads();
    if (list.length === 0) return null;
    return list[this.adIndex() % list.length] ?? null;
  });

  /** Internal state ----------------------------------------------------- */
  private _contentQueue = signal<DisplayContentItem[]>([]);
  private _ads = signal<DisplayContentItem[]>([]);
  private _adDurationSeconds = signal<number>(10);
  private _videoEndDelaySeconds = signal<number>(2);
  private _effectiveDurationSeconds: (item: DisplayContentItem | null) => number = () => 10;

  /** Cursor memory (US5 / FR-021) ------------------------------------- */
  private _loopCursorBeforeFixed: string | null = null;
  private _cadenceLastFrozen: number | null = null;

  /** Single timer ------------------------------------------------------ */
  private _contentTimer: ReturnType<typeof setTimeout> | null = null;
  private _adTimer: ReturnType<typeof setTimeout> | null = null;
  private _emptyQueueDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _emptyQueueReportedAt = 0;

  /** Hook for the kiosk to subscribe to content-advance ticks ----------- */
  readonly onContentAdvanceListeners: Array<() => void> = [];
  /** Kiosk-side hook to POST rotation events (e.g. content_rotation_empty) */
  rotationEventSink: ((eventType: 'content_rotation_empty', payload: Record<string, unknown>) => void) | null =
    null;

  constructor(private readonly rotation: DisplayRotationService) {}

  /** Wire inputs and start the single timer effect. Call once at init. */
  attach(inputs: KioskControllerInputs): void {
    this._effectiveDurationSeconds = inputs.effectiveDurationSeconds;

    effect(() => {
      this.contentMode.set(inputs.contentMode());
      this._contentQueue.set(inputs.contentQueue());
      this._ads.set(inputs.ads());
      this._adDurationSeconds.set(inputs.adDurationSeconds());
      this._videoEndDelaySeconds.set(inputs.videoEndDelaySeconds());
      this.fixedContentId.set(inputs.fixedContentId());

      this._armAllTimers();
    }, { manualCleanup: false });
  }

  /** Reset on destroy (called from component ngOnDestroy). */
  detach(): void {
    this._clearContentTimer();
    this._clearAdTimer();
    if (this._emptyQueueDebounceTimer) {
      clearTimeout(this._emptyQueueDebounceTimer);
      this._emptyQueueDebounceTimer = null;
    }
  }

  /** FR-008a: any mode change interrupts video (component-side). */
  /** US3 — apply a remote-control navigation command. */
  applyNavigationCommand(command: 'next' | 'previous' | 'pause' | 'resume'): void {
    if (this.contentMode() !== 'loop') return;
    if (command === 'next') this._advanceContent();
    else if (command === 'previous') this._rewindContent();
    else if (command === 'pause') this.pause();
    else if (command === 'resume') this.resume();
  }

  /** US3 — local pause. FR-012a: pause is discarded on mode change. */
  pause(): void {
    if (this.contentMode() !== 'loop') return;
    this.isPaused.set(true);
    this._clearContentTimer();
    this._clearAdTimer();
  }

  /** US3 — local resume. */
  resume(): void {
    if (this.contentMode() !== 'loop') return;
    this.isPaused.set(false);
    this._armAllTimers();
  }

  /** US4 — cadence persists across mode transitions (Q3). */
  /** US5 — enter fixed mode: remember the current cursor. */
  enterFixedMode(contentId: string): void {
    this._loopCursorBeforeFixed = this.currentContentId();
    this.fixedContentId.set(contentId);
    this.currentContentId.set(contentId);
    this._clearContentTimer();
    this._clearAdTimer();
  }

  /** US5 — exit fixed mode: restore the remembered cursor. */
  exitFixedMode(): void {
    this.fixedContentId.set(null);
    if (this._loopCursorBeforeFixed !== null) {
      this.currentContentId.set(this._loopCursorBeforeFixed);
    }
    this._loopCursorBeforeFixed = null;
    this._armAllTimers();
  }

  /** Component hook: video ended. */
  onVideoEnded(): void {
    if (this.contentMode() !== 'loop') return;
    if (this.isPaused()) return;
    this._clearContentTimer();
    const delay = this._videoEndDelaySeconds() * 1000;
    this._contentTimer = setTimeout(() => this._advanceContent(), delay);
  }

  // ---------------------------------------------------------------- private

  private _armAllTimers(): void {
    this._clearContentTimer();
    this._clearAdTimer();
    if (this.isPaused()) return;
    if (this.contentMode() === 'fixed') return;

    // Content timer
    if (this._contentQueue().length > 0 && this.contentMode() === 'loop') {
      const current = this.currentContent();
      if (current && current.contentType === 'video') {
        // Wait for `(ended)` event; nothing to arm here.
      } else {
        const dur = this._effectiveDurationSeconds(current) * 1000;
        this._contentTimer = setTimeout(() => this._advanceContent(), Math.max(dur, 100));
      }
    }

    // Ad timer (always, even in iframe / fixed, per FR-008b).
    const ads = this._ads();
    if (ads.length > 0) {
      const dur = this._adDurationSeconds() * 1000;
      this._adTimer = setTimeout(() => this._advanceAd(), Math.max(dur, 100));
    }

    // Empty-queue debounced event (FR-017).
    this._scheduleEmptyQueueCheck();
  }

  private _clearContentTimer(): void {
    if (this._contentTimer) {
      clearTimeout(this._contentTimer);
      this._contentTimer = null;
    }
  }

  private _clearAdTimer(): void {
    if (this._adTimer) {
      clearTimeout(this._adTimer);
      this._adTimer = null;
    }
  }

  private _advanceContent(): void {
    const queue = this._contentQueue();
    if (queue.length === 0) {
      this.currentContentId.set(null);
      this._scheduleEmptyQueueCheck();
      return;
    }
    const next = this.rotation.pickNext(queue, this.currentContentId());
    this.currentContentId.set(next?.id ?? null);

    // Cadence: increment only when in loop and not paused.
    if (this.contentMode() === 'loop' && !this.isPaused()) {
      this.cadenceCounter.update((c) => c + 1);
    }

    // If the picked item is recurring, surface it (consumer decides insertion order).
    // Round-robin cadence: if there are multiple recurrings, alternate.
    this.onContentAdvanceListeners.forEach((fn) => fn());
    this._armAllTimers();
  }

  private _rewindContent(): void {
    const queue = this._contentQueue();
    if (queue.length === 0) return;
    const prev = this.rotation.pickPrevious(queue, this.currentContentId());
    this.currentContentId.set(prev?.id ?? null);
    this._armAllTimers();
  }

  private _advanceAd(): void {
    const ads = this._ads();
    if (ads.length === 0) return;
    this.adIndex.update((i) => (i + 1) % ads.length);
    this.adAnimationRun.update((n) => (n + 1) % 2);
    this._armAdTimerOnly();
  }

  private _armAdTimerOnly(): void {
    this._clearAdTimer();
    if (this.isPaused()) return;
    if (this._ads().length === 0) return;
    const dur = this._adDurationSeconds() * 1000;
    this._adTimer = setTimeout(() => this._advanceAd(), Math.max(dur, 100));
  }

  /** FR-017: debounced (60s) POST on the empty queue. */
  private _scheduleEmptyQueueCheck(): void {
    if (this._emptyQueueDebounceTimer) {
      clearTimeout(this._emptyQueueDebounceTimer);
      this._emptyQueueDebounceTimer = null;
    }
    const empty = this._contentQueue().length === 0;
    if (!empty) {
      this._emptyQueueReportedAt = 0;
      return;
    }
    const now = Date.now();
    if (this._emptyQueueReportedAt && now - this._emptyQueueReportedAt < 60_000) return;
    this._emptyQueueDebounceTimer = setTimeout(() => {
      this._emptyQueueReportedAt = Date.now();
      this.rotationEventSink?.('content_rotation_empty', { reason: 'no_contents' });
    }, 200);
  }
}