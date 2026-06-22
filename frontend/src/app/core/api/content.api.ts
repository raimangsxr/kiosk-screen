import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';

export interface ContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video';
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
  /** Spec 018 US5: pinned content, shown in fixed mode. */
  isFixed?: boolean;
  /** Spec 018 US4: cadence for recurring content (every N advances). */
  recurringEveryXIterations?: number | null;
}

export type ContentItemRequest = Omit<ContentItem, 'id' | 'displayOrder'> & {
  displayOrder?: number;
  isFixed?: boolean;
  recurringEveryXIterations?: number | null;
};

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<ContentItem[]> {
    return this.http.get<ContentItem[]>('/api/content', { withCredentials: true });
  }

  create(payload: Omit<ContentItem, 'id' | 'displayOrder'> & { displayOrder?: number }): Observable<ContentItem> {
    return this.http.post<ContentItem>('/api/content', payload, { withCredentials: true });
  }

  get(id: string): Observable<ContentItem> {
    return this.http.get<ContentItem>(`/api/content/${id}`, { withCredentials: true });
  }

  update(id: string, payload: Omit<ContentItem, 'id' | 'displayOrder'> & { displayOrder?: number }): Observable<ContentItem> {
    return this.http.put<ContentItem>(`/api/content/${id}`, payload, { withCredentials: true });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/content/${id}`, { withCredentials: true });
  }

  upload(
    payload: Omit<ContentItem, 'id' | 'displayOrder'> & {
      displayOrder?: number;
      isFixed?: boolean;
      recurringEveryXIterations?: number | null;
    },
    file: File,
  ): Observable<ContentItem> {
    const body = new FormData();
    body.append('file', file);
    body.append('title', payload.title);
    // Spec 018 US6: contentType is now optional — the backend autodetects
    // by extension when omitted. Only send it if the user explicitly chose
    // a value in the form.
    if (payload.contentType) {
      body.append('contentType', payload.contentType);
    }
    body.append('isActive', String(payload.isActive ?? true));
    if (payload.displayOrder !== undefined) {
      body.append('displayOrder', String(payload.displayOrder));
    }
    if (payload.durationSeconds) body.append('durationSeconds', String(payload.durationSeconds));
    if (payload.rotationAnimation) body.append('rotationAnimation', payload.rotationAnimation);
    if (payload.animationDurationMilliseconds) body.append('animationDurationMilliseconds', String(payload.animationDurationMilliseconds));
    if (payload.isFixed) body.append('isFixed', 'true');
    if (payload.recurringEveryXIterations !== undefined && payload.recurringEveryXIterations !== null) {
      body.append('recurringEveryXIterations', String(payload.recurringEveryXIterations));
    }
    return this.http.post<ContentItem>('/api/content/upload', body, { withCredentials: true });
  }

  reorderContent(orderedIds: string[]): Observable<void> {
    return this.http.post<void>('/api/content/reorder', { orderedIds }, { withCredentials: true });
  }
}
