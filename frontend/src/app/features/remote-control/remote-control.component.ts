import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { RemoteControlFacade } from './remote-control.facade';

@Component({
  selector: 'app-remote-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    AdminStateComponent,
    PageHeaderComponent
  ],
  template: `
    <main class="remote-control app-page" aria-label="Remote control">
      <app-page-header
        eyebrow="Hall"
        title="Remote control"
        description="Control what the running kiosk shows in the content region."
      />

      <mat-progress-bar *ngIf="facade.loading() || facade.saving()" mode="indeterminate" />

      <app-admin-state
        *ngIf="facade.error() as error"
        kind="error"
        title="Could not load remote control"
        [message]="error.message"
      />

      <app-admin-state
        *ngIf="updateError()"
        kind="error"
        title="Could not update remote control"
        message="Try again or choose another iframe."
      />

      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-icon mat-card-avatar aria-hidden="true">cast_connected</mat-icon>
          <mat-card-title>Content mode</mat-card-title>
          <mat-card-subtitle>Current mode: {{ facade.state()?.contentMode ?? 'unknown' }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="remote-control__actions">
            <button mat-flat-button color="primary" type="button" (click)="selectLoopMode()">
              <mat-icon aria-hidden="true">loop</mat-icon>
              Loop
            </button>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Iframe</mat-label>
              <mat-select
                [value]="facade.state()?.selectedContentId"
                (selectionChange)="selectIframe($event.value)"
                aria-label="Iframe content"
              >
                <mat-option *ngFor="let option of facade.iframeOptions()" [value]="option.id">
                  {{ option.title }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <p class="remote-control__options" *ngIf="facade.iframeOptions().length">
            Available iframes: {{ iframeOptionTitles() }}
          </p>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-icon mat-card-avatar aria-hidden="true">view_sidebar</mat-icon>
          <mat-card-title>Ads</mat-card-title>
          <mat-card-subtitle>{{ facade.state()?.adsVisible === false ? 'Hidden' : 'Visible' }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-slide-toggle
            [checked]="facade.state()?.adsVisible !== false"
            [disabled]="facade.saving()"
            (change)="setAdsVisible($event.checked)"
          >
            Show ads
          </mat-slide-toggle>
        </mat-card-content>
      </mat-card>
    </main>
  `,
  styles: [
    `
      .remote-control {
        display: grid;
        gap: 16px;
      }
      .remote-control__actions {
        display: grid;
        grid-template-columns: minmax(140px, max-content) minmax(220px, 420px);
        gap: 16px;
        align-items: center;
      }
      .remote-control__options {
        margin: 8px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      @media (max-width: 640px) {
        .remote-control__actions {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class RemoteControlComponent implements OnInit {
  protected readonly facade = inject(RemoteControlFacade);
  protected readonly updateError = signal(false);

  ngOnInit(): void {
    this.facade.refresh().subscribe({ error: () => undefined });
  }

  selectLoopMode(): void {
    this.updateError.set(false);
    this.facade.setLoopMode().subscribe({ error: () => this.updateError.set(true) });
  }

  selectIframe(contentId: string): void {
    this.updateError.set(false);
    this.facade.setIframeMode(contentId).subscribe({ error: () => this.updateError.set(true) });
  }

  setAdsVisible(visible: boolean): void {
    this.updateError.set(false);
    this.facade.setAdsVisible(visible).subscribe({ error: () => this.updateError.set(true) });
  }

  protected iframeOptionTitles(): string {
    return this.facade.iframeOptions().map((option) => option.title).join(', ');
  }
}
