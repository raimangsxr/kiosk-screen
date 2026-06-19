import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdminApiService, UserRecord, UserRequest } from '../../core/api/admin.api';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

export const AVAILABLE_ROLES = [
  'administrator',
  'content_manager',
  'advertising_manager',
  'event_operator',
  'display_viewer'
] as const;

export type AvailableRole = (typeof AVAILABLE_ROLES)[number];

@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly api = inject(AdminApiService);
  private readonly usersState = signal<readonly UserRecord[]>([]);
  private readonly currentState = signal<UserRecord | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly users = this.usersState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.usersState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.usersState().length > 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listUsers().pipe(
      tap((users) => {
        this.usersState.set(users);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  loadUser(id: string) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listUsers().pipe(
      tap((users) => {
        const found = users.find((u) => u.id === id) ?? null;
        this.currentState.set(found);
        this.loadingState.set(false);
        if (!found) {
          this.errorState.set({
            code: 'not_found_user',
            message: 'User could not be found.',
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

  save(payload: UserRequest, id?: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = id ? this.api.updateUser(id, payload) : this.api.createUser(payload);
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

  toggleActive(user: UserRecord) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api.updateUser(user.id, {
      email: user.email,
      displayName: user.displayName,
      isActive: !user.isActive,
      roles: user.roles
    }).pipe(
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

  clearError(): void {
    this.errorState.set(null);
  }

  clearCurrent(): void {
    this.currentState.set(null);
  }
}
