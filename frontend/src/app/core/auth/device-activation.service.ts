import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, of, throwError, timer } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';

import type { AuthenticatedUser } from './auth.service';
import { adaptApiError } from '../errors/api-error-adapter';

export interface DeviceActivationStartResult {
  readonly userCode: string;
  readonly deviceCode: string;
  readonly expiresAt: string;
  readonly pollIntervalSeconds: number;
  readonly activateUrl: string;
}

interface DeviceActivationStartResponse {
  readonly userCode: string;
  readonly deviceCode: string;
  readonly expiresAt: string;
  readonly pollIntervalSeconds: number;
  readonly activateUrl: string;
}

interface DeviceActivationPollResponse {
  readonly status: 'pending' | 'authorized';
  readonly user?: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly roles: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class DeviceActivationService {
  private readonly http = inject(HttpClient);

  start(): Observable<DeviceActivationStartResult> {
    return this.http.post<DeviceActivationStartResponse>('/api/auth/device-activation/start', {}).pipe(
      map((response) => ({
        userCode: response.userCode,
        deviceCode: response.deviceCode,
        expiresAt: response.expiresAt,
        pollIntervalSeconds: response.pollIntervalSeconds,
        activateUrl: response.activateUrl,
      })),
    );
  }

  authorize(userCode: string, rememberMe: boolean): Observable<void> {
    return this.http.post<void>(
      '/api/auth/device-activation/authorize',
      { userCode, rememberMe },
      { withCredentials: true },
    );
  }

  poll(deviceCode: string): Observable<DeviceActivationPollResponse> {
    return this.http.post<DeviceActivationPollResponse>(
      '/api/auth/device-activation/poll',
      { deviceCode },
      { withCredentials: true },
    );
  }

  pollUntilAuthorized(deviceCode: string, intervalSeconds: number): Observable<AuthenticatedUser> {
    const intervalMs = Math.max(intervalSeconds, 1) * 1000;
    return timer(0, intervalMs).pipe(
      switchMap(() =>
        this.poll(deviceCode).pipe(
          catchError((error) => {
            const adapted = adaptApiError(error);
            if (adapted.code === 'activation_expired' || adapted.code === 'activation_not_found') {
              return throwError(() => error);
            }
            return of({ status: 'pending' as const });
          }),
        ),
      ),
      filter((response): response is DeviceActivationPollResponse & { status: 'authorized' } => response.status === 'authorized'),
      take(1),
      map((response) => {
        const user = response.user;
        if (!user) {
          throw new Error('authorized_without_user');
        }
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles ?? [],
        };
      }),
    );
  }

  buildActivateUrl(userCode: string): string {
    const origin = globalThis.location?.origin ?? '';
    return `${origin}/activate?code=${encodeURIComponent(userCode)}`;
  }

  buildQrDataUrl(userCode: string): Observable<string> {
    return defer(async () => {
      const { toDataURL } = await import('qrcode');
      return toDataURL(this.buildActivateUrl(userCode), { margin: 1, width: 256 });
    });
  }

  isExpiredActivationError(error: unknown): boolean {
    const adapted = adaptApiError(error);
    return adapted.code === 'activation_expired' || adapted.code === 'activation_not_found';
  }

  normalizeUserCode(raw: string): string {
    return raw.trim().replace(/[\s-]/g, '').toUpperCase();
  }

  isValidUserCode(value: string): boolean {
    const normalized = this.normalizeUserCode(value);
    return /^[A-Z]{6}$/.test(normalized);
  }
}
