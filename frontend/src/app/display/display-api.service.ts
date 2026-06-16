import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface KioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: 4;
  bottomRegionRatio: 1;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  configuredEventDurationMinutes: number;
  isEnabled: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'embedded_web';
  sourceReference: string;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
}

export interface AdItem {
  id: string;
  clientId: string;
  label: string;
  sourceReference: string;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
}

export interface DisplayState {
  configuration: KioskConfiguration;
  topContent: ContentItem[];
  ads: AdItem[];
  fallbackActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class DisplayApiService {
  private readonly http = inject(HttpClient);

  openDisplay(): Observable<DisplayState> {
    return this.http.post<DisplayState>('/api/display/open', {}, { withCredentials: true });
  }

  getState(): Observable<DisplayState> {
    return this.http.get<DisplayState>('/api/display/state', { withCredentials: true });
  }
}
