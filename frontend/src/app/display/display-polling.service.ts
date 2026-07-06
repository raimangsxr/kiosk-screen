import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { AuthService } from '../core/auth/auth.service';
import { ApplicationErrorContract } from '../shared/contracts/admin-contracts';
import { adaptApiError } from '../core/errors/api-error-adapter';
import {
  DisplayApiService,
  DisplayState,
  equalByDisplayFingerprint,
} from '../core/api/display.api';
import { Router } from '@angular/router';

/**
 * Owns the kiosk polling lifecycle. Wraps {@link DisplayApiService} with:
 *
 *  - A `state` signal updated only when the display fingerprint changes.
 *  - Exponential backoff on transient failures (5xx, network) from ~1 s to
 *    a 30 s cap with ±20 % jitter.
 *  - Fatal failure handling for 401/403.
 *  - Recoverable open-display failures with operator retry.
 *
 * @see specs/changes/030-kiosk-polling-resilience/spec.md
 */
@Injectable()
export class DisplayPollingService {
  private readonly api = inject(DisplayApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  static readonly MIN_BACKOFF_MS = 1000;
  static readonly MAX_BACKOFF_MS = 30_000;
  static readonly JITTER_RATIO = 0.2;

  readonly state = signal<DisplayState | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<ApplicationErrorContract | null>(null);
  readonly openError = signal<ApplicationErrorContract | null>(null);
  readonly openInProgress = signal<boolean>(false);
  readonly consecutiveFailures = signal<number>(0);
  readonly reconnecting = computed(() => this.consecutiveFailures() > 0);
  readonly hasState = computed(() => this.state() !== null);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private openRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlightSub: Subscription | null = null;
  private armedIntervalMs = 5000;
  private openConsecutiveFailures = 0;
  private lastFingerprintState: DisplayState | null = null;
  private running = false;
  private openCallback: ((state: DisplayState | null) => void) | null = null;

  open(onResult?: (state: DisplayState | null) => void): void {
    this.openCallback = onResult ?? null;
    this.clearOpenRetryTimer();
    this.performOpen(0);
  }

  retryOpen(): void {
    this.clearOpenRetryTimer();
    const delay =
      this.openConsecutiveFailures > 0
        ? this.nextBackoffMs(this.openConsecutiveFailures)
        : 0;
    this.performOpen(delay);
  }

  start(configuredIntervalMs: number): void {
    this.stopPollingLoop();
    this.running = true;
    this.armedIntervalMs = Math.max(1000, configuredIntervalMs);
    this.consecutiveFailures.set(0);
    this.schedulePoll(this.armedIntervalMs);
  }

  pollNow(): Observable<DisplayState | null> {
    if (!this.running) {
      return of(null);
    }
    this.clearPollTimer();
    return this.fetchState({ reschedule: true });
  }

  reconfigureInterval(configuredIntervalMs: number): void {
    const next = Math.max(1000, configuredIntervalMs);
    if (next === this.armedIntervalMs) {
      return;
    }
    this.armedIntervalMs = next;
    if (!this.running) {
      return;
    }
    this.clearPollTimer();
    this.schedulePoll(this.armedIntervalMs);
  }

  stop(): void {
    this.running = false;
    this.stopPollingLoop();
    this.clearOpenRetryTimer();
    this.inFlightSub?.unsubscribe();
    this.inFlightSub = null;
    this.openCallback = null;
  }

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
      Math.min(DisplayPollingService.MAX_BACKOFF_MS, Math.round(base + offset)),
    );
  }

  private performOpen(delayMs: number): void {
    this.clearOpenRetryTimer();
    if (delayMs <= 0) {
      this.executeOpen();
      return;
    }
    this.openRetryTimer = setTimeout(() => this.executeOpen(), delayMs);
  }

  private executeOpen(): void {
    this.openInProgress.set(true);
    this.openError.set(null);
    this.inFlightSub?.unsubscribe();
    this.inFlightSub = this.api.openDisplay().subscribe({
      next: (state) => {
        this.openInProgress.set(false);
        this.openConsecutiveFailures = 0;
        this.lastFingerprintState = state;
        this.openCallback?.(state);
      },
      error: (error: unknown) => {
        this.openInProgress.set(false);
        const contract = adaptApiError(error);
        this.openError.set(contract);
        if (this.isFatalError(error, contract)) {
          this.handleFatalError();
          this.openCallback?.(null);
          return;
        }
        this.openConsecutiveFailures += 1;
        this.openCallback?.(null);
      },
    });
  }

  private schedulePoll(delayMs: number): void {
    this.clearPollTimer();
    if (!this.running) {
      return;
    }
    this.pollTimer = setTimeout(() => {
      this.pollTimer = null;
      if (!this.running) {
        return;
      }
      this.inFlightSub?.unsubscribe();
      this.inFlightSub = this.fetchState({ reschedule: true }).subscribe();
    }, delayMs);
  }

  private fetchState(options: { reschedule: boolean }): Observable<DisplayState | null> {
    this.loading.set(true);
    return this.api.getState().pipe(
      tap((state) => {
        this.publishStateIfChanged(state, false);
        this.error.set(null);
        this.consecutiveFailures.set(0);
      }),
      catchError((error: unknown) => {
        const contract = adaptApiError(error);
        this.error.set(contract);
        if (this.isFatalError(error, contract)) {
          this.handleFatalError();
          return of(null);
        }
        this.consecutiveFailures.update((n) => n + 1);
        return of(null);
      }),
      finalize(() => {
        this.loading.set(false);
        if (!options.reschedule || !this.running) {
          return;
        }
        const delay =
          this.consecutiveFailures() > 0
            ? this.nextBackoffMs(this.consecutiveFailures())
            : this.armedIntervalMs;
        this.schedulePoll(delay);
      }),
    );
  }

  private publishStateIfChanged(state: DisplayState, force: boolean): void {
    if (force || !equalByDisplayFingerprint(this.lastFingerprintState, state)) {
      this.lastFingerprintState = state;
      this.state.set(state);
    }
  }

  private isFatalError(error: unknown, contract: ApplicationErrorContract): boolean {
    const status = error instanceof HttpErrorResponse ? error.status : null;
    return status === 401 || status === 403 || contract.category === 'permission';
  }

  private handleFatalError(): void {
    this.stop();
    this.auth.clearSession();
    void this.router.navigateByUrl('/login');
  }

  private stopPollingLoop(): void {
    this.clearPollTimer();
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private clearOpenRetryTimer(): void {
    if (this.openRetryTimer !== null) {
      clearTimeout(this.openRetryTimer);
      this.openRetryTimer = null;
    }
  }
}
