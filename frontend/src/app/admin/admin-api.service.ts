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
  roles: string[];
}

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

  getConfiguration(): Observable<KioskConfiguration> {
    return this.http.get<KioskConfiguration>('/api/display/configuration', { withCredentials: true });
  }

  updateConfiguration(payload: Omit<KioskConfiguration, 'id'>): Observable<KioskConfiguration> {
    return this.http.put<KioskConfiguration>('/api/display/configuration', payload, { withCredentials: true });
  }

  listUsers(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>('/api/users', { withCredentials: true });
  }
}
