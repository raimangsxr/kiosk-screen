import { Injectable, Injector, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { DisplayContentItem } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

export type KioskContentMode = 'loop' | 'iframe' | 'fixed';

/** Minimal shape the controller needs from an ad item. */
export interface DisplayAdLike {
  id: string;
  displayOrder: number;
}

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
  ads: () => ReadonlyArray<DisplayAdLike>;
  fixedContentId: () => string | null;
  /** Per-content (top region) duration; not used for ads (FR-012). */
  effectiveDurationSeconds: (item: DisplayContentItem | null) => number;
  /** Ad rotation cadence (single source of truth per FR-012). */
  adDurationSeconds: () => number;
  /** Number of ads visible in the bottom band (default 1). */
  inlineAdCount: () => number;
  videoEndDelaySeconds: () => number;
}

/**
 * Single-source-of-truth controller for the kiosk's rotation timers and cursor
 * state. Exposes signals that the component binds to; one effect() arms the
 * timers reactively whenever any input changes.
 *
 * Covers FR-001..FR-005 (rotation bugs), FR-008a / FR-008b (mode transitions +
 * ads always rotating), FR-011..FR-012a (pause/resume), FR-012 (single
 * configured ad cadence), FR-013 (CSS animation duration from configured
 * default), FR-014 / FR-015 (fixed-mode entry / exit + cursor preservation),
 * and FR-016 (single owner of rotation timers).
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
  readonly currentAd = computed<DisplayAdLike | null>(() => {
    const list = this._ads();
    if (list.length === 0) return null;
    return list[this.adIndex() % list.length] ?? null;
  });
  /**
   * Ads visible in the bottom band, ordered by rotation, sliced by
   * `inlineAdCount` (FR-012 / US2). Excludes empty lists; the component still
   * applies `adsVisible` at the template level.
   */
  readonly visibleAds = computed<DisplayAdLike[]>(() => {
    const list = this._ads();
    if (list.length === 0) return [];
    const start = ((this.adIndex() % list.length) + list.length) % list.length;
    const rotated = [...list.slice(start), ...list.slice(0, start)];
    const count = Math.max(1, this._inlineAdCount());
    return rotated.slice(0, Math.min(count, rotated.length));
  });

  /** Internal state ----------------------------------------------------- */
  private _contentQueue = signal<DisplayContentItem[]>([]);
  private _ads = signal<readonly DisplayAdLike[]>([]);
  private _adDurationSeconds = signal<number>(10);
  private _inlineAdCount = signal<number>(1);
  private _videoEndDelaySeconds = signal<number>(2);
  private _effectiveDurationSeconds: (item: DisplayContentItem | null) => number = () => 10;

  /** Cursor memory (US5 / FR-015) ------------------------------------- */
  private _loopCursorBeforeFixed: string | null = null;
  /**
   * Spec 007 US2 / FR-008a: the cursor in the *regular* queue (i.e. with
   * recurring items filtered out). After a recurring item is displayed, the
   * next advance continues from where the regular rotation left off, so the
   * regular cadence is preserved across recurring insertions.
   */
  private _regularCursorId: string | null = null;
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

  private readonly injector = inject(Injector);

  constructor(private readonly rotation: DisplayRotationService) {}

  /** Wire inputs and start the single timer effect. Call once at init. */
  attach(inputs: KioskControllerInputs): void {
    this._effectiveDurationSeconds = inputs.effectiveDurationSeconds;

    runInInjectionContext(this.injector, () => {
      effect(() => {
        const queue = inputs.contentQueue();
        this.contentMode.set(inputs.contentMode());
        this._contentQueue.set(queue);
        this._ads.set(inputs.ads());
        this._adDurationSeconds.set(inputs.adDurationSeconds());
        this._inlineAdCount.set(Math.max(1, inputs.inlineAdCount()));
        this._videoEndDelaySeconds.set(inputs.videoEndDelaySeconds());
        this.fixedContentId.set(inputs.fixedContentId());

        // Spec 014 addendum 2: when the admin updates a content's
        // `recurringEveryXIterations` (or removes a recurring item), the
        // polled state arrives with the new cadence. The next advance
        // will read the updated cadence via `_smallestRecurringCadence`
        // so no manual refresh is required. We also drop the cadence
        // counter back to 0 when there are no recurring items, so the
        // counter never grows unbounded after the operator clears the
        // last recurring.
        if (this._smallestRecurringCadence() === null && this.cadenceCounter() !== 0) {
          this.cadenceCounter.set(0);
        }

        this._armAllTimers();
      }, { manualCleanup: false });
    });
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

  /** US3 — apply a remote-control navigation command. Spec 005 addendum
   *  adds `jump_to` with a target content id; spec 014 addendum 2 wires
   *  the controller to consume it. */
  applyNavigationCommand(
    command: 'next' | 'previous' | 'pause' | 'resume' | 'jump_to',
    jumpToContentId?: string | null,
  ): void {
    if (command === 'jump_to') {
      if (this.contentMode() !== 'loop') return;
      if (!jumpToContentId) return;
      const queue = this._contentQueue();
      // Spec 014 US7 acceptance 3: silently ignore jump_to for an id that
      // is no longer in the polled topContent (e.g. it was deleted between
      // the operator click and the next poll). The backend audit event
      // still records the attempt.
      const target = queue.find((item) => item.id === jumpToContentId);
      if (!target) return;
      this.currentContentId.set(target.id);
      // If the target is a regular item, also update the regular cursor
      // so the next advance continues from there. If it is a recurring
      // item, leave the regular cursor untouched so the regular cadence
      // continues at the same position.
      if (!target.recurringEveryXIterations) {
        this._regularCursorId = target.id;
      }
      // Spec 007 US2 acceptance 8: jump_to resets the cadence counter so
      // the next recurring cycle starts from 0.
      this.cadenceCounter.set(0);
      this._armAllTimers();
      return;
    }
    if (this.contentMode() !== 'loop') return;
    if (command === 'next') this._advanceContent();
    else if (command === 'previous') this._rewindContent();
    else if (command === 'pause') this.pause();
    else if (command === 'resume') this.resume();
  }

  /** US3 — local pause. FR-012a: pause is discarded on mode change.
   *  Spec 007 FR-008 (addendum): pause ONLY freezes the content timer;
   *  the ad-band timer keeps rotating on its own cadence. */
  pause(): void {
    if (this.contentMode() !== 'loop') return;
    this.isPaused.set(true);
    this._clearContentTimer();
    // Intentionally do NOT clear the ad timer: the ad band is the
    // sponsor revenue surface and must keep rotating on its own cadence
    // regardless of the content pause flag.
  }

  /** US3 — local resume. */
  resume(): void {
    if (this.contentMode() !== 'loop') return;
    this.isPaused.set(false);
    this._armAllTimers();
  }

  /**
   * Bootstrap the cursor: sets the displayed content id AND the regular
   * cursor. The display-screen component calls this when first wiring
   * up the polled state (per spec 014 addendum 2: the kiosk must drive
   * its cursor from `topContent[0]`).
   *
   * `isRegular` defaults to `true` because the bootstrap path is
   * `topContent[0]`, which the operator has not marked as recurring
   * (recurring items are filtered out of the regular rotation). The
   * caller can pass `false` for an explicitly-recurring target; in
   * that case the regular cursor is left untouched so the next regular
   * advance continues from the previous position.
   */
  setCursor(itemId: string | null, isRegular: boolean = true): void {
    this.currentContentId.set(itemId);
    if (itemId === null) {
      this._regularCursorId = null;
      return;
    }
    if (isRegular) {
      this._regularCursorId = itemId;
    }
  }

  /**
   * FR-014 / FR-015: enter fixed mode on `selectedFixedContentId`. The
   * current loop cursor is remembered; the content timer is cleared; the ad
   * timer keeps running (per FR-008b).
   */
  enterFixedMode(contentId: string): void {
    // Preserve the loop cursor the first time we pin, regardless of whether
    // the controller's contentMode was already flipped to 'fixed' by the
    // effect (the component still has to call this method to confirm the
    // fixed target and stamp the cursor memory).
    if (this._loopCursorBeforeFixed === null) {
      this._loopCursorBeforeFixed = this.currentContentId();
    }
    this.fixedContentId.set(contentId);
    this.currentContentId.set(contentId);
    this._clearContentTimer();
    this._armAdTimerOnly();
  }

  /**
   * FR-014 / FR-015: exit fixed mode. The remembered loop cursor is restored
   * and the regular content timer re-arms. The ad timer is left running.
   */
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
    if (this.contentMode() === 'fixed') {
      // FR-014: in fixed mode the component restarts the video directly
      // (currentTime=0; play()) instead of advancing the cursor.
      return;
    }
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

    // Content timer (loop mode only, only when NOT paused).
    if (this.contentMode() === 'loop' && !this.isPaused() && this._contentQueue().length > 0) {
      const current = this.currentContent();
      if (current && current.contentType === 'video') {
        // Wait for `(ended)` event; nothing to arm here.
      } else {
        const dur = this._effectiveDurationSeconds(current) * 1000;
        this._contentTimer = setTimeout(() => this._advanceContent(), Math.max(dur, 100));
      }
    }

    // Ad timer (always, even in iframe / fixed / paused, per FR-008b).
    this._armAdTimerOnly();

    // Empty-queue debounced event (FR-009 / spec 007).
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
      this._regularCursorId = null;
      this._scheduleEmptyQueueCheck();
      return;
    }

    const regularQueue = this._regularQueue();

    // Spec 007 US2 / FR-008a (recurring content): the cadence counter is
    // incremented on every *regular* advance; if it reaches the smallest
    // recurring cadence, the recurring item is shown in place of the next
    // regular advance and the counter is reset to 0. The recurring items
    // are excluded from the regular pickNext rotation so the operator can
    // place them anywhere in display order without polluting the cadence.
    if (
      this.contentMode() === 'loop' &&
      !this.isPaused() &&
      regularQueue.length > 0
    ) {
      this.cadenceCounter.update((c) => c + 1);
      const recurring = this._pickRecurringItem();
      const smallestCadence = this._smallestRecurringCadence();
      // Spec 007 US2: cadence N means the recurring item appears on
      // the (N+1)th advance — pattern R, R, R, REC for N=3 — so the
      // trigger is `counter > cadence`, not `>=`.
      if (
        smallestCadence !== null &&
        this.cadenceCounter() > smallestCadence &&
        recurring !== null
      ) {
        this.currentContentId.set(recurring.id);
        this.cadenceCounter.set(0);
        this.onContentAdvanceListeners.forEach((fn) => fn());
        this._armAllTimers();
        return;
      }
    }

    let nextRegular: DisplayContentItem | null;
    if (regularQueue.length === 0) {
      // Only recurring items in the queue — fall through to pickNext over
      // the full queue so the kiosk still advances.
      nextRegular = this.rotation.pickNext(queue, this.currentContentId());
    } else {
      nextRegular = this.rotation.pickNext(regularQueue, this._regularCursorId);
    }
    this._regularCursorId = nextRegular?.id ?? null;
    this.currentContentId.set(nextRegular?.id ?? null);

    this.onContentAdvanceListeners.forEach((fn) => fn());
    this._armAllTimers();
  }

  /**
   * Spec 007 US2 / FR-008a: returns the smallest positive
   * `recurring_every_x_iterations` across the active recurring items, or
   * `null` if none are configured. The cadence counter is reset to 0
   * every time it reaches this value.
   */
  private _smallestRecurringCadence(): number | null {
    let smallest: number | null = null;
    for (const item of this._contentQueue()) {
      const n = item.recurringEveryXIterations;
      if (typeof n === 'number' && n >= 1) {
        if (smallest === null || n < smallest) {
          smallest = n;
        }
      }
    }
    return smallest;
  }

  /**
   * Spec 007 US2 / FR-008a: returns the recurring item that should be
   * shown at the current cadence tick. If multiple items share the
   * smallest cadence, the one with the smallest display order wins.
   */
  private _pickRecurringItem(): DisplayContentItem | null {
    const smallest = this._smallestRecurringCadence();
    if (smallest === null) return null;
    const candidates = this._contentQueue()
      .filter((item) => item.recurringEveryXIterations === smallest)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return candidates[0] ?? null;
  }

  /**
   * Spec 007 US2 / FR-008a: the regular rotation queue is the polled
   * topContent with every recurring item removed (they are surfaced
   * separately via the cadence counter). The regular queue preserves
   * display order so `pickNext` walks through the operator's natural
   * rotation.
   */
  private _regularQueue(): DisplayContentItem[] {
    return this._contentQueue()
      .filter((item) => !item.recurringEveryXIterations)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private _rewindContent(): void {
    const queue = this._contentQueue();
    if (queue.length === 0) return;
    const regularQueue = this._regularQueue();
    const prev = regularQueue.length > 0
      ? this.rotation.pickPrevious(regularQueue, this._regularCursorId)
      : this.rotation.pickPrevious(queue, this.currentContentId());
    this._regularCursorId = prev?.id ?? null;
    this.currentContentId.set(prev?.id ?? null);
    this.onContentAdvanceListeners.forEach((fn) => fn());
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
    // Spec 007 FR-008 (addendum): the ad-band timer MUST keep rotating
    // even while the content rotation is paused. We no longer bail out
    // on `isPaused()` here.
    if (this._ads().length === 0) return;
    const dur = this._adDurationSeconds() * 1000;
    this._adTimer = setTimeout(() => this._advanceAd(), Math.max(dur, 100));
  }

  /** Debounced (60s) POST on the empty queue (spec 007 FR-009). */
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
