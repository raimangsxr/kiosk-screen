import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import { EventBranding, EventBrandingApiService } from './api/event-branding.api';

const EMPTY_BRANDING: EventBranding = {
  eventName: '',
  organizerName: '',
  organizerLogoUrl: null
};

@Injectable({ providedIn: 'root' })
export class EventBrandingService {
  private readonly api = inject(EventBrandingApiService);
  private readonly brandingSignal = signal<EventBranding>(EMPTY_BRANDING);

  readonly branding = this.brandingSignal.asReadonly();

  refresh(): Observable<EventBranding> {
    return this.api.get().pipe(
      tap((branding) => this.brandingSignal.set(branding)),
      catchError(() => of(this.brandingSignal())),
    );
  }

  clear(): void {
    this.brandingSignal.set(EMPTY_BRANDING);
  }
}
