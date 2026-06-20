import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, tap, catchError, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { RemoteControlApi } from './remote-control.api';
import { RemoteControlIframeOption, RemoteControlState } from './remote-control.models';

@Injectable({ providedIn: 'root' })
export class RemoteControlFacade {
  private readonly api = inject(RemoteControlApi);
  private readonly stateSignal = signal<RemoteControlState | null>(null);
  private readonly iframeOptionsSignal = signal<RemoteControlIframeOption[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly savingSignal = signal(false);
  private readonly errorSignal = signal<ReturnType<typeof adaptApiError> | null>(null);

  readonly state = this.stateSignal.asReadonly();
  readonly iframeOptions = this.iframeOptionsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly ready = computed(() => !this.loadingSignal() && this.stateSignal() !== null);

  refresh() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    return forkJoin({
      state: this.api.getState(),
      options: this.api.listIframeOptions()
    }).pipe(
      tap(({ state, options }) => {
        this.stateSignal.set(state);
        this.iframeOptionsSignal.set(options.items);
        this.loadingSignal.set(false);
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(adaptApiError(error));
        this.loadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  setLoopMode() {
    return this.update('loop', null);
  }

  setIframeMode(iframeId: string) {
    return this.update('iframe', iframeId);
  }

  setAdsVisible(adsVisible: boolean) {
    const current = this.stateSignal();
    return this.update(current?.contentMode ?? 'loop', current?.selectedIframeId ?? null, adsVisible);
  }

  private update(contentMode: 'loop' | 'iframe', selectedIframeId: string | null, adsVisible?: boolean) {
    const current = this.stateSignal();
    this.savingSignal.set(true);
    this.errorSignal.set(null);
    return this.api.updateState({
      contentMode,
      selectedIframeId,
      adsVisible: adsVisible ?? current?.adsVisible ?? true
    }).pipe(
      tap((state) => {
        this.stateSignal.set(state);
        this.savingSignal.set(false);
      }),
      catchError((error: unknown) => {
        this.errorSignal.set(adaptApiError(error));
        this.savingSignal.set(false);
        return throwError(() => error);
      })
    );
  }
}
