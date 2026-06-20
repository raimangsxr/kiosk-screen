import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { IframeApiService, IframeItem, IframeRequest } from '../../core/api/iframe.api';
import { adaptApiError } from '../../core/errors/api-error-adapter';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class IframeFacade {
  private readonly api = inject(IframeApiService);
  private readonly iframesState = signal<readonly IframeItem[]>([]);
  private readonly currentState = signal<IframeItem | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly iframes = this.iframesState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
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

  clearCurrent(): void {
    this.currentState.set(null);
  }
}
