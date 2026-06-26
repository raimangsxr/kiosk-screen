import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, concatMap, from, of, tap, throwError, toArray } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdItem, AdPayload, AdsApiService } from '../../core/api/ads.api';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class AdsFacade {
  private readonly api = inject(AdsApiService);
  private readonly adsState = signal<readonly AdItem[]>([]);
  private readonly currentState = signal<AdItem | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly ads = this.adsState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.adsState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.adsState().length > 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listAds().pipe(
      tap((ads) => {
        this.adsState.set(ads);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  loadAd(id: string) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.getAd(id).pipe(
      tap((ad) => {
        this.currentState.set(ad);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  save(payload: AdPayload, id?: string, file?: File | null) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = file
      ? id
        ? this.api.updateAd(id, payload)
        : this.api.uploadAd(payload, file)
      : id
        ? this.api.updateAd(id, payload)
        : this.api.createAd(payload);
    return request.pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return throwError(() => error);
      })
    );
  }

  uploadMany(payload: AdPayload, files: readonly File[]) {
    this.savingState.set(true);
    this.errorState.set(null);
    return from(files).pipe(
      concatMap((file) => this.api.uploadAd(payload, file)),
      toArray(),
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return throwError(() => error);
      })
    );
  }

  remove(id: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.deleteAd(id).pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return of(null);
      })
    );
  }

  /**
   * Delete a batch of ads sequentially (via concatMap, same pattern
   * as `uploadMany`). On the first error the remaining ids are
   * skipped and the error is surfaced through the `error` signal.
   *
   * Optimistic: ads disappear from the local list immediately. On
   * error the removed rows are restored so the UI matches the backend.
   */
  removeMany(ids: readonly string[]) {
    if (ids.length === 0) {
      return of(null);
    }
    this.savingState.set(true);
    this.errorState.set(null);
    const previousAds = this.adsState();
    const idSet = new Set(ids);
    this.adsState.set(previousAds.filter((ad) => !idSet.has(ad.id)));
    return from(ids).pipe(
      concatMap((id) => this.api.deleteAd(id)),
      toArray(),
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.adsState.set(previousAds);
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return of(null);
      })
    );
  }

  /**
   * Reorder the polled list. Optimistic: the list is rearranged
   * locally before the round trip. On error the previous order is
   * restored and a refresh is fired to settle.
   */
  reorder(orderedIds: string[]) {
    this.savingState.set(true);
    this.errorState.set(null);
    const previousAds = this.adsState();
    const byId = new Map(previousAds.map((ad) => [ad.id, ad]));
    const optimistic = orderedIds
      .map((id, idx) => {
        const ad = byId.get(id);
        return ad ? { ...ad, displayOrder: idx + 1 } : null;
      })
      .filter((ad): ad is AdItem => ad !== null);
    const movedIds = new Set(orderedIds);
    const tail = previousAds
      .filter((ad) => !movedIds.has(ad.id))
      .map((ad, idx) => ({ ...ad, displayOrder: optimistic.length + idx + 1 }));
    this.adsState.set([...optimistic, ...tail]);

    return this.api.reorderAds(orderedIds).pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.adsState.set(previousAds);
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        this.refresh().subscribe();
        return throwError(() => error);
      })
    );
  }

  clearError(): void {
    this.errorState.set(null);
  }

  clearCurrent(): void {
    this.currentState.set(null);
  }
}
