import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { ApiKeysApiService } from '../../core/api/api-keys.api';
import { adaptApiError } from '../../core/errors/api-error-adapter';
import {
  ApiKeyRecord,
  ApiKeyWithRawSecret,
  ApplicationErrorContract,
} from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ApiKeysFacade {
  private readonly api = inject(ApiKeysApiService);

  private readonly keysState = signal<readonly ApiKeyRecord[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly keys = this.keysState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.keysState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.keysState().length > 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.list().pipe(
      tap((keys) => {
        this.keysState.set(keys);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  create(label: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.create({ label }).pipe(
      tap((result: ApiKeyWithRawSecret) => {
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

  rotate(id: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.rotate(id).pipe(
      tap((result: ApiKeyWithRawSecret) => {
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

  revoke(id: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.revoke(id).pipe(
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

  clearError(): void {
    this.errorState.set(null);
  }
}
