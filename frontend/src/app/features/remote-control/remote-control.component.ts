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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { RemoteControlFacade } from './remote-control.facade';
import { RemoteControlContentMode } from './remote-control.models';

type LocalMode = Extract<RemoteControlContentMode, 'loop' | 'iframe'>;

@Component({
  selector: 'app-remote-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    AdminStateComponent,
    PageHeaderComponent
  ],
  template: `
    <main class="remote-control app-page" aria-label="Remote control">
      <app-page-header
        eyebrow="Administration"
        title="Remote control"
        description="Control what the running kiosk shows in the content region and whether the ad region is visible."
      />

      <mat-progress-bar
        *ngIf="facade.loading() || facade.saving()"
        mode="indeterminate"
        aria-label="Saving"
      />

      <app-admin-state
        *ngIf="loadError() as error"
        kind="error"
        title="Could not load remote control"
        [message]="error.message"
      />
      <div *ngIf="loadError()" class="remote-control__retry">
        <button
          mat-stroked-button
          color="primary"
          type="button"
          (click)="retryLoad()"
          data-testid="remote-control-retry"
        >
          <mat-icon aria-hidden="true">refresh</mat-icon>
          Retry
        </button>
      </div>

      <app-admin-state
        *ngIf="updateError()"
        kind="error"
        title="Could not update remote control"
        message="Try again or choose another iframe."
      />

      <ng-container *ngIf="facade.state() as currentState">
        <div
          class="remote-control__status"
          role="status"
          aria-live="polite"
          data-testid="remote-control-status"
        >
          <mat-chip-set aria-label="Current status">
            <mat-chip class="remote-control__chip remote-control__chip--mode">
              <mat-icon matChipAvatar aria-hidden="true">{{ modeIcon() }}</mat-icon>
              {{ modeLabel() }}
            </mat-chip>
            <mat-chip class="remote-control__chip" [class.remote-control__chip--success]="adsVisible()" [class.remote-control__chip--neutral]="!adsVisible()">
              <mat-icon matChipAvatar aria-hidden="true">{{ adsIcon() }}</mat-icon>
              Ads {{ adsLabel() }}
            </mat-chip>
            <mat-chip class="remote-control__chip" [class.remote-control__chip--success]="displayOnline()" [class.remote-control__chip--warning]="displayOnline() === false" [class.remote-control__chip--neutral]="displayOnline() === null">
              <mat-icon matChipAvatar aria-hidden="true">sync</mat-icon>
              {{ displayLabel() }}
            </mat-chip>
          </mat-chip-set>
          <span class="remote-control__status-updated">
            Updated {{ updatedLabel() }}{{ savingSuffix() }}
          </span>
        </div>

        <mat-card appearance="outlined" class="remote-control__card">
          <mat-card-header>
            <mat-icon mat-card-avatar aria-hidden="true">cast_connected</mat-icon>
            <mat-card-title>Content mode</mat-card-title>
            <mat-card-subtitle>Choose what the kiosk shows in the top region.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <fieldset class="remote-control__fieldset">
              <legend class="remote-control__legend">Mode</legend>
              <mat-radio-group
                class="remote-control__mode-group"
                aria-label="Content mode"
                [value]="mode()"
                (change)="onModeChange($event.value)"
                [disabled]="facade.saving()"
                data-testid="remote-control-mode-group"
              >
                <mat-radio-button value="loop" class="remote-control__radio">
                  <span class="remote-control__radio-title">Rotation</span>
                  <span class="remote-control__radio-hint">Cycle through all approved content.</span>
                </mat-radio-button>
                <mat-radio-button
                  value="iframe"
                  class="remote-control__radio"
                  [disabled]="!hasIframes()"
                  data-testid="remote-control-iframe-radio"
                >
                  <span class="remote-control__radio-title">Iframe</span>
                  <span class="remote-control__radio-hint">Lock the display on a single approved iframe.</span>
                </mat-radio-button>
              </mat-radio-group>
            </fieldset>

            @if (mode() === 'iframe' && hasIframes()) {
              <fieldset class="remote-control__fieldset remote-control__iframe-fieldset">
                <legend class="remote-control__legend">Select an iframe to display</legend>
                <mat-radio-group
                  class="remote-control__iframe-list"
                  aria-label="Available iframes"
                  [value]="selectedIframeId() ?? ''"
                  (change)="selectIframe($event.value)"
                  [disabled]="facade.saving()"
                  data-testid="remote-control-iframe-list"
                >
                  @for (option of facade.iframeOptions(); track option.id) {
                    <mat-radio-button [value]="option.id" class="remote-control__iframe-item">
                      <span class="remote-control__iframe-title">{{ truncate(option.url, 32) }}</span>
                      <span class="remote-control__iframe-meta">
                        <span class="remote-control__iframe-url">{{ truncate(option.url, 48) }}</span>
                        @if (option.id === selectedIframeId()) {
                          <span class="remote-control__iframe-badge" aria-label="Currently showing">
                            <mat-icon aria-hidden="true">check_circle</mat-icon>
                            Currently showing
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
                <p>No iframes configured. Add one in the iframe section.</p>
                <a
                  mat-flat-button
                  color="primary"
                  routerLink="/admin/iframes/new"
                  class="remote-control__iframe-cta"
                >
                  <mat-icon aria-hidden="true">add</mat-icon>
                  Add iframe
                </a>
              </div>
            }
          </mat-card-content>
        </mat-card>

        @if (mode() === 'loop') {
          <mat-card appearance="outlined" class="remote-control__card">
            <mat-card-header>
              <mat-icon mat-card-avatar aria-hidden="true">skip_next</mat-icon>
              <mat-card-title>Rotation navigation</mat-card-title>
              <mat-card-subtitle>Move the running rotation and restart the item timer.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="remote-control__navigation" aria-label="Rotation navigation">
                <button
                  mat-stroked-button
                  type="button"
                  [disabled]="facade.saving()"
                  (click)="navigateRotation('previous')"
                  data-testid="remote-control-previous"
                >
                  <mat-icon aria-hidden="true">skip_previous</mat-icon>
                  Previous
                </button>
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  [disabled]="facade.saving()"
                  (click)="navigateRotation('next')"
                  data-testid="remote-control-next"
                >
                  <mat-icon aria-hidden="true">skip_next</mat-icon>
                  Next
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <mat-card appearance="outlined" class="remote-control__card">
          <mat-card-header>
            <mat-icon mat-card-avatar aria-hidden="true">campaign</mat-icon>
            <mat-card-title>Ads</mat-card-title>
            <mat-card-subtitle>Show or hide the bottom ad region.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-slide-toggle
              [checked]="adsVisible()"
              [disabled]="facade.saving()"
              (change)="setAdsVisible($event.checked)"
              aria-label="Show ads"
              data-testid="remote-control-ads-toggle"
            >
              Show ads
            </mat-slide-toggle>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--mat-sys-surface-container-lowest);
      }
      .remote-control {
        display: grid;
        gap: 16px;
      }
      .remote-control__status {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding: 12px 14px;
        background: var(--mat-sys-surface-container-low);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: var(--app-card-radius);
      }
      .remote-control__status-updated {
        margin-left: auto;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .remote-control__chip {
        --mdc-chip-container-height: 28px;
      }
      .remote-control__chip--mode {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .remote-control__chip--success {
        background: color-mix(in srgb, var(--mat-sys-primary) 18%, transparent);
        color: var(--mat-sys-on-surface);
      }
      .remote-control__chip--warning {
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
      }
      .remote-control__chip--neutral {
        background: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-on-surface-variant);
      }
      .remote-control__card {
        display: block;
        background: var(--mat-sys-surface);
      }
      .remote-control__fieldset {
        border: 0;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 12px;
      }
      .remote-control__legend {
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        color: var(--mat-sys-on-surface-variant);
        padding: 0;
        margin: 0 0 4px;
      }
      .remote-control__mode-group {
        display: grid;
        gap: 8px;
      }
      .remote-control__radio {
        padding: 12px 14px;
        border-radius: var(--mat-sys-corner-medium);
        min-height: var(--app-touch-target);
        align-items: flex-start;
        gap: 12px;
      }
      .remote-control__radio ::ng-deep .mdc-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.35;
        padding: 2px 0;
      }
      .remote-control__radio-title {
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
        color: var(--mat-sys-on-surface);
        display: block;
      }
      .remote-control__radio-hint {
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
        display: block;
      }
      .remote-control__iframe-fieldset {
        margin-top: 12px;
        padding-top: 16px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }
      .remote-control__iframe-list {
        display: grid;
        gap: 8px;
      }
      .remote-control__iframe-item {
        padding: 12px 14px;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: var(--mat-sys-corner-medium);
        min-height: var(--app-touch-target);
        background: var(--mat-sys-surface);
        align-items: flex-start;
        gap: 12px;
      }
      .remote-control__iframe-item ::ng-deep .mdc-label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.35;
        padding: 2px 0;
        width: 100%;
      }
      .remote-control__iframe-item .remote-control__iframe-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .remote-control__iframe-title {
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
        color: var(--mat-sys-on-surface);
        word-break: break-word;
        display: block;
      }
      .remote-control__iframe-url {
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
        word-break: break-all;
        display: block;
      }
      .remote-control__iframe-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
        font: var(--mat-sys-label-small);
        letter-spacing: var(--mat-sys-label-small-tracking);
        font-weight: 600;
      }
      .remote-control__iframe-badge mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .remote-control__iframe-empty {
        display: grid;
        gap: 12px;
        margin-top: 8px;
        padding: 16px;
        background: var(--mat-sys-surface-container-low);
        border: 1px dashed var(--mat-sys-outline-variant);
        border-radius: var(--mat-sys-corner-medium);
      }
      .remote-control__iframe-empty p {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
      }
      .remote-control__iframe-cta {
        justify-self: start;
        min-height: var(--app-touch-target);
      }
      .remote-control__navigation {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .remote-control__navigation button {
        min-height: var(--app-touch-target);
      }
      .remote-control__retry {
        display: flex;
        justify-content: flex-start;
      }
      .remote-control__retry button {
        min-height: var(--app-touch-target);
      }
      @media (max-width: 599.98px) {
        .remote-control__status-updated {
          margin-left: 0;
          width: 100%;
        }
        .remote-control__radio,
        .remote-control__iframe-item {
          padding: 10px 10px;
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
  protected readonly adsVisible = computed(() => this.facade.state()?.adsVisible !== false);
  protected readonly displayOnline = computed<boolean | null>(() => {
    const active = this.facade.state()?.displaySessionActive;
    return active === undefined ? null : active;
  });

  protected readonly modeLabel = computed(() => (this.mode() === 'iframe' ? 'Iframe' : 'Rotation'));
  protected readonly modeIcon = computed(() => (this.mode() === 'iframe' ? 'cast_connected' : 'loop'));
  protected readonly adsLabel = computed(() => (this.adsVisible() ? 'Visible' : 'Hidden'));
  protected readonly adsIcon = computed(() => (this.adsVisible() ? 'campaign' : 'visibility_off'));
  protected readonly displayLabel = computed(() => {
    const online = this.displayOnline();
    if (online === null) {
      return 'Display status unknown';
    }
    return online ? 'Display online' : 'Display offline';
  });
  protected readonly updatedLabel = computed(() => relativeTime(this.facade.state()?.updatedAt));
  protected readonly savingSuffix = computed(() => (this.facade.saving() ? ' · Saving…' : ''));

  constructor() {
    effect(() => {
      const backendMode = this.facade.state()?.contentMode;
      if (backendMode) {
        this.mode.set(backendMode);
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
      next: () => this.notify('Switched to rotation mode.'),
      error: () => {
        this.updateError.set(true);
        const backendMode = this.facade.state()?.contentMode;
        if (backendMode) {
          this.mode.set(backendMode);
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
        this.notify('Now showing: ' + title + '.');
      },
      error: () => this.updateError.set(true)
    });
  }

  setAdsVisible(visible: boolean): void {
    this.updateError.set(false);
    this.facade.setAdsVisible(visible).subscribe({
      next: () => this.notify(visible ? 'Ads are now visible.' : 'Ads are now hidden.'),
      error: () => this.updateError.set(true)
    });
  }

  navigateRotation(command: 'next' | 'previous'): void {
    this.updateError.set(false);
    this.facade.navigate(command).subscribe({
      next: () => this.notify(command === 'next' ? 'Skipped to next content.' : 'Returned to previous content.'),
      error: () => this.updateError.set(true)
    });
  }

  protected retryLoad(): void {
    this.facade.refresh().subscribe({ error: () => undefined });
  }

  protected hasIframes(): boolean {
    return this.facade.iframeOptions().length > 0;
  }

  protected truncate(value: string, max: number): string {
    if (value.length <= max) {
      return value;
    }
    return value.slice(0, max - 1) + '…';
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 3000 });
  }
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return 'never';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'never';
  }
  const now = new Date();
  const deltaMs = now.getTime() - date.getTime();
  if (deltaMs < 0) {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
  const deltaSec = Math.floor(deltaMs / 1000);
  if (deltaSec < 30) {
    return 'just now';
  }
  if (deltaSec < 60) {
    return `${deltaSec} seconds ago`;
  }
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) {
    return `${deltaMin} minute${deltaMin === 1 ? '' : 's'} ago`;
  }
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toISOString().slice(0, 16).replace('T', ' ');
}
