import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AdminStateComponent } from '../../shared/admin-state.component';
import {
  adsLabel as adsLabelFor,
  displayLabel as displayLabelFor,
  modeLabel as modeLabelFor,
  relativeTime
} from '../../shared/util/remote-control-labels';
import { RemoteControlFacade } from './remote-control.facade';
import { RemoteControlContentMode } from './remote-control.models';
import { RemoteNavigationControlsComponent } from './sections/remote-navigation-controls.component';
import { RemoteStatusStripComponent } from './sections/remote-status-strip.component';

type LocalMode = RemoteControlContentMode;

@Component({
  selector: 'app-remote-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    AdminStateComponent,
    RemoteStatusStripComponent,
    RemoteNavigationControlsComponent
  ],
  template: `
    <main class="remote-control app-page" aria-label="Control remoto">
      <header class="pagehead">
        <div>
          <p class="eyebrow">Operación</p>
          <h1>Control remoto</h1>
          <p class="pagehead__desc">
            Controla qué muestra el quiosco en la zona de contenido y si la zona de anuncios está visible.
          </p>
        </div>
        <div class="pagehead__actions">
          @if (displayOnline()) {
            <span class="onair"><span class="onair__dot" aria-hidden="true"></span>En emisión</span>
          } @else {
            <span class="pill pill--muted"><span class="pdot"></span>Sin sesión</span>
          }
        </div>
      </header>

      @if (facade.loading() || facade.saving()) {
        <mat-progress-bar
          mode="indeterminate"
          aria-label="Guardando"
        />
      }

      @if (loadError(); as error) {
        <app-admin-state
          kind="error"
          title="No se pudo cargar el control remoto"
          [message]="error.message"
        />
      }
      @if (loadError()) {
        <div class="remote-control__retry">
          <button
            type="button"
            class="btn btn--ghost"
            (click)="retryLoad()"
            data-testid="remote-control-retry"
          >
            <mat-icon aria-hidden="true">refresh</mat-icon>
            Reintentar
          </button>
        </div>
      }

      @if (updateError()) {
        <app-admin-state
          kind="error"
          title="No se pudo actualizar el control remoto"
          message="Inténtalo de nuevo o elige otro iframe."
        />
      }

      @if (facade.state(); as currentState) {
        <div class="rc-grid">
          <div class="app-card">
            <div class="app-card__head">
              <h2>Modo de contenido</h2>
            </div>
            <div class="app-card__body">
              <div
                class="segmented"
                role="group"
                aria-label="Modo de contenido"
                data-testid="remote-control-mode-group"
              >
                <button
                  type="button"
                  [class.on]="mode() === 'loop'"
                  [disabled]="facade.saving()"
                  (click)="onModeChange('loop')"
                >
                  <mat-icon aria-hidden="true">loop</mat-icon>
                  Rotación
                </button>
                <button
                  type="button"
                  [class.on]="mode() === 'iframe'"
                  [disabled]="facade.saving() || !hasIframes()"
                  (click)="onModeChange('iframe')"
                  data-testid="remote-control-iframe-radio"
                >
                  <mat-icon aria-hidden="true">cast_connected</mat-icon>
                  Iframe
                </button>
                <button
                  type="button"
                  [class.on]="mode() === 'fixed'"
                  [disabled]="facade.saving() || !hasFixedContents()"
                  (click)="onModeChange('fixed')"
                  [matTooltip]="hasFixedContents() ? '' : 'No hay content fijo disponible'"
                  data-testid="remote-control-fixed-radio"
                >
                  <mat-icon aria-hidden="true">push_pin</mat-icon>
                  Fijo
                </button>
              </div>

              <p class="rc-hint">Elige qué muestra el quiosco en la zona superior.</p>

              @if (mode() === 'iframe' && hasIframes()) {
                <fieldset class="remote-control__fieldset remote-control__picker">
                  <legend class="rc-legend">Selecciona un iframe para mostrar</legend>
                  <mat-radio-group
                    class="remote-control__iframe-list rc-list"
                    aria-label="Iframes disponibles"
                    [value]="selectedIframeId() ?? ''"
                    (change)="selectIframe($event.value)"
                    [disabled]="facade.saving()"
                    data-testid="remote-control-iframe-list"
                  >
                    @for (option of facade.iframeOptions(); track option.id) {
                      <mat-radio-button [value]="option.id" class="remote-control__iframe-item rc-item">
                        <span class="remote-control__iframe-title">{{ truncate(option.url, 32) }}</span>
                        <span class="remote-control__iframe-meta">
                          <span class="remote-control__iframe-url mono">{{ truncate(option.url, 48) }}</span>
                          @if (option.id === selectedIframeId()) {
                            <span class="pill pill--info" aria-label="En emisión ahora">
                              <span class="pdot"></span>
                              En emisión ahora
                            </span>
                          }
                        </span>
                      </mat-radio-button>
                    }
                  </mat-radio-group>
                </fieldset>
              }

              @if (mode() === 'iframe' && !hasIframes()) {
                <div class="remote-control__iframe-empty" data-testid="remote-control-iframe-empty">
                  <p>No hay iframes configurados. Añade uno en la sección de iframes.</p>
                  <a
                    class="btn btn--primary"
                    routerLink="/admin/iframes/new"
                  >
                    <mat-icon aria-hidden="true">add</mat-icon>
                    Añadir iframe
                  </a>
                </div>
              }

              @if (mode() === 'fixed' && hasFixedContents()) {
                <fieldset class="remote-control__fieldset remote-control__picker">
                  <legend class="rc-legend">Selecciona un contenido fijo para mostrar</legend>
                  <mat-radio-group
                    class="remote-control__iframe-list rc-list"
                    aria-label="Contenido fijo disponible"
                    [value]="selectedFixedContentId() ?? ''"
                    (change)="selectFixedContent($event.value)"
                    [disabled]="facade.saving()"
                    data-testid="remote-control-fixed-list"
                  >
                    @for (option of fixedContentOptions(); track option.id) {
                      <mat-radio-button [value]="option.id" class="remote-control__iframe-item rc-item">
                        <span class="remote-control__fixed-option">
                          <span class="remote-control__fixed-preview" aria-hidden="true">
                            @if (fixedContentPreviewUrl(option); as previewUrl) {
                              <img
                                class="remote-control__fixed-preview-image"
                                [src]="previewUrl"
                                alt=""
                                loading="lazy"
                                data-testid="remote-control-fixed-preview"
                              />
                            } @else {
                              <mat-icon class="remote-control__fixed-preview-icon" aria-hidden="true">
                                {{ option.contentType === 'video' ? 'videocam' : 'photo' }}
                              </mat-icon>
                            }
                          </span>
                          <span class="remote-control__fixed-copy">
                            <span class="remote-control__iframe-title">{{ truncate(option.title, 32) }}</span>
                            <span class="remote-control__iframe-meta">
                              <span class="remote-control__iframe-url mono">{{ option.contentType }}</span>
                              @if (option.id === selectedFixedContentId()) {
                                <span class="pill pill--info" aria-label="En emisión ahora">
                                  <span class="pdot"></span>
                                  En emisión ahora
                                </span>
                              }
                            </span>
                          </span>
                        </span>
                      </mat-radio-button>
                    }
                  </mat-radio-group>
                </fieldset>
              }

              <div class="rc-toggles">
                <mat-slide-toggle
                  class="rc-toggle"
                  [checked]="adsVisible()"
                  [disabled]="facade.saving()"
                  (change)="setAdsVisible($event.checked)"
                  aria-label="Mostrar anuncios"
                  data-testid="remote-control-ads-toggle"
                >
                  Mostrar anuncios
                </mat-slide-toggle>
                <mat-slide-toggle
                  class="rc-toggle"
                  [checked]="fullscreenRequested()"
                  [disabled]="facade.saving()"
                  (change)="setFullscreenRequested($event.checked)"
                  aria-label="Pantalla completa"
                  data-testid="remote-control-fullscreen-toggle"
                >
                  Pantalla completa
                </mat-slide-toggle>
              </div>
            </div>
          </div>

          <div class="app-card">
            <div class="app-card__head">
              <h2>Estado y transporte</h2>
              <span class="eyebrow">Estado en vivo</span>
            </div>
            <div class="app-card__body">
              <app-remote-status-strip
                [modeIcon]="modeIcon()"
                [modeLabel]="modeLabel()"
                [adsVisible]="adsVisible()"
                [adsIcon]="adsIcon()"
                [adsLabel]="adsLabel()"
                [fullscreenRequested]="fullscreenRequested()"
                [fullscreenIcon]="fullscreenIcon()"
                [fullscreenLabel]="fullscreenLabel()"
                [displayOnline]="displayOnline()"
                [displayLabel]="displayLabel()"
                [updatedLabel]="updatedLabel()"
                [savingSuffix]="savingSuffix()"
              />

              <div class="screen" aria-hidden="true">
                <div class="screen__top">{{ modeLabel() }}</div>
                <div class="screen__ads" [class.screen__ads--off]="!adsVisible()"><i></i><i></i><i></i></div>
              </div>

              @if (mode() === 'loop') {
                <app-remote-navigation-controls
                  [saving]="facade.saving()"
                  [isPaused]="facade.isPaused()"
                  (command)="navigateRotation($event)"
                />
                @if (facade.isPaused()) {
                  <p class="remote-control__hint" aria-live="polite">Rotación pausada.</p>
                }
              }
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      /* Page header */
      .pagehead {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      .pagehead h1 {
        font-size: 26px;
        font-weight: 700;
        margin-top: 6px;
      }
      .pagehead__desc {
        color: var(--app-text-dim);
        margin: 6px 0 0;
        max-width: 62ch;
      }
      .pagehead__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      /* On-air indicator */
      .onair {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--app-live);
        font-weight: 700;
      }
      .onair__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--app-live);
        animation: rc-pulse 2s infinite;
      }
      @keyframes rc-pulse {
        0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--app-live) 55%, transparent); }
        70% { box-shadow: 0 0 0 6px transparent; }
        100% { box-shadow: 0 0 0 0 transparent; }
      }

      /* Two-column layout */
      .rc-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr;
        align-items: start;
      }
      @media (max-width: 900px) {
        .rc-grid { grid-template-columns: 1fr; }
      }

      /* Segmented control */
      .segmented {
        display: inline-flex;
        background: var(--app-surface-2);
        border: 1px solid var(--app-border);
        border-radius: var(--r-sm);
        padding: 3px;
        gap: 3px;
        flex-wrap: wrap;
      }
      .segmented button {
        border: none;
        background: transparent;
        color: var(--app-text-dim);
        min-height: 34px;
        padding: 0 14px;
        border-radius: 6px;
        font-family: var(--font-ui);
        font-size: 13px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        cursor: pointer;
        transition: background .12s, color .12s;
      }
      .segmented button .mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }
      .segmented button:not(:disabled):hover {
        color: var(--app-text);
      }
      .segmented button.on {
        background: var(--app-surface);
        color: var(--app-accent);
        box-shadow: var(--app-shadow-sm);
      }
      .segmented button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .rc-hint {
        color: var(--app-text-dim);
        font-size: 13px;
        margin: 12px 0 0;
      }

      /* Pickers */
      .remote-control__fieldset {
        border: 0;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 12px;
      }
      .remote-control__picker {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--app-border);
      }
      .rc-legend {
        padding: 0;
        margin: 0 0 4px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--app-text-2);
      }
      .rc-list {
        display: grid;
        gap: 8px;
      }
      .rc-item {
        padding: 12px 14px;
        border: 1px solid var(--app-border);
        border-radius: var(--r-sm);
        min-height: var(--app-touch-target);
        background: var(--app-surface);
        align-items: flex-start;
        gap: 12px;
      }
      .rc-item ::ng-deep .mdc-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.35;
        padding: 2px 0;
        width: 100%;
      }
      .remote-control__iframe-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .remote-control__iframe-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--app-text);
        word-break: break-word;
        display: block;
      }
      .remote-control__iframe-url {
        font-size: 12.5px;
        color: var(--app-text-dim);
        word-break: break-all;
        display: block;
      }
      .remote-control__fixed-option {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        width: 100%;
      }
      .remote-control__fixed-preview {
        width: 72px;
        height: 48px;
        border-radius: var(--r-sm);
        background: var(--app-surface-2);
        border: 1px solid var(--app-border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .remote-control__fixed-preview-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .remote-control__fixed-preview-icon {
        color: var(--app-text-dim);
      }
      .remote-control__fixed-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      /* Empty state */
      .remote-control__iframe-empty {
        display: grid;
        gap: 12px;
        margin-top: 16px;
        padding: 16px;
        background: var(--app-surface-2);
        border: 1px dashed var(--app-border-strong);
        border-radius: var(--r-md);
      }
      .remote-control__iframe-empty p {
        margin: 0;
        color: var(--app-text-dim);
        font-size: 13px;
      }
      .remote-control__iframe-empty .btn {
        justify-self: start;
      }

      /* Toggles */
      .rc-toggles {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--app-border);
        display: grid;
        gap: 14px;
        justify-items: start;
      }

      /* Screen preview */
      .screen {
        aspect-ratio: 16 / 9;
        border-radius: var(--r-sm);
        overflow: hidden;
        border: 1px solid var(--app-border);
        margin-top: 16px;
        background:
          radial-gradient(120% 120% at 50% 0%, color-mix(in srgb, var(--app-accent) 20%, transparent), transparent 60%),
          var(--app-surface-2);
        display: grid;
        grid-template-rows: 4fr 1fr;
        gap: 4px;
        padding: 6px;
      }
      .screen__top {
        border-radius: 5px;
        display: grid;
        place-items: center;
        color: var(--app-text-faint);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        background: repeating-linear-gradient(135deg, var(--app-surface-3) 0 12px, color-mix(in srgb, var(--app-surface-3) 55%, var(--app-surface)) 12px 24px);
      }
      .screen__ads {
        border-radius: 5px;
        background: var(--app-surface-3);
        display: flex;
        gap: 4px;
        padding: 4px;
      }
      .screen__ads i {
        flex: 1;
        border-radius: 3px;
        background: color-mix(in srgb, var(--app-accent) 14%, var(--app-surface));
      }
      .screen__ads--off { opacity: 0.3; }

      .remote-control__hint {
        margin: 12px 0 0;
        color: var(--app-text-dim);
        font-size: 13px;
      }

      .remote-control__retry {
        display: flex;
        justify-content: flex-start;
      }

      @media (max-width: 599.98px) {
        .rc-item {
          padding: 10px;
        }
        .remote-control__fixed-option {
          grid-template-columns: 56px minmax(0, 1fr);
        }
        .remote-control__fixed-preview {
          width: 56px;
          height: 42px;
        }
      }
    `
  ]
})
export class RemoteControlComponent implements OnInit {
  protected readonly facade = inject(RemoteControlFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly mode = signal<LocalMode>(
    (this.facade.state()?.contentMode as LocalMode | undefined) ?? 'loop'
  );
  protected readonly updateError = signal(false);
  protected readonly loadError = computed(() => {
    const err = this.facade.error();
    if (!err) {
      return null;
    }
    return this.facade.state() === null ? err : null;
  });

  protected readonly selectedIframeId = computed(
    () => this.facade.state()?.selectedIframeId ?? null
  );
  protected readonly selectedFixedContentId = computed(
    () => this.facade.state()?.selectedFixedContentId ?? null
  );
  protected readonly fixedContentOptions = computed(() => this.facade.fixedContentOptions());
  protected readonly adsVisible = computed(() => this.facade.state()?.adsVisible !== false);
  protected readonly fullscreenRequested = computed(() => this.facade.state()?.fullscreenRequested === true);
  protected readonly displayOnline = computed<boolean | null>(() => {
    const active = this.facade.state()?.displaySessionActive;
    return active === undefined ? null : active;
  });

  protected readonly modeLabel = computed(() => modeLabelFor(this.mode()));
  protected readonly modeIcon = computed(() => {
    const m = this.mode();
    if (m === 'iframe') return 'cast_connected';
    if (m === 'fixed') return 'push_pin';
    return 'loop';
  });
  protected readonly adsLabel = computed(() => adsLabelFor(this.adsVisible()));
  protected readonly adsIcon = computed(() => (this.adsVisible() ? 'campaign' : 'visibility_off'));
  protected readonly fullscreenLabel = computed(() => (this.fullscreenRequested() ? 'On' : 'Off'));
  protected readonly fullscreenIcon = computed(() => (this.fullscreenRequested() ? 'fullscreen' : 'fullscreen_exit'));
  protected readonly displayLabel = computed(() => displayLabelFor(this.displayOnline()));
  protected readonly updatedLabel = computed(() => relativeTime(this.facade.state()?.updatedAt));
  protected readonly savingSuffix = computed(() => (this.facade.saving() ? ' · Guardando…' : ''));

  constructor() {
    effect(() => {
      const backendMode = this.facade.state()?.contentMode;
      if (backendMode) {
        this.mode.set(backendMode as LocalMode);
      }
    });
  }

  ngOnInit(): void {
    this.facade.refresh().subscribe({ error: () => undefined });
  }

  protected onModeChange(value: LocalMode): void {
    this.mode.set(value);
    if (value === 'loop') {
      this.selectLoopMode();
    }
  }

  selectLoopMode(): void {
    this.updateError.set(false);
    this.facade.setLoopMode().subscribe({
      next: () => this.notify('Cambiado a modo rotación.'),
      error: () => {
        this.updateError.set(true);
        const backendMode = this.facade.state()?.contentMode;
        if (backendMode) {
          this.mode.set(backendMode as LocalMode);
        }
      }
    });
  }

  selectIframe(contentId: string): void {
    if (!contentId) {
      return;
    }
    this.updateError.set(false);
    this.facade.setIframeMode(contentId).subscribe({
      next: () => {
        const title = this.facade.iframeOptions().find((o) => o.id === contentId)?.url ?? '';
        this.notify('Ahora mostrando: ' + title + '.');
      },
      error: () => this.updateError.set(true)
    });
  }

  selectFixedContent(contentId: string): void {
    if (!contentId) return;
    this.updateError.set(false);
    this.facade.setFixedMode(contentId).subscribe({
      next: () => {
        const title = this.facade.fixedContentOptions().find((o) => o.id === contentId)?.title ?? '';
        this.notify('Fijado: ' + title + '.');
      },
      error: () => this.updateError.set(true)
    });
  }

  setAdsVisible(visible: boolean): void {
    this.updateError.set(false);
    this.facade.setAdsVisible(visible).subscribe({
      next: () => this.notify(visible ? 'Los anuncios ahora están visibles.' : 'Los anuncios ahora están ocultos.'),
      error: () => this.updateError.set(true)
    });
  }

  setFullscreenRequested(requested: boolean): void {
    this.updateError.set(false);
    this.facade.setFullscreenRequested(requested).subscribe({
      next: () => this.notify(requested ? 'Pantalla completa solicitada.' : 'Pantalla completa cancelada.'),
      error: () => this.updateError.set(true)
    });
  }

  navigateRotation(command: 'next' | 'previous' | 'pause' | 'resume'): void {
    this.updateError.set(false);
    this.facade.navigate(command).subscribe({
      next: () => {
        const messages: Record<typeof command, string> = {
          next: 'Saltado al contenido siguiente.',
          previous: 'Vuelto al contenido anterior.',
          pause: 'Rotación pausada.',
          resume: 'Rotación reanudada.',
        };
        this.notify(messages[command]);
      },
      error: () => this.updateError.set(true)
    });
  }

  protected retryLoad(): void {
    this.facade.refresh().subscribe({ error: () => undefined });
  }

  protected hasIframes(): boolean {
    return this.facade.iframeOptions().length > 0;
  }

  protected hasFixedContents(): boolean {
    return this.facade.fixedContentOptions().length > 0;
  }

  protected truncate(value: string, max: number): string {
    if (value.length <= max) {
      return value;
    }
    return value.slice(0, max - 1) + '…';
  }

  protected fixedContentPreviewUrl(option: { thumbnailUrl?: string | null; mediaUrl?: string | null }): string | null {
    return option.thumbnailUrl ?? option.mediaUrl ?? null;
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }
}
