import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { ContentApiService, ContentItem, ContentItemRequest } from '../../content/content-api.service';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ContentFacade {
  private readonly api = inject(ContentApiService);
  private readonly itemsState = signal<readonly ContentItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.itemsState().length === 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.list().pipe(
      tap((items) => {
        this.itemsState.set(items);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  save(payload: ContentItemRequest, id?: string) {
    const request = id ? this.api.update(id, payload) : this.api.create(payload);
    return request.pipe(
      tap(() => this.refresh().subscribe()),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        return throwError(() => error);
      })
    );
  }
}
