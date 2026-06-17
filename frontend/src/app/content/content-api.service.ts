import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MediaFileReference, RotationAnimation } from '../shared/media-upload.models';

export interface ContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'embedded_web';
  sourceReference: string;
  mediaFile?: MediaFileReference | null;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  effectiveDurationSeconds?: number | null;
  effectiveRotationAnimation?: RotationAnimation | null;
  effectiveAnimationDurationMilliseconds?: number | null;
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

  createIframe(payload: ContentItemRequest): Observable<ContentItem> {
    return this.http.post<ContentItem>('/api/content/iframe', payload, { withCredentials: true });
  }

  get(id: string): Observable<ContentItem> {
    return this.http.get<ContentItem>(`/api/content/${id}`, { withCredentials: true });
  }

  update(id: string, payload: ContentItemRequest): Observable<ContentItem> {
    return this.http.put<ContentItem>(`/api/content/${id}`, payload, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/content/${id}`, { withCredentials: true });
  }

  upload(payload: ContentItemRequest, file: File): Observable<ContentItem> {
    const body = new FormData();
    body.append('file', file);
    body.append('title', payload.title);
    body.append('contentType', payload.contentType);
    body.append('isActive', String(payload.isActive));
    body.append('displayOrder', String(payload.displayOrder));
    if (payload.durationSeconds) body.append('durationSeconds', String(payload.durationSeconds));
    if (payload.rotationAnimation) body.append('rotationAnimation', payload.rotationAnimation);
    if (payload.animationDurationMilliseconds) body.append('animationDurationMilliseconds', String(payload.animationDurationMilliseconds));
    return this.http.post<ContentItem>('/api/content/upload', body, { withCredentials: true });
  }
}
