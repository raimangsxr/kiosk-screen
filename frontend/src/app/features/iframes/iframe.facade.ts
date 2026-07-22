import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, switchMap, tap, throwError } from 'rxjs';

import { DisplayDeviceApiService } from '../../core/api/display-device.api';
import {
  DisplayScaleEntry,
  DisplayScaleOverrideInput,
  IframeApiService,
  IframeItem,
  IframeRequest,
} from '../../core/api/iframe.api';
import { adaptApiError } from '../../core/errors/api-error-adapter';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class IframeFacade {
  private readonly api = inject(IframeApiService);
  private readonly displayDevicesApi = inject(DisplayDeviceApiService);
  private readonly iframesState = signal<readonly IframeItem[]>([]);
  private readonly currentState = signal<IframeItem | null>(null);
  private readonly displayScalesState = signal<readonly DisplayScaleEntry[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly scalesSavingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly iframes = this.iframesState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly displayScales = this.displayScalesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly scalesSaving = this.scalesSavingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.iframesState().length === 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.list().pipe(
      tap((response) => {
        this.iframesState.set(response.items);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  load(id: string) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.get(id).pipe(
      tap((item) => {
        this.currentState.set(item);
        this.displayScalesState.set(item.displayScales ?? []);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  save(payload: IframeRequest, id?: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = id ? this.api.update(id, payload) : this.api.create(payload);
    return request.pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  saveDisplayScales(iframeId: string, items: DisplayScaleOverrideInput[]) {
    this.scalesSavingState.set(true);
    this.errorState.set(null);
    return this.api.putDisplayScales(iframeId, { items }).pipe(
      tap((response) => {
        this.displayScalesState.set(response.displayScales);
        this.currentState.set(response);
        this.scalesSavingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.scalesSavingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  precreateDisplayDevice(label: string) {
    this.errorState.set(null);
    const iframeId = this.currentState()?.id;
    return this.displayDevicesApi.create({ label }).pipe(
      switchMap(() => (iframeId ? this.load(iframeId) : this.refresh())),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        return throwError(() => error);
      }),
    );
  }

  delete(id: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.delete(id).pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  deleteDisplayDevice(deviceId: string) {
    const iframeId = this.currentState()?.id;
    this.errorState.set(null);
    return this.displayDevicesApi.delete(deviceId).pipe(
      switchMap(() => (iframeId ? this.load(iframeId) : this.refresh())),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        return throwError(() => error);
      }),
    );
  }

  clearCurrent(): void {
    this.currentState.set(null);
    this.displayScalesState.set([]);
  }
}
