import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface EventBranding {
  eventName: string;
  organizerName: string;
  organizerLogoUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class EventBrandingApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<EventBranding> {
    return this.http.get<EventBranding>('/api/event-branding');
  }
}
