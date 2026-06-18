import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  RemoteControlIframeOptionsResponse,
  RemoteControlState,
  RemoteControlUpdate
} from './remote-control.models';

@Injectable({ providedIn: 'root' })
export class RemoteControlApi {
  private readonly http = inject(HttpClient);

  getState(): Observable<RemoteControlState> {
    return this.http.get<RemoteControlState>('/api/display/remote-control/state', { withCredentials: true });
  }

  updateState(payload: RemoteControlUpdate): Observable<RemoteControlState> {
    return this.http.put<RemoteControlState>('/api/display/remote-control/state', payload, { withCredentials: true });
  }

  listIframeOptions(): Observable<RemoteControlIframeOptionsResponse> {
    return this.http.get<RemoteControlIframeOptionsResponse>('/api/display/remote-control/iframe-options', {
      withCredentials: true
    });
  }
}
