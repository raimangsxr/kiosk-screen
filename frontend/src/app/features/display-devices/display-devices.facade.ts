import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  forkJoin,
  from,
  interval,
  map,
  startWith,
  switchMap,
  tap,
  throwError,
  type Observable,
} from 'rxjs';

import { DisplayDevice, DisplayDeviceApiService } from '../../core/api/display-device.api';
import { LiveKiosksApiService } from '../../core/api/live-kiosks.api';
import { adaptApiError } from '../../core/errors/api-error-adapter';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

export interface DisplayDeviceRow extends DisplayDevice {
  readonly connected: boolean;
}

@Injectable({ providedIn: 'root' })
export class DisplayDevicesFacade {
  private readonly displayDevicesApi = inject(DisplayDeviceApiService);
  private readonly liveKiosksApi = inject(LiveKiosksApiService);

  private readonly devicesState = signal<readonly DisplayDeviceRow[]>([]);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly devices = this.devicesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly mutating = this.mutatingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.devicesState().length === 0 && !this.errorState());

  refresh(options?: { silent?: boolean }): Observable<readonly DisplayDeviceRow[]> {
    if (!options?.silent) {
      this.loadingState.set(true);
    }
    this.errorState.set(null);
    return forkJoin({
      devices: this.displayDevicesApi.list(),
      live: from(this.liveKiosksApi.listLive()),
    }).pipe(
      tap(({ devices, live }) => {
        this.devicesState.set(this.mapRows(devices, live));
        this.loadingState.set(false);
      }),
      map(() => this.devicesState()),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  startPolling(destroyRef: DestroyRef, intervalMs = 30_000): void {
    let initial = true;
    interval(intervalMs)
      .pipe(
        startWith(0),
        switchMap(() => this.refresh({ silent: !initial })),
        tap(() => {
          initial = false;
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();
  }

  create(label: string): Observable<DisplayDevice> {
    this.mutatingState.set(true);
    this.errorState.set(null);
    return this.displayDevicesApi.create({ label: label.trim() }).pipe(
      tap(() => {
        this.mutatingState.set(false);
        this.refresh({ silent: true }).subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.mutatingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  rename(id: string, label: string): Observable<DisplayDevice> {
    this.mutatingState.set(true);
    this.errorState.set(null);
    return this.displayDevicesApi.rename(id, { label: label.trim() }).pipe(
      tap(() => {
        this.mutatingState.set(false);
        this.refresh({ silent: true }).subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.mutatingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  delete(id: string): Observable<void> {
    this.mutatingState.set(true);
    this.errorState.set(null);
    return this.displayDevicesApi.delete(id).pipe(
      tap(() => {
        this.mutatingState.set(false);
        this.refresh({ silent: true }).subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.mutatingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  private mapRows(devices: readonly DisplayDevice[], live: readonly { displayLabel: string | null }[]): DisplayDeviceRow[] {
    const connectedLabels = new Set(
      live
        .map((kiosk) => kiosk.displayLabel?.trim())
        .filter((label): label is string => !!label),
    );
    return [...devices]
      .map((device) => ({
        ...device,
        connected: connectedLabels.has(device.label),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }
}
