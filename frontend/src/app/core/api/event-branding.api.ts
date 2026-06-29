import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Visual layout for a single branding element (logo or event-name pill).
 * Mirrors the backend `BrandingLayout` Pydantic model (CHG-023).
 * All fields are optional; a fully-empty object means "use visual defaults".
 * Values are interpreted by the kiosko as viewport-relative units (vh / vw / %).
 */
export interface BrandingLayout {
  size?: number;
  x?: number;
  y?: number;
  transparency?: number;
  borderRadius?: number;
}

export interface EventBranding {
  eventName: string;
  organizerName: string;
  organizerLogoUrl: string | null;
  logoLayout: BrandingLayout | null;
  eventNameLayout: BrandingLayout | null;
}

@Injectable({ providedIn: 'root' })
export class EventBrandingApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<EventBranding> {
    return this.http.get<EventBranding>('/api/event-branding');
  }
}
