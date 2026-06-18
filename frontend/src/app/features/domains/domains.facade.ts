import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of, tap, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { AdminApiService, ApprovedDomain } from '../../core/api/admin.api';
import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class DomainsFacade {
  private readonly api = inject(AdminApiService);
  private readonly domainsState = signal<readonly ApprovedDomain[]>([]);
  private readonly currentState = signal<ApprovedDomain | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<ApplicationErrorContract | null>(null);

  readonly domains = this.domainsState.asReadonly();
  readonly current = this.currentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly empty = computed(() => !this.loadingState() && this.domainsState().length === 0 && !this.errorState());
  readonly ready = computed(() => !this.loadingState() && this.domainsState().length > 0 && !this.errorState());

  refresh() {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listDomains().pipe(
      tap((domains) => {
        this.domainsState.set(domains);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set(adaptApiError(error));
        this.loadingState.set(false);
        return throwError(() => error);
      })
    );
  }

  loadDomain(id: string) {
    this.loadingState.set(true);
    this.errorState.set(null);
    return this.api.listDomains().pipe(
      tap((domains) => {
        const found = domains.find((d) => d.id === id) ?? null;
        this.currentState.set(found);
        this.loadingState.set(false);
        if (!found) {
          this.errorState.set({
            code: 'not_found_domain',
            message: 'Approved domain could not be found.',
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

  save(payload: Omit<ApprovedDomain, 'id'>, id?: string) {
    this.savingState.set(true);
    this.errorState.set(null);
    const request = id ? this.api.updateDomain(id, payload) : this.api.createDomain(payload);
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

  toggleActive(domain: ApprovedDomain) {
    this.savingState.set(true);
    this.errorState.set(null);
    return this.api
      .updateDomain(domain.id, { domain: domain.domain, isActive: !domain.isActive })
      .pipe(
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
    return this.api.deleteDomain(id).pipe(
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
