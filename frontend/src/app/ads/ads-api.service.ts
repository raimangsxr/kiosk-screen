import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
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

  listAds(): Observable<AdItem[]> {
    return this.http.get<AdItem[]>('/api/ads', { withCredentials: true });
  }

  createAd(payload: Omit<AdItem, 'id'>): Observable<AdItem> {
    return this.http.post<AdItem>('/api/ads', payload, { withCredentials: true });
  }
}
