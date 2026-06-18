import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RotationAnimation } from '../shared/media-upload.models';

export interface ApprovedDomain {
  id: string;
  domain: string;
  isActive: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: string[];
}

export type UserRequest = Omit<UserRecord, 'id'>;

export interface KioskConfiguration {
  id: string;
  name: string;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation: RotationAnimation;
  defaultAdRotationAnimation: RotationAnimation;
  defaultTopAnimationDurationMilliseconds: number;
  defaultAdAnimationDurationMilliseconds: number;
  inlineAdCount: number;
  remoteControlPollingSeconds: number;
  configuredEventDurationMinutes: number;
  isEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  listDomains(): Observable<ApprovedDomain[]> {
    return this.http.get<ApprovedDomain[]>('/api/approved-domains', { withCredentials: true });
  }

  createDomain(payload: Omit<ApprovedDomain, 'id'>): Observable<ApprovedDomain> {
    return this.http.post<ApprovedDomain>('/api/approved-domains', payload, { withCredentials: true });
  }

  updateDomain(id: string, payload: Omit<ApprovedDomain, 'id'>): Observable<ApprovedDomain> {
    return this.http.put<ApprovedDomain>(`/api/approved-domains/${id}`, payload, { withCredentials: true });
  }

  deleteDomain(id: string): Observable<void> {
    return this.http.delete<void>(`/api/approved-domains/${id}`, { withCredentials: true });
  }

  getConfiguration(): Observable<KioskConfiguration> {
    return this.http.get<KioskConfiguration>('/api/display/configuration', { withCredentials: true });
  }

  updateConfiguration(payload: Omit<KioskConfiguration, 'id'>): Observable<KioskConfiguration> {
    return this.http.put<KioskConfiguration>('/api/display/configuration', payload, { withCredentials: true });
  }

  listUsers(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>('/api/users', { withCredentials: true });
  }

  createUser(payload: UserRequest): Observable<UserRecord> {
    return this.http.post<UserRecord>('/api/users', payload, { withCredentials: true });
  }

  updateUser(id: string, payload: UserRequest): Observable<UserRecord> {
    return this.http.put<UserRecord>(`/api/users/${id}`, payload, { withCredentials: true });
  }
}
