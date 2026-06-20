import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { EventConfiguration, EventConfigurationApiService } from '../../core/api/event-config.api';

interface EventConfigFormValue {
  eventName: string;
  organizerName: string;
  eventDurationMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class EventConfigFacade {
  private readonly api = inject(EventConfigurationApiService);

  readonly configuration = signal<EventConfiguration | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<{ code: string; message: string; category: string } | null>(null);
  readonly selectedLogoPreviewUrl = signal<string | null>(null);

  refresh(): Observable<EventConfiguration> {
    this.loading.set(true);
    this.error.set(null);
    return this.api.get().pipe(
      tap((configuration) => {
        this.configuration.set(configuration);
        this.loading.set(false);
      }),
      catchError((error) => {
        this.loading.set(false);
        this.error.set(this.toError(error, 'Could not load event configuration.'));
        return throwError(() => error);
      }),
    );
  }

  save(formValue: EventConfigFormValue, file: File | null, removeLogo: boolean): Observable<EventConfiguration> {
    this.saving.set(true);
    this.error.set(null);
    const formData = new FormData();
    formData.set('eventName', formValue.eventName.trim());
    formData.set('organizerName', formValue.organizerName.trim());
    formData.set('eventDurationMinutes', String(formValue.eventDurationMinutes));
    if (file) {
      formData.set('file', file);
    }
    if (removeLogo) {
      formData.set('removeLogo', 'true');
    }
    return this.api.update(formData).pipe(
      tap((configuration) => {
        this.configuration.set(configuration);
        this.saving.set(false);
      }),
      catchError((error) => {
        this.saving.set(false);
        this.error.set(this.toError(error, 'Could not save event configuration.'));
        return throwError(() => error);
      }),
    );
  }

  private toError(error: unknown, fallback: string): { code: string; message: string; category: string } {
    const httpError = error as { error?: { detail?: string; message?: string }; message?: string; status?: number };
    return {
      code: String(httpError.status ?? 'event_config_error'),
      message: httpError.error?.detail ?? httpError.error?.message ?? httpError.message ?? fallback,
      category: 'event-config'
    };
  }
}
