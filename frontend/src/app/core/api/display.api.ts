import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';

export interface DisplayKioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: 4;
  bottomRegionRatio: 1;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation?: RotationAnimation;
  defaultAdRotationAnimation?: RotationAnimation;
  defaultTopAnimationDurationMilliseconds?: number;
  defaultAdAnimationDurationMilliseconds?: number;
  inlineAdCount?: number;
  remoteControlPollingSeconds?: number;
  configuredEventDurationMinutes: number;
  isEnabled: boolean;
}

export interface DisplayContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'embedded_web';
  sourceReference: string;
  mediaFile?: MediaFileReference | null;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  effectiveDurationSeconds?: number | null;
  effectiveRotationAnimation?: RotationAnimation | null;
  effectiveAnimationDurationMilliseconds?: number | null;
}

export interface DisplayAdItem {
  id: string;
  clientId: string;
  label: string;
  sourceReference: string;
  mediaFile?: MediaFileReference | null;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  effectiveDurationSeconds?: number | null;
  effectiveRotationAnimation?: RotationAnimation | null;
  effectiveAnimationDurationMilliseconds?: number | null;
}

export interface DisplayState {
  configuration: DisplayKioskConfiguration;
  topContent: DisplayContentItem[];
  ads: DisplayAdItem[];
  remoteControl?: {
    contentMode: 'loop' | 'iframe';
    selectedContentId: string | null;
    adsVisible: boolean;
    updatedAt: string;
  };
  selectedIframe?: DisplayContentItem | null;
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
