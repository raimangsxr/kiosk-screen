import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdItem, AdsApiService, Client } from '../../ads/ads-api.service';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class AdsFacade {
  private readonly api = inject(AdsApiService);
  private readonly adsState = signal<readonly AdItem[]>([]);
  private readonly clientsState = signal<readonly Client[]>([]);
  private readonly currentState = signal<AdItem | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly ads = this.adsState.asReadonly();
  readonly clients = this.clientsState.asReadonly();
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

  loadClients() {
    return this.api.listClients().pipe(
      tap((clients) => this.clientsState.set(clients)),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
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

  save(payload: Omit<AdItem, 'id'>, id?: string, file?: File | null) {
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

  clearError(): void {
    this.errorState.set(null);
  }

  clearCurrent(): void {
    this.currentState.set(null);
  }
}
