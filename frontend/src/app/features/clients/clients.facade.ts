import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdsApiService, Client } from '../../core/api/ads.api';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ClientsFacade {
  private readonly api = inject(AdsApiService);
  private readonly clientsState = signal<readonly Client[]>([]);
  private readonly currentState = signal<Client | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly clients = this.clientsState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.clientsState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.clientsState().length > 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listClients().pipe(
      tap((clients) => {
        this.clientsState.set(clients);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  loadClient(id: string) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listClients().pipe(
      tap((clients) => {
        const found = clients.find((c) => c.id === id) ?? null;
        this.currentState.set(found);
        this.loadingState.set(false);
        if (!found) {
          this.errorState.set({
            code: 'not_found_client',
            message: 'Client could not be found.',
            category: 'not-found'
          });
        }
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  save(payload: Omit<Client, 'id'>, id?: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = id ? this.api.updateClient(id, payload) : this.api.createClient(payload);
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

  toggleActive(client: Client) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.updateClient(client.id, { name: client.name, isActive: !client.isActive }).pipe(
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
    return this.api.deleteClient(id).pipe(
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
