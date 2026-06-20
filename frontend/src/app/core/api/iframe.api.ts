import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface IframeItem {
  id: string;
  organizationId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface IframeListResponse {
  items: IframeItem[];
}

export interface IframeRequest {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class IframeApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<IframeListResponse> {
    return this.http.get<IframeListResponse>('/api/iframes', { withCredentials: true });
  }

  create(payload: IframeRequest): Observable<IframeItem> {
    return this.http.post<IframeItem>('/api/iframes', payload, { withCredentials: true });
  }

  get(id: string): Observable<IframeItem> {
    return this.http.get<IframeItem>(`/api/iframes/${id}`, { withCredentials: true });
  }

  update(id: string, payload: IframeRequest): Observable<IframeItem> {
    return this.http.put<IframeItem>(`/api/iframes/${id}`, payload, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/iframes/${id}`, { withCredentials: true });
  }
}
