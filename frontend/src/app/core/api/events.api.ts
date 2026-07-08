import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface DisplayEvent {
  id: string;
  eventType: string;
  severity: string;
  message: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private readonly http = inject(HttpClient);

  listRecent(): Observable<DisplayEvent[]> {
    return this.http.get<DisplayEvent[]>('/api/events', { withCredentials: true });
  }
}
