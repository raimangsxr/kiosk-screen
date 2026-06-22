import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, tap, catchError, throwError } from 'rxjs';

import { adaptApiError } from '../../core/errors/api-error-adapter';
import { DisplayControlSyncService } from '../../core/display-control-sync.service';
import { RemoteControlApi } from './remote-control.api';
import {
  RemoteControlContentMode,
  RemoteControlFixedContentOption,
  RemoteControlIframeOption,
  RemoteControlNavigationCommand,
  RemoteControlState
} from './remote-control.models';

@Injectable({ providedIn: 'root' })
export class RemoteControlFacade {
  private readonly api = inject(RemoteControlApi);
  private readonly displaySync = inject(DisplayControlSyncService);
  private readonly stateSignal = signal<RemoteControlState | null>(null);
  private readonly iframeOptionsSignal = signal<RemoteControlIframeOption[]>([]);
  private readonly fixedContentOptionsSignal = signal<RemoteControlFixedContentOption[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly savingSignal = signal(false);
  private readonly errorSignal = signal<ReturnType<typeof adaptApiError> | null>(null);
  /** Optimistic local pause state; reset on mode change or polling update. */
  private readonly pausedSignal = signal<boolean>(false);

  readonly state = this.stateSignal.asReadonly();
  readonly iframeOptions = this.iframeOptionsSignal.asReadonly();
  readonly fixedContentOptions = this.fixedContentOptionsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isPaused = computed(
    () => this.pausedSignal() && this.stateSignal()?.contentMode === 'loop',
  );
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
        this.fixedContentOptionsSignal.set(options.fixedEligibleContents ?? []);
        // Reset local pause state when mode changes away from loop (FR-012a).
        if (state.contentMode !== 'loop') this.pausedSignal.set(false);
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
    this.pausedSignal.set(false);
    return this.update('loop', null, null);
  }

  setIframeMode(iframeId: string) {
    this.pausedSignal.set(false);
    return this.update('iframe', iframeId, null);
  }

  setFixedMode(fixedContentId: string) {
    this.pausedSignal.set(false);
    return this.update('fixed', null, fixedContentId);
  }

  setAdsVisible(adsVisible: boolean) {
    const current = this.stateSignal();
    return this.update(
      current?.contentMode ?? 'loop',
      current?.selectedIframeId ?? null,
      current?.selectedFixedContentId ?? null,
      adsVisible,
      current?.fullscreenRequested ?? false
    );
  }

  setFullscreenRequested(fullscreenRequested: boolean) {
    const current = this.stateSignal();
    return this.update(
      current?.contentMode ?? 'loop',
      current?.selectedIframeId ?? null,
      current?.selectedFixedContentId ?? null,
      current?.adsVisible ?? true,
      fullscreenRequested
    );
  }

  navigate(command: RemoteControlNavigationCommand) {
    this.savingSignal.set(true);
    this.errorSignal.set(null);
    // FR-011 / FR-012a: locally track pause state so the UI reflects it before
    // the next poll round-trip.
    if (command === 'pause') this.pausedSignal.set(true);
    if (command === 'resume') this.pausedSignal.set(false);
    return this.api.navigate({ command }).pipe(
      tap((state) => {
        this.stateSignal.set(state);
        this.displaySync.notifyRemoteControlChanged();
        this.savingSignal.set(false);
      }),
      catchError((error: unknown) => {
        // Rollback optimistic state on failure.
        if (command === 'pause') this.pausedSignal.set(false);
        if (command === 'resume') this.pausedSignal.set(true);
        this.errorSignal.set(adaptApiError(error));
        this.savingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  private update(
    contentMode: RemoteControlContentMode,
    selectedIframeId: string | null,
    selectedFixedContentId: string | null,
    adsVisible?: boolean,
    fullscreenRequested?: boolean
  ) {
    const current = this.stateSignal();
    this.savingSignal.set(true);
    this.errorSignal.set(null);
    // FR-012a: leaving loop mode discards the pause flag.
    if (contentMode !== 'loop') this.pausedSignal.set(false);
    const payload: {
      contentMode: RemoteControlContentMode;
      selectedIframeId: string | null;
      adsVisible: boolean;
      fullscreenRequested: boolean;
      selectedFixedContentId?: string;
    } = {
      contentMode,
      selectedIframeId,
      adsVisible: adsVisible ?? current?.adsVisible ?? true,
      fullscreenRequested: fullscreenRequested ?? current?.fullscreenRequested ?? false,
    };
    if (selectedFixedContentId !== null) {
      payload.selectedFixedContentId = selectedFixedContentId;
    }
    return this.api.updateState(payload).pipe(
      tap((state) => {
        this.stateSignal.set(state);
        this.displaySync.notifyRemoteControlChanged();
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
