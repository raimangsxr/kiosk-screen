import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { RotationAnimation } from '../../shared/media-upload.models';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: string[];
}

export type UserRequest = Omit<UserRecord, 'id'>;

export type CreateUserRequest = UserRequest & {
  password: string;
};

export interface KioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: number;
  bottomRegionRatio: number;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation: RotationAnimation;
  defaultAdRotationAnimation: RotationAnimation;
  defaultTopAnimationDurationMilliseconds: number;
  defaultAdAnimationDurationMilliseconds: number;
  inlineAdCount: number;
  inlineAdItemBorderRadiusPx: number;
  inlineAdItemBorderWidthPx: number;
  inlineAdItemBorderColor: string;
  remoteControlPollingSeconds: number;
  videoEndDelaySeconds: number;
  isEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getConfiguration(): Observable<KioskConfiguration> {
    return this.http.get<KioskConfiguration>('/api/display/configuration', { withCredentials: true });
  }

  updateConfiguration(payload: Omit<KioskConfiguration, 'id'>): Observable<KioskConfiguration> {
    return this.http.put<KioskConfiguration>('/api/display/configuration', payload, { withCredentials: true });
  }

  listUsers(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>('/api/users', { withCredentials: true });
  }

  createUser(payload: CreateUserRequest): Observable<UserRecord> {
    return this.http.post<UserRecord>('/api/users', payload, { withCredentials: true });
  }

  updateUser(id: string, payload: UserRequest): Observable<UserRecord> {
    return this.http.put<UserRecord>(`/api/users/${id}`, payload, { withCredentials: true });
  }

  resetUserPassword(id: string, password: string): Observable<void> {
    return this.http.put<void>(`/api/users/${id}/password`, { password }, { withCredentials: true });
  }
}
