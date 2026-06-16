import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'embedded_web';
  sourceReference: string;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
}

export type ContentItemRequest = Omit<ContentItem, 'id'>;

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<ContentItem[]> {
    return this.http.get<ContentItem[]>('/api/content', { withCredentials: true });
  }

  create(payload: ContentItemRequest): Observable<ContentItem> {
    return this.http.post<ContentItem>('/api/content', payload, { withCredentials: true });
  }
}
