import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiKeyRecord, ApiKeyWithRawSecret } from '../../shared/contracts/admin-contracts';

@Injectable({ providedIn: 'root' })
export class ApiKeysApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<ApiKeyRecord[]> {
    return this.http.get<ApiKeyRecord[]>('/api/admin/api-keys', { withCredentials: true });
  }

  create(payload: { label: string }): Observable<ApiKeyWithRawSecret> {
    return this.http.post<ApiKeyWithRawSecret>('/api/admin/api-keys', payload, { withCredentials: true });
  }

  rotate(id: string): Observable<ApiKeyWithRawSecret> {
    return this.http.post<ApiKeyWithRawSecret>(
      `/api/admin/api-keys/${id}/rotate`,
      {},
      { withCredentials: true },
    );
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/api-keys/${id}`, { withCredentials: true });
  }
}
