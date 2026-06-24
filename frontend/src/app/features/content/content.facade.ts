import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, concatMap, from, of, tap, throwError, toArray } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { ContentApiService, ContentItem, ContentItemRequest } from '../../core/api/content.api';
import { RemoteControlFacade } from '../remote-control/remote-control.facade';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ContentFacade {
  private readonly api = inject(ContentApiService);
  private readonly remoteControl = inject(RemoteControlFacade);
  private readonly itemsState = signal<readonly ContentItem[]>([]);
  private readonly currentState = signal<ContentItem | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.itemsState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.itemsState().length > 0 && !this.errorState());

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
      })
    );
  }

  save(payload: ContentItemRequest, id?: string) {
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
      })
    );
  }

  upload(payload: ContentItemRequest, file: File, id?: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = id ? this.api.update(id, payload) : this.api.upload(payload, file);
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

  uploadMany(payloadForFile: (file: File) => ContentItemRequest, files: readonly File[]) {
    this.savingState.set(true);
    this.errorState.set(null);
    return from(files).pipe(
      concatMap((file) => this.api.upload(payloadForFile(file), file)),
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
    return this.api.delete(id).pipe(
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
   * Delete a batch of content items sequentially (via concatMap, same
   * pattern as `uploadMany`). On the first error the remaining items
   * are skipped and the error is surfaced through the `error` signal;
   * already-completed deletes are not rolled back.
   */
  removeMany(ids: readonly string[]) {
    if (ids.length === 0) {
      return of(null);
    }
    this.savingState.set(true);
    this.errorState.set(null);
    return from(ids).pipe(
      concatMap((id) => this.api.delete(id)),
      toArray(),
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

  reorder(orderedIds: string[]) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.reorderContent(orderedIds).pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
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

  /**
   * Spec 014 addendum 2 (FR-020) / spec 009 addendum: posts a
   * `jump_to` navigation command to the remote-control backend so the
   * kiosk rotation cursor lands on this content id on the next poll.
   */
  showOnScreen(id: string) {
    return this.remoteControl.navigate('jump_to', id);
  }
}
