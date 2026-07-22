import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DisplayScaleEntry {
  displayDeviceId: string;
  displayLabel: string;
  connected: boolean;
  scaleX: number;
  scaleY: number;
  source: 'override' | 'default';
}

export interface IframeItem {
  id: string;
  organizationId: string;
  url: string;
  scaleX: number;
  scaleY: number;
  displayScales?: DisplayScaleEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface IframeListResponse {
  items: IframeItem[];
}

export interface IframeRequest {
  url: string;
  scaleX?: number;
  scaleY?: number;
}

export interface DisplayScaleOverrideInput {
  displayDeviceId: string;
  scaleX?: number;
  scaleY?: number;
  clear?: boolean;
}

export interface IframeDisplayScalesRequest {
  items: DisplayScaleOverrideInput[];
}

export interface IframeWithDisplayScales extends IframeItem {
  displayScales: DisplayScaleEntry[];
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

  putDisplayScales(id: string, payload: IframeDisplayScalesRequest): Observable<IframeWithDisplayScales> {
    return this.http.put<IframeWithDisplayScales>(`/api/iframes/${id}/display-scales`, payload, {
      withCredentials: true,
    });
  }
}
