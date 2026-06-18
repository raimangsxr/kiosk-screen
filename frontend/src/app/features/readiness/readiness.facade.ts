import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { ReadinessApiService, ReadinessReport } from '../../readiness/readiness-api.service';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ReadinessFacade {
  private readonly api = inject(ReadinessApiService);
  private readonly reportState = signal<ReadinessReport | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly report = this.reportState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly ready = computed(() => this.reportState()?.ready === true);
  readonly blocked = computed(() => this.reportState()?.ready === false);
  readonly blockers = computed(() => this.reportState()?.blockers ?? []);
  readonly warnings = computed(() => this.reportState()?.warnings ?? []);

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.getReadiness().pipe(
      tap((report) => {
        this.reportState.set(report);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  clearError(): void {
    this.errorState.set(null);
  }
}
