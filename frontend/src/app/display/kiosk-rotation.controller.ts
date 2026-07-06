import { Injectable, Injector, computed, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { DisplayApiService, DisplayContentItem } from '../core/api/display.api';
import { topContentItemMaterialFingerprint } from './display-fingerprint';
import { CursorService } from './cursor.service';
import { DisplayRotationService } from './display-rotation.service';
import { RecurringCadenceService } from './recurring-cadence.service';
import { RotationSchedulerService } from './rotation-scheduler.service';

export type KioskContentMode = 'loop' | 'iframe' | 'fixed';

/** Minimal shape the controller needs from an ad item. */
export interface DisplayAdLike {
  id: string;
  displayOrder: number;
  isActive?: boolean;
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
 * Single-source-of-truth controller for the kiosk's rotation timers and
 * cursor state. Acts as an orchestrator: it owns the public signals the
 * component binds to, and delegates logic to three focused services:
 *
 *  - {@link CursorService} — cursor transition rules (regular /
 *    fixed / recurring). Pure functions.
 *  - {@link RecurringCadenceService} — recurring-content cadence math
 *    (smallest cadence, recurring pick, queue filter). Pure functions.
 *  - {@link RotationSchedulerService} — owns the `setTimeout` handles
 *    for the content + ad rotation. The only stateful service; the
 *    others are stateless helpers so the controller remains the
 *    single source of reactive truth.
 *
 * Public surface (signals + methods) is preserved so the component
 * (CHG-019 / spec 014) keeps compiling unchanged.
 *
 * Covers FR-001..FR-005 (rotation bugs), FR-008a / FR-008b (mode
 * transitions + ads always rotating), FR-011..FR-012a (pause/resume),
 * FR-012 (single configured ad cadence), FR-013 (CSS animation
 * duration from configured default), FR-014 / FR-015 (fixed-mode
 * entry / exit + cursor preservation), and FR-016 (single owner of
 * rotation timers).
 *
 * @see specs/changes/021-kiosk-runtime-refactor/spec.md FR-2
 */
@Injectable()
export class KioskRotationController {
  private readonly cursor = inject(CursorService);
  private readonly cadence = inject(RecurringCadenceService);
  private readonly scheduler = inject(RotationSchedulerService);
  private readonly rotation = inject(DisplayRotationService);
  private readonly displayApi = inject(DisplayApiService);

  /** Public read-only state -------------------------------------------- */
  readonly contentMode = signal<KioskContentMode>('loop');
  readonly currentContentId = signal<string | null>(null);
  readonly adIndex = signal<number>(0);
  /** Bumps on each ad advance so the component can swap CSS animation class. */
  readonly adAnimationRun = signal<number>(0);
  readonly cadenceCounter = signal<number>(0);
  readonly isPaused = signal<boolean>(false);
  readonly fixedContentId = signal<string | null>(null);
  /** True while draining server-backed novelty items (CHG-027). */
  readonly noveltyBurstActive = signal<boolean>(false);
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
  /** Novelty burst: regular cursor frozen until pending items drain (CHG-027). */
  private _noveltyBurstActive = false;
  private _resumeRegularCursorId: string | null = null;
  private _noveltyClaimFailures = new Set<string>();
  private _locallyShownNoveltyIds = new Set<string>();
  private _advanceInProgress = false;

  private _queueItemFingerprint(item: DisplayContentItem): string {
    return topContentItemMaterialFingerprint(item);
  }

  /**
   * Keep the in-flight content timer when a poll-only queue mutation does not
   * affect the slide currently on screen (CHG-027 / CHG-019).
   */
  private _shouldPreserveContentTimer(
    queue: readonly DisplayContentItem[],
    mode: KioskContentMode,
    previousQueueById: ReadonlyMap<string, string>,
    rotationConfigChanged: boolean,
    noveltyAdded: boolean,
  ): boolean {
    if (rotationConfigChanged || mode !== 'loop' || this.isPaused() || !this.scheduler.hasContentTimer()) {
      return false;
    }
    const currentId = this.currentContentId();
    if (currentId === null || previousQueueById.size === 0) {
      return false;
    }
    const currentItem = queue.find((c) => c.id === currentId);
    if (currentItem === undefined || !currentItem.isActive) {
      return false;
    }
    if (noveltyAdded) {
      return true;
    }
    const previousCurrent = previousQueueById.get(currentId);
    if (previousCurrent === undefined) {
      return false;
    }
    return previousCurrent === this._queueItemFingerprint(currentItem);
  }
  /**
   * Debounce bookkeeping for the empty-queue event (FR-009). The
   * controller owns the timer state so the scheduler can stay focused on
   * rotation; the debounce uses its own raw `setTimeout` to keep the
   * 200 ms cadence independent of the scheduler's clamp.
   */
  private _emptyQueueDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _emptyQueueReportedAt = 0;

  /** Hook for the kiosk to subscribe to content-advance ticks ----------- */
  readonly onContentAdvanceListeners: Array<() => void> = [];
  /** Kiosk-side hook to POST rotation events (e.g. content_rotation_empty) */
  rotationEventSink: ((eventType: 'content_rotation_empty', payload: Record<string, unknown>) => void) | null =
    null;

  /**
   * Register a listener that fires whenever the controller advances the
   * content cursor. Returns an unsubscribe function the caller MUST invoke
   * on teardown so the listener does not leak across component instances.
   */
  registerContentAdvanceListener(listener: () => void): () => void {
    this.onContentAdvanceListeners.push(listener);
    return () => {
      const idx = this.onContentAdvanceListeners.indexOf(listener);
      if (idx >= 0) {
        this.onContentAdvanceListeners.splice(idx, 1);
      }
    };
  }

  /**
   * Wire the polled inputs into the controller's signals and arm the
   * rotation timers. The caller MUST pass the `Injector` of the
   * component that owns this controller so the reactive `effect()` is
   * bound to that component's lifecycle (CHG-019 fix).
   *
   * The effect tracks a stable JSON fingerprint of the inputs and only
   * re-arms the timers when the fingerprint changes. This prevents the
   * content timer from being reset on every 5 s poll that returns the
   * same state (the previous design re-armed on every poll because the
   * effect ran unconditionally whenever `stateVersion` bumped).
   */
  bindInputs(inputs: KioskControllerInputs, injector: Injector): void {
    this._effectiveDurationSeconds = inputs.effectiveDurationSeconds;

    let lastFingerprint = '';
    let lastRotationConfigFp = '';
    let lastQueueById = new Map<string, string>();
    runInInjectionContext(injector, () => {
      effect(() => {
        const queue = inputs.contentQueue();
        const mode = inputs.contentMode();
        const ads = inputs.ads();
        const fixedId = inputs.fixedContentId();
        const adDuration = inputs.adDurationSeconds();
        const inlineCount = inputs.inlineAdCount();
        const videoEnd = inputs.videoEndDelaySeconds();

        const rotationConfigFp = JSON.stringify({
          mode,
          ads: ads.map((a) => `${a.id}:${a.displayOrder}:${a.isActive}`),
          fixedId,
          adDuration,
          inlineCount,
          videoEnd,
        });

        const fp = JSON.stringify({
          queue: queue.map((c) => this._queueItemFingerprint(c)),
          mode,
          ads: ads.map((a) => `${a.id}:${a.displayOrder}:${a.isActive}`),
          fixedId,
          adDuration,
          inlineCount,
          videoEnd,
        });

        this.contentMode.set(mode);
        this._contentQueue.set(queue);
        this._pruneNoveltyClaimFailures(queue);
        this._ads.set(ads);
        this._adDurationSeconds.set(adDuration);
        this._inlineAdCount.set(Math.max(1, inlineCount));
        this._videoEndDelaySeconds.set(videoEnd);
        this.fixedContentId.set(fixedId);

        // Spec 014 addendum 2: when the admin updates a content's
        // `recurringEveryXIterations` (or removes a recurring item), the
        // polled state arrives with the new cadence. The next advance
        // will read the updated cadence via `RecurringCadenceService`
        // so no manual refresh is required. We also drop the cadence
        // counter back to 0 when there are no recurring items, so the
        // counter never grows unbounded after the operator clears the
        // last recurring.
        if (this.cadence.shouldResetOnEmptyRecurring(queue, this.cadenceCounter())) {
          this.cadenceCounter.set(0);
        }

        const queueById = new Map(queue.map((c) => [c.id, this._queueItemFingerprint(c)]));

        if (fp !== lastFingerprint) {
          const pendingNovelties = this.rotation.pendingNovelties(queue, new Set()).map((i) => i.id);
          const noveltyAdded = pendingNovelties.some((id) => !lastQueueById.has(id));
          const rotationConfigChanged = rotationConfigFp !== lastRotationConfigFp;
          const preserveContentTimer = this._shouldPreserveContentTimer(
            queue,
            mode,
            lastQueueById,
            rotationConfigChanged,
            noveltyAdded,
          );
          lastFingerprint = fp;
          lastRotationConfigFp = rotationConfigFp;
          lastQueueById = queueById;
          if (preserveContentTimer) {
            this._armAdTimerOnly();
            this._scheduleEmptyQueueCheck();
          } else {
            this._armAllTimers();
          }
        }
      });
    });
  }

  /** Reset on destroy (called from component ngOnDestroy). */
  detach(): void {
    this.scheduler.clearAll();
    if (this._emptyQueueDebounceTimer) {
      clearTimeout(this._emptyQueueDebounceTimer);
      this._emptyQueueDebounceTimer = null;
    }
    // Drop every listener so a dangling reference cannot fire against a
    // destroyed component. The component is expected to call its own
    // unsubscribe (returned by registerContentAdvanceListener) on teardown;
    // this is a defence-in-depth cleanup in case the caller forgot.
    this.onContentAdvanceListeners.length = 0;
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
    this.scheduler.clearContent();
    // Intentionally do NOT clear the ad timer: the ad band is the
    // sponsor revenue surface and must keep rotating on its own cadence
    // regardless of the content pause flag.
  }

  /** US3 — local resume. */
  resume(): void {
    if (this.contentMode() !== 'loop') return;
    this.isPaused.set(false);
    this._armContentTimerOnly();
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
    const next = this.cursor.applySetCursor(itemId, this._regularCursorId, isRegular);
    this.currentContentId.set(next.currentContentId);
    this._regularCursorId = next.regularCursorId;
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
    const next = this.cursor.applyEnterFixed(
      contentId,
      this.currentContentId(),
      this._loopCursorBeforeFixed
    );
    this._loopCursorBeforeFixed = next.loopCursorBeforeFixed;
    this.fixedContentId.set(contentId);
    this.currentContentId.set(next.currentContentId);
    this.scheduler.clearContent();
    this._armAdTimerOnly();
  }

  /**
   * FR-014 / FR-015: exit fixed mode. The remembered loop cursor is restored
   * and the regular content timer re-arms. The ad timer is left running.
   */
  exitFixedMode(): void {
    this.fixedContentId.set(null);
    const next = this.cursor.applyExitFixed(this.currentContentId(), this._loopCursorBeforeFixed);
    this.currentContentId.set(next.currentContentId);
    this._loopCursorBeforeFixed = next.loopCursorBeforeFixed;
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
    this.scheduler.clearContent();
    const delay = this._videoEndDelaySeconds() * 1000;
    this.scheduler.armContent(delay, () => this._advanceContent());
  }

  // ---------------------------------------------------------------- private

  private _armAllTimers(): void {
    this.scheduler.clearContent();
    this.scheduler.clearAd();

    this._armContentTimerOnly();

    // Ad timer (always, even in iframe / fixed / paused, per FR-008b).
    this._armAdTimerOnly();

    // Empty-queue debounced event (FR-009 / spec 007).
    this._scheduleEmptyQueueCheck();
  }

  private _armContentTimerOnly(): void {
    this.scheduler.clearContent();

    // Content timer (loop mode only, only when NOT paused).
    if (this.contentMode() === 'loop' && !this.isPaused() && this._contentQueue().length > 0) {
      const current = this.currentContent();
      if (current && current.contentType === 'video') {
        // Wait for `(ended)` event; nothing to arm here.
      } else {
        const dur = this._effectiveDurationSeconds(current) * 1000;
        this.scheduler.armContent(dur, () => this._advanceContent());
      }
    }
  }

  private _armAdTimerOnly(): void {
    if (this._ads().length === 0) return;
    const dur = this._adDurationSeconds() * 1000;
    this.scheduler.armAd(dur, () => this._advanceAd());
  }

  private _advanceContent(): void {
    const queue = this._contentQueue();
    const pending = this.rotation.pendingNovelties(queue, this._noveltySkipIds());
    const needsNovelty =
      this.contentMode() === 'loop' &&
      !this.isPaused() &&
      (this._noveltyBurstActive || pending.length > 0);

    if (needsNovelty) {
      void this._advanceContentAsync();
      return;
    }

    this._advanceContentRegular();
  }

  private async _advanceContentAsync(): Promise<void> {
    if (this._advanceInProgress) {
      return;
    }
    this._advanceInProgress = true;
    try {
      const queue = this._contentQueue();
      if (queue.length === 0) {
        this.currentContentId.set(null);
        this._regularCursorId = null;
        this._clearNoveltyBurst();
        this._scheduleEmptyQueueCheck();
        return;
      }

      const regularQueue = this.cadence.regularQueue(queue);
      const handledNovelty = await this._tryAdvanceNovelty(queue, regularQueue);
      if (handledNovelty) {
        return;
      }

      this._advanceContentRegular();
    } finally {
      this._advanceInProgress = false;
    }
  }

  private _advanceContentRegular(): void {
    const queue = this._contentQueue();
    if (queue.length === 0) {
      this.currentContentId.set(null);
      this._regularCursorId = null;
      this._clearNoveltyBurst();
      this._scheduleEmptyQueueCheck();
      return;
    }

    const regularQueue = this.cadence.regularQueue(queue);

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
      this.cadenceCounter.update((c) => this.cadence.nextCounter(c));
      const recurring = this.cadence.pickRecurringItem(queue);
      // Spec 007 US2: cadence N means the recurring item appears on
      // the (N+1)th advance — pattern R, R, R, REC for N=3 — so the
      // trigger is `counter > cadence`, not `>=`.
      if (
        recurring !== null &&
        this.cadence.shouldFireRecurring(queue, this.cadenceCounter())
      ) {
        this.currentContentId.set(recurring.id);
        this.cadenceCounter.set(0);
        this.onContentAdvanceListeners.forEach((fn) => fn());
        this._armContentTimerOnly();
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
    this._armContentTimerOnly();
  }

  private async _tryAdvanceNovelty(
    queue: DisplayContentItem[],
    regularQueue: DisplayContentItem[],
  ): Promise<boolean> {
    let pending = this.rotation.pendingNovelties(queue, this._noveltySkipIds());

    if (pending.length > 0) {
      if (!this._noveltyBurstActive) {
        this._resumeRegularCursorId = this.currentContentId() ?? this._regularCursorId;
        this._noveltyBurstActive = true;
        this.noveltyBurstActive.set(true);
      }

      while (pending.length > 0) {
        const candidate = pending[0]!;
        const claimed = await this._tryConsumeNovelty(candidate.id);
        if (claimed) {
          this._locallyShownNoveltyIds.add(candidate.id);
          this.currentContentId.set(candidate.id);
          this._notifyContentAdvance();
          return true;
        }
        this._noveltyClaimFailures.add(candidate.id);
        pending = this.rotation.pendingNovelties(queue, this._noveltySkipIds());
      }
    }

    if (this._noveltyBurstActive) {
      this._clearNoveltyBurst();
      const nextRegular = this.rotation.pickNext(regularQueue, this._resumeRegularCursorId);
      this._regularCursorId = nextRegular?.id ?? null;
      this.currentContentId.set(nextRegular?.id ?? null);
      this._resumeRegularCursorId = null;
      this._notifyContentAdvance();
      return true;
    }

    return false;
  }

  private async _tryConsumeNovelty(contentId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.displayApi.consumeNovelty(contentId));
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        return false;
      }
      return false;
    }
  }

  private _noveltySkipIds(): Set<string> {
    return new Set([...this._noveltyClaimFailures, ...this._locallyShownNoveltyIds]);
  }

  private _clearNoveltyBurst(): void {
    this._noveltyBurstActive = false;
    this.noveltyBurstActive.set(false);
    this._locallyShownNoveltyIds.clear();
  }

  private _pruneNoveltyClaimFailures(queue: DisplayContentItem[]): void {
    const byId = new Map(queue.map((item) => [item.id, item]));
    for (const id of [...this._noveltyClaimFailures, ...this._locallyShownNoveltyIds]) {
      const item = byId.get(id);
      if (!item || item.isNovelty !== true) {
        this._noveltyClaimFailures.delete(id);
        this._locallyShownNoveltyIds.delete(id);
      }
    }
  }

  private _notifyContentAdvance(): void {
    this.onContentAdvanceListeners.forEach((fn) => fn());
    this._armContentTimerOnly();
  }

  private _rewindContent(): void {
    const queue = this._contentQueue();
    if (queue.length === 0) return;
    const regularQueue = this.cadence.regularQueue(queue);
    const prev = regularQueue.length > 0
      ? this.rotation.pickPrevious(regularQueue, this._regularCursorId)
      : this.rotation.pickPrevious(queue, this.currentContentId());
    this._regularCursorId = prev?.id ?? null;
    this.currentContentId.set(prev?.id ?? null);
    this.onContentAdvanceListeners.forEach((fn) => fn());
    this._armContentTimerOnly();
  }

  private _advanceAd(): void {
    const ads = this._ads();
    if (ads.length === 0) return;
    this.adIndex.update((i) => (i + 1) % ads.length);
    this.adAnimationRun.update((n) => (n + 1) % 2);
    this._armAdTimerOnly();
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
