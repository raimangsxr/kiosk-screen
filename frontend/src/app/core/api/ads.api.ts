import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';

export interface AdItem {
  id: string;
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
  advertiser?: string | null;
}

export interface AdPayload {
  sourceReference: string;
  isActive: boolean;
  displayOrder?: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  advertiser?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdsApiService {
  private readonly http = inject(HttpClient);

  listAds(): Observable<AdItem[]> {
    return this.http.get<AdItem[]>('/api/ads', { withCredentials: true });
  }

  createAd(payload: AdPayload): Observable<AdItem> {
    return this.http.post<AdItem>('/api/ads', payload, { withCredentials: true });
  }

  getAd(id: string): Observable<AdItem> {
    return this.http.get<AdItem>(`/api/ads/${id}`, { withCredentials: true });
  }

  updateAd(id: string, payload: AdPayload): Observable<AdItem> {
    return this.http.put<AdItem>(`/api/ads/${id}`, payload, { withCredentials: true });
  }

  deleteAd(id: string): Observable<void> {
    return this.http.delete<void>(`/api/ads/${id}`, { withCredentials: true });
  }

  uploadAd(payload: AdPayload, file: File): Observable<AdItem> {
    const body = new FormData();
    body.append('file', file);
    body.append('isActive', String(payload.isActive));
    if (payload.advertiser !== undefined && payload.advertiser !== null) {
      body.append('advertiser', payload.advertiser);
    }
    if (payload.displayOrder !== undefined) {
      body.append('displayOrder', String(payload.displayOrder));
    }
    if (payload.durationSeconds) body.append('durationSeconds', String(payload.durationSeconds));
    if (payload.rotationAnimation) body.append('rotationAnimation', payload.rotationAnimation);
    if (payload.animationDurationMilliseconds) body.append('animationDurationMilliseconds', String(payload.animationDurationMilliseconds));
    return this.http.post<AdItem>('/api/ads/upload', body, { withCredentials: true });
  }

  reorderAds(orderedIds: string[]): Observable<void> {
    return this.http.post<void>('/api/ads/reorder', { orderedIds }, { withCredentials: true });
  }
}
