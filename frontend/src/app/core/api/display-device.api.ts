import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DisplayDevice {
  id: string;
  organizationId: string;
  label: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayDeviceRequest {
  label: string;
}

@Injectable({ providedIn: 'root' })
export class DisplayDeviceApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<DisplayDevice[]> {
    return this.http.get<DisplayDevice[]>('/api/admin/display-devices', { withCredentials: true });
  }

  create(payload: DisplayDeviceRequest): Observable<DisplayDevice> {
    return this.http.post<DisplayDevice>('/api/admin/display-devices', payload, { withCredentials: true });
  }

  rename(id: string, payload: DisplayDeviceRequest): Observable<DisplayDevice> {
    return this.http.patch<DisplayDevice>(`/api/admin/display-devices/${id}`, payload, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/display-devices/${id}`, { withCredentials: true });
  }
}
