import { Injectable } from '@angular/core';

/**
 * Owns the rotation timers. Pure: takes "fire callback" functions and
 * arms `setTimeout` with the right duration. Holds no domain state — the
 * controller decides what to do when a timer fires.
 *
 * Two timers are exposed:
 *  - **content timer** — arms the next content advance. Clamped to a
 *    minimum of 100 ms so a misconfigured duration cannot busy-loop the
 *    kiosk.
 *  - **ad timer** — arms the next ad advance. Same minimum clamp. Per
 *    spec 007 FR-008b, the ad timer must keep rotating even while the
 *    content rotation is paused.
 *
 * The service tracks the active timers so the controller can cancel
 * them (e.g. on `pause`, on rotation reset, or on component teardown).
 *
 * @see specs/changes/021-kiosk-runtime-refactor/spec.md FR-2
 */
@Injectable()
export class RotationSchedulerService {
  private _contentTimer: ReturnType<typeof setTimeout> | null = null;
  private _adTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Minimum armed duration. The original controller clamps every timer
   * to ≥ 100 ms (`Math.max(durationMs, 100)`) to keep the kiosk from
   * busy-looping when an upstream misconfiguration passes 0 or a
   * negative duration. We preserve that safety here.
   */
  static readonly MIN_DURATION_MS = 100;

  /** Arm the content advance timer. Replaces any previously armed content timer. */
  armContent(durationMs: number, onFire: () => void): void {
    this.clearContent();
    const safeDuration = Math.max(durationMs, RotationSchedulerService.MIN_DURATION_MS);
    this._contentTimer = setTimeout(() => {
      this._contentTimer = null;
      onFire();
    }, safeDuration);
  }

  /** Arm the ad advance timer. Replaces any previously armed ad timer. */
  armAd(durationMs: number, onFire: () => void): void {
    this.clearAd();
    const safeDuration = Math.max(durationMs, RotationSchedulerService.MIN_DURATION_MS);
    this._adTimer = setTimeout(() => {
      this._adTimer = null;
      onFire();
    }, safeDuration);
  }

  /** Cancel the content timer if armed. Safe to call when nothing is armed. */
  clearContent(): void {
    if (this._contentTimer !== null) {
      clearTimeout(this._contentTimer);
      this._contentTimer = null;
    }
  }

  /** Cancel the ad timer if armed. Safe to call when nothing is armed. */
  clearAd(): void {
    if (this._adTimer !== null) {
      clearTimeout(this._adTimer);
      this._adTimer = null;
    }
  }

  /** Cancel every armed timer. Use this on pause / reset / teardown. */
  clearAll(): void {
    this.clearContent();
    this.clearAd();
  }

  /** True when a content timer is currently armed. */
  hasContentTimer(): boolean {
    return this._contentTimer !== null;
  }

  /** True when an ad timer is currently armed. */
  hasAdTimer(): boolean {
    return this._adTimer !== null;
  }
}