import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ReadinessReport {
  ready: boolean;
  blockers: string[];
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class ReadinessApiService {
  private readonly http = inject(HttpClient);

  getReadiness(): Observable<ReadinessReport> {
    return this.http.get<ReadinessReport>('/api/readiness', { withCredentials: true });
  }
}
