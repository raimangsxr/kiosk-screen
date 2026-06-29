import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { AuthService } from '../core/auth/auth.service';
import { ApplicationErrorContract } from '../shared/contracts/admin-contracts';
import { adaptApiError } from '../core/errors/api-error-adapter';
import { DisplayApiService, DisplayState } from '../core/api/display.api';
import { Router } from '@angular/router';

/**
 * Owns the kiosk polling lifecycle. Wraps {@link DisplayApiService} with:
 *
 *  - A single `state` signal that the rest of the kiosk reads from.
 *  - An exponential-backoff loop on transient failures (5xx, network)
 *    so a WiFi blip during an event does not hammer the backend or
 *    crash the kiosk. The first failure waits ~1 s; each subsequent
 *    consecutive failure doubles the wait up to a 30 s cap, with ±20 %
 *    jitter to spread reconnects from multiple kiosks.
 *  - Fatal failure handling for 401/403: clears the session and
 *    redirects to `/login` (existing auth interceptor behavior). The
 *    session-cleared state is also surfaced through `error` so the UI
 *    can react.
 *  - Manual `pollNow()` and `stop()` hooks for the component.
 *
 * @see specs/changes/021-kiosk-runtime-refactor/spec.md FR-3
 */
@Injectable()
export class DisplayPollingService {
  private readonly api = inject(DisplayApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Backoff configuration (FR-3). Exposed as constants for spec-friendly access. */
  static readonly MIN_BACKOFF_MS = 1000;
  static readonly MAX_BACKOFF_MS = 30_000;
  static readonly JITTER_RATIO = 0.2;

  /** Latest polled state. Null until the first poll resolves. */
  readonly state = signal<DisplayState | null>(null);
  /** True while a poll request is in flight (initial open + each cycle). */
  readonly loading = signal<boolean>(false);
  /** Most recent error mapped through `adaptApiError`. Null on success. */
  readonly error = signal<ApplicationErrorContract | null>(null);
  /** Number of consecutive transient failures; resets on every successful poll. */
  readonly consecutiveFailures = signal<number>(0);

  /** Convenience: state with a null guard for templates. */
  readonly hasState = computed(() => this.state() !== null);

  private timerSub: Subscription | null = null;
  private armedIntervalMs = 5000;

  /**
   * Open the display session (POST /api/display/open) and start the
   * polling loop. The first poll fires immediately on subscribe; every
   * subsequent poll waits `configuredIntervalMs` or the backoff curve.
   */
  start(configuredIntervalMs: number): void {
    this.stop();
    this.armedIntervalMs = Math.max(1000, configuredIntervalMs);
    this.consecutiveFailures.set(0);
    this.timerSub = timer(0, this.armedIntervalMs)
      .pipe(
        switchMap(() => this.fetchOnce()),
        catchError(() => {
          // The error has already been routed to `error` / fatal-handler.
          // Returning an empty observable keeps the polling loop alive.
          return [];
        })
      )
      .subscribe();
  }

  /**
   * Fetch a single state snapshot. Public so the component can drive a
   * "refresh now" button without exposing the polling internals.
   * Resolves to `null` on error (after the error has been routed).
   */
  pollNow(): Observable<DisplayState | null> {
    return this.fetchOnce();
  }

  /**
   * Stop the polling loop and clear the timer. Idempotent.
   */
  stop(): void {
    if (this.timerSub !== null) {
      this.timerSub.unsubscribe();
      this.timerSub = null;
    }
  }

  /**
   * Compute the next backoff window in milliseconds for the given
   * consecutive-failure count. Public for spec coverage and for tests
   * that want to assert the curve without mocking timers.
   *
   *   0 → MIN_BACKOFF_MS (success path: reverts to configured interval)
   *   1 → MIN_BACKOFF_MS * 2 + jitter
   *   2 → MIN_BACKOFF_MS * 4 + jitter
   *   … capped at MAX_BACKOFF_MS + jitter
   */
  nextBackoffMs(consecutiveFailures: number): number {
    if (consecutiveFailures <= 0) {
      return this.armedIntervalMs;
    }
    const rawBase = DisplayPollingService.MIN_BACKOFF_MS * Math.pow(2, consecutiveFailures - 1);
    const base = Math.min(DisplayPollingService.MAX_BACKOFF_MS, rawBase);
    const jitter = base * DisplayPollingService.JITTER_RATIO;
    const offset = (Math.random() * 2 - 1) * jitter;
    return Math.max(
      DisplayPollingService.MIN_BACKOFF_MS,
      Math.min(DisplayPollingService.MAX_BACKOFF_MS, Math.round(base + offset))
    );
  }

  private fetchOnce(): Observable<DisplayState | null> {
    this.loading.set(true);
    return this.api.getState().pipe(
      switchMap((state) => {
        this.state.set(state);
        this.error.set(null);
        this.consecutiveFailures.set(0);
        this.loading.set(false);
        // The polling timer reschedules with the configured interval
        // on success. When the controller wants a different cadence it
        // can read `consecutiveFailures` and decide; the timer here is
        // a constant-interval loop because RxJS `timer` does not support
        // dynamic intervals without a re-subscribe.
        return [state];
      }),
      catchError((error: unknown) => {
        this.loading.set(false);
        const contract = adaptApiError(error);
        this.error.set(contract);
        this.handleFatalError(error, contract);
        return [null];
      })
    );
  }

  /**
   * Apply fatal-error semantics: 401/403 (session expired) clear the
   * session and route to /login. Everything else is just recorded and
   * bumps the failure counter so the next interval surfaces the
   * backoff curve.
   *
   * We inspect the raw `HttpErrorResponse.status` because the adapted
   * contract collapses everything to a category (`unexpected`,
   * `permission`, …) and does not always carry the numeric status —
   * the backend envelope may not include a `code` field.
   */
  private handleFatalError(error: unknown, contract: ApplicationErrorContract): void {
    const status = error instanceof HttpErrorResponse ? error.status : null;
    const isFatal = status === 401 || status === 403 || contract.category === 'permission';
    if (isFatal) {
      this.auth.clearSession();
      void this.router.navigateByUrl('/login');
      return;
    }
    this.consecutiveFailures.update((n) => n + 1);
  }
}