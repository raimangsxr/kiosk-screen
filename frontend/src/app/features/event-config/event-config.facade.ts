import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { EventConfiguration, EventConfigurationApiService } from '../../core/api/event-config.api';
import { BrandingLayout } from '../../core/api/event-branding.api';
import { EventConfigSyncService } from '../../core/event-config-sync.service';

export interface EventConfigLayoutValue {
  logoSize: number | null;
  logoX: number | null;
  logoY: number | null;
  logoTransparency: number | null;
  logoBorderRadius: number | null;
  eventNameSize: number | null;
  eventNameX: number | null;
  eventNameY: number | null;
  eventNameTransparency: number | null;
  eventNameBorderRadius: number | null;
}

export interface EventConfigFormValue extends EventConfigLayoutValue {
  eventName: string;
  organizerName: string;
  eventDurationMinutes: number;
}

/**
 * Visual defaults that replicate the pre-CHG-023 overlay look.
 * Surfaced here so the form pre-populates stable starting values
 * when the API returns `null` for both layout columns and the
 * kiosko CSS `var(--*, default)` fallback uses the same numbers.
 *
 * See `specs/changes/023-event-branding-layout/spec.md` §"Defaults".
 */
export const VISUAL_DEFAULTS: Record<keyof EventConfigLayoutValue, number> = {
  logoSize: 6,
  logoX: 0,
  logoY: 0,
  logoTransparency: 0,
  logoBorderRadius: 0,
  eventNameSize: 1.6,
  eventNameX: 20,
  eventNameY: 0,
  eventNameTransparency: 0,
  eventNameBorderRadius: 6,
};

export type LayoutAutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class EventConfigFacade {
  private readonly api = inject(EventConfigurationApiService);
  private readonly sync = inject(EventConfigSyncService);

  readonly configuration = signal<EventConfiguration | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly layoutAutoSave = signal<LayoutAutoSaveStatus>('idle');
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
    const logoLayout = encodeLayout(formValue, 'logo');
    const eventNameLayout = encodeLayout(formValue, 'eventName');
    if (logoLayout !== undefined) {
      formData.set('logoLayout', logoLayout);
    }
    if (eventNameLayout !== undefined) {
      formData.set('eventNameLayout', eventNameLayout);
    }
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
        this.sync.notifyEventConfigChanged();
      }),
      catchError((error) => {
        this.saving.set(false);
        this.error.set(this.toError(error, 'Could not save event configuration.'));
        return throwError(() => error);
      }),
    );
  }

  /**
   * Layout-only auto-save used by the slider-driven CHG-024 path.
   * Receives the full form value and sends the non-layout fields
   * (eventName, organizerName, eventDurationMinutes) alongside the
   * layout JSON so the backend never blanks fields the operator did
   * not touch. Layout keys are only included when at least one field
   * is set, otherwise they are omitted and the column is preserved.
   * Emits the cross-tab notification on success and surfaces errors
   * via the `layoutAutoSave` status signal.
   */
  saveLayout(formValue: EventConfigFormValue): Observable<EventConfiguration> {
    this.layoutAutoSave.set('saving');
    this.error.set(null);
    const formData = new FormData();
    formData.set('eventName', formValue.eventName.trim());
    formData.set('organizerName', formValue.organizerName.trim());
    formData.set('eventDurationMinutes', String(formValue.eventDurationMinutes));
    const logoLayout = encodeLayout(formValue, 'logo');
    const eventNameLayout = encodeLayout(formValue, 'eventName');
    if (logoLayout !== undefined) {
      formData.set('logoLayout', logoLayout);
    }
    if (eventNameLayout !== undefined) {
      formData.set('eventNameLayout', eventNameLayout);
    }
    return this.api.update(formData).pipe(
      tap((configuration) => {
        this.configuration.set(configuration);
        this.layoutAutoSave.set('saved');
        this.sync.notifyEventConfigChanged();
      }),
      catchError((error) => {
        this.layoutAutoSave.set('error');
        this.error.set(this.toError(error, 'Could not save branding layout.'));
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

function encodeLayout(value: EventConfigLayoutValue, prefix: 'logo' | 'eventName'): string | undefined {
  const cap = (suffix: 'Size' | 'X' | 'Y' | 'Transparency' | 'BorderRadius'): number | null =>
    value[`${prefix}${suffix}` as keyof EventConfigLayoutValue];
  const payload: BrandingLayout = {};
  const size = cap('Size');
  const x = cap('X');
  const y = cap('Y');
  const transparency = cap('Transparency');
  const borderRadius = cap('BorderRadius');
  if (size !== null) payload.size = size;
  if (x !== null) payload.x = x;
  if (y !== null) payload.y = y;
  if (transparency !== null) payload.transparency = transparency;
  if (borderRadius !== null) payload.borderRadius = borderRadius;
  return Object.keys(payload).length === 0 ? undefined : JSON.stringify(payload);
}