import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdminApiService, KioskConfiguration } from '../../core/api/admin.api';
import { DisplayControlSyncService } from '../../core/display-control-sync.service';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class DisplayConfigFacade {
  private readonly api = inject(AdminApiService);
  private readonly displaySync = inject(DisplayControlSyncService);
  private readonly configState = signal<KioskConfiguration | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly configuration = this.configState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly ready = computed(() => !this.loadingState() && this.configState() !== null);

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.getConfiguration().pipe(
      tap((config) => {
        this.configState.set(config);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  save(payload: Omit<KioskConfiguration, 'id'>) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.updateConfiguration(payload).pipe(
      tap((config) => {
        this.savingState.set(false);
        this.configState.set(config);
        this.displaySync.notifyDisplayStateChanged();
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return throwError(() => error);
      })
    );
  }

  clearError(): void {
    this.errorState.set(null);
  }
}
