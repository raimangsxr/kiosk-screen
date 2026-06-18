import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdItem, AdsApiService } from '../../ads/ads-api.service';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class AdsFacade {
  private readonly api = inject(AdsApiService);
  private readonly adsState = signal<readonly AdItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly ads = this.adsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.adsState().length === 0 && !this.errorState());

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
}
