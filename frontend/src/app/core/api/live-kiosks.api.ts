import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface LiveKiosk {
  kioskId: string;
  displayLabel: string | null;
}

@Injectable({ providedIn: 'root' })
export class LiveKiosksApiService {
  private readonly http = inject(HttpClient);

  listLive(): Promise<LiveKiosk[]> {
    return firstValueFrom(
      this.http.get<LiveKiosk[]>('/api/admin/display/kiosks/live', { withCredentials: true }),
    );
  }
}
