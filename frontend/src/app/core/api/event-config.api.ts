import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MediaFileReference } from '../../shared/media-upload.models';
import { BrandingLayout } from './event-branding.api';

export interface EventConfiguration {
  id: string;
  organizationId: string;
  eventName: string;
  organizerName: string;
  organizerLogoMediaFile: MediaFileReference | null;
  eventDurationMinutes: number;
  logoLayout: BrandingLayout | null;
  eventNameLayout: BrandingLayout | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class EventConfigurationApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<EventConfiguration> {
    return this.http.get<EventConfiguration>('/api/event-configuration', { withCredentials: true });
  }

  update(formData: FormData): Observable<EventConfiguration> {
    return this.http.put<EventConfiguration>('/api/event-configuration', formData, { withCredentials: true });
  }
}
