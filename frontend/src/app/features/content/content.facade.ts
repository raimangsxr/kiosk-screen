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
    const request = id ? this.api.replaceUpload(id, payload, file) : this.api.upload(payload, file);
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
   *
   * Optimistic: the items are removed from the local `itemsState`
   * immediately so the list shrinks without waiting for the round
   * trip. On error the removed items are restored so the UI matches
   * the backend again.
   */
  removeMany(ids: readonly string[]) {
    if (ids.length === 0) {
      return of(null);
    }
    this.savingState.set(true);
    this.errorState.set(null);
    // Optimistic local remove: drop the ids from the visible list right
    // away. The backend confirms via `refresh()` on success; on error we
    // restore the snapshot captured here.
    const previousItems = this.itemsState();
    const idSet = new Set(ids);
    this.itemsState.set(previousItems.filter((item) => !idSet.has(item.id)));
    return from(ids).pipe(
      concatMap((id) => this.api.delete(id)),
      toArray(),
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.itemsState.set(previousItems);
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return of(null);
      })
    );
  }

  /**
   * Bulk activate/deactivate a batch of content items. Sends an `update`
   * per item with the full payload so the backend can validate the whole
   * record (not just the flag). Items are processed sequentially to
   * avoid stampeding the backend with concurrent PATCH calls.
   *
   * Optimistic: each item's `isActive` flag flips locally before the
   * network call. On error we restore the previous flag value.
   */
  setActiveMany(items: readonly ContentItem[], isActive: boolean) {
    if (items.length === 0) {
      return of(null);
    }
    this.savingState.set(true);
    this.errorState.set(null);
    const previousMap = new Map(items.map((item) => [item.id, item.isActive]));
    // Optimistic local flip.
    this.itemsState.set(
      this.itemsState().map((item) =>
        previousMap.has(item.id) ? { ...item, isActive } : item
      )
    );
    return from(items).pipe(
      concatMap((item) =>
        this.api.update(item.id, this.toUpdatePayload(item, { isActive }))
      ),
      toArray(),
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        // Restore previous isActive values for the items we tried to flip.
        this.itemsState.set(
          this.itemsState().map((item) => {
            const prev = previousMap.get(item.id);
            return prev !== undefined ? { ...item, isActive: prev } : item;
          })
        );
        this.errorState.set(adaptApiError(error));
        this.savingState.set(false);
        return of(null);
      })
    );
  }

  /**
   * Reorder the polled queue to `orderedIds`. Optimistic: the items are
   * rearranged locally before the round trip; the backend's response is
   * only used as a final sanity check on error.
   */
  reorder(orderedIds: string[]) {
    this.savingState.set(true);
    this.errorState.set(null);
    const previousItems = this.itemsState();
    const byId = new Map(previousItems.map((item) => [item.id, item]));
    // Optimistic: rebuild itemsState in the new order, keeping the
    // existing displayOrder values where possible. We re-assign
    // displayOrder 1..N so the table reflects the new arrangement.
    const optimistic = orderedIds
      .map((id, idx) => {
        const item = byId.get(id);
        return item ? { ...item, displayOrder: idx + 1 } : null;
      })
      .filter((item): item is ContentItem => item !== null);
    // Items not included in orderedIds are appended after the moved ones,
    // preserving their original relative order.
    const movedIds = new Set(orderedIds);
    const tail = previousItems
      .filter((item) => !movedIds.has(item.id))
      .map((item, idx) => ({ ...item, displayOrder: optimistic.length + idx + 1 }));
    this.itemsState.set([...optimistic, ...tail]);

    return this.api.reorderContent(orderedIds).pipe(
      tap(() => {
        this.savingState.set(false);
        this.refresh().subscribe();
      }),
      catchError((error: unknown) => {
        this.itemsState.set(previousItems);
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

  /**
   * Builds a `ContentItemRequest` from an existing item with a small set
   * of overrides. Keeps the bulk-update path resilient to backend
   * validation: we never strip fields the backend might require just
   * because the UI doesn't display them.
   */
  private toUpdatePayload(item: ContentItem, overrides: Partial<ContentItemRequest>): ContentItemRequest {
    return {
      title: item.title,
      contentType: item.contentType,
      sourceReference: item.sourceReference,
      mediaFile: item.mediaFile ?? null,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      durationSeconds: item.durationSeconds ?? null,
      rotationAnimation: item.rotationAnimation ?? null,
      animationDurationMilliseconds: item.animationDurationMilliseconds ?? null,
      isFixed: item.isFixed ?? false,
      recurringEveryXIterations: item.recurringEveryXIterations ?? null,
      ...overrides
    };
  }
}
