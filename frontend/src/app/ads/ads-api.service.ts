import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MediaFileReference, RotationAnimation } from '../shared/media-upload.models';

export interface Client {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AdItem {
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

@Injectable({ providedIn: 'root' })
export class AdsApiService {
  private readonly http = inject(HttpClient);

  listClients(): Observable<Client[]> {
    return this.http.get<Client[]>('/api/clients', { withCredentials: true });
  }

  createClient(payload: Omit<Client, 'id'>): Observable<Client> {
    return this.http.post<Client>('/api/clients', payload, { withCredentials: true });
  }

  updateClient(id: string, payload: Omit<Client, 'id'>): Observable<Client> {
    return this.http.put<Client>(`/api/clients/${id}`, payload, { withCredentials: true });
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`/api/clients/${id}`, { withCredentials: true });
  }

  listAds(): Observable<AdItem[]> {
    return this.http.get<AdItem[]>('/api/ads', { withCredentials: true });
  }

  createAd(payload: Omit<AdItem, 'id'>): Observable<AdItem> {
    return this.http.post<AdItem>('/api/ads', payload, { withCredentials: true });
  }

  getAd(id: string): Observable<AdItem> {
    return this.http.get<AdItem>(`/api/ads/${id}`, { withCredentials: true });
  }

  updateAd(id: string, payload: Omit<AdItem, 'id'>): Observable<AdItem> {
    return this.http.put<AdItem>(`/api/ads/${id}`, payload, { withCredentials: true });
  }

  deleteAd(id: string): Observable<void> {
    return this.http.delete<void>(`/api/ads/${id}`, { withCredentials: true });
  }

  uploadAd(payload: Omit<AdItem, 'id'>, file: File): Observable<AdItem> {
    const body = new FormData();
    body.append('file', file);
    body.append('clientId', payload.clientId);
    body.append('label', payload.label);
    body.append('isActive', String(payload.isActive));
    body.append('displayOrder', String(payload.displayOrder));
    if (payload.durationSeconds) body.append('durationSeconds', String(payload.durationSeconds));
    if (payload.rotationAnimation) body.append('rotationAnimation', payload.rotationAnimation);
    if (payload.animationDurationMilliseconds) body.append('animationDurationMilliseconds', String(payload.animationDurationMilliseconds));
    return this.http.post<AdItem>('/api/ads/upload', body, { withCredentials: true });
  }
}
