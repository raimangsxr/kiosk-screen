import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { DisplayConfigFacade } from './display-config.facade';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { KioskConfiguration } from '../../admin/admin-api.service';

interface DisplayConfigFormValue {
  name: string;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation: RotationAnimation;
  defaultAdRotationAnimation: RotationAnimation;
  defaultTopAnimationDurationMilliseconds: number;
  defaultAdAnimationDurationMilliseconds: number;
  inlineAdCount: number;
  remoteControlPollingSeconds: number;
  configuredEventDurationMinutes: number;
  isEnabled: boolean;
}

@Component({
  selector: 'app-display-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatDividerModule,
    MatSnackBarModule,
    PageHeaderComponent,
    AdminStateComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Display configuration"
      description="Kiosk-wide rotation timing, animation, inline ad count, event duration, and enabled state."
    />

    <form
      *ngIf="form"
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="display-config"
      novalidate
      aria-label="Display configuration form"
    >
      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-progress-bar *ngIf="loading()" mode="indeterminate" aria-label="Loading configuration" />
          <app-admin-state
            *ngIf="loadError() as error"
            type="error"
            title="Could not load configuration"
            [message]="error.message"
          />

          <div class="display-config__row">
            <mat-form-field appearance="outline">
              <mat-label>Configuration name</mat-label>
              <input matInput formControlName="name" required maxlength="120" autocomplete="off" />
              <mat-error *ngIf="form.controls.name.hasError('required')">Name is required.</mat-error>
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Top content defaults</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline">
              <mat-label>Top duration (seconds)</mat-label>
              <input matInput type="number" formControlName="defaultTopDurationSeconds" min="1" required />
              <mat-error *ngIf="form.controls.defaultTopDurationSeconds.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Top animation</mat-label>
              <mat-select formControlName="defaultTopRotationAnimation" required>
                <mat-option *ngFor="let animation of animations" [value]="animation">{{ animation }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Top animation duration (ms)</mat-label>
              <input
                matInput
                type="number"
                formControlName="defaultTopAnimationDurationMilliseconds"
                min="1"
                required
              />
              <mat-error *ngIf="form.controls.defaultTopAnimationDurationMilliseconds.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Ad defaults</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline">
              <mat-label>Ad duration (seconds)</mat-label>
              <input matInput type="number" formControlName="defaultAdDurationSeconds" min="1" required />
              <mat-error *ngIf="form.controls.defaultAdDurationSeconds.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Ad animation</mat-label>
              <mat-select formControlName="defaultAdRotationAnimation" required>
                <mat-option *ngFor="let animation of animations" [value]="animation">{{ animation }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Ad animation duration (ms)</mat-label>
              <input
                matInput
                type="number"
                formControlName="defaultAdAnimationDurationMilliseconds"
                min="1"
                required
              />
              <mat-error *ngIf="form.controls.defaultAdAnimationDurationMilliseconds.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Kiosk settings</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline">
              <mat-label>Inline ads per rotation</mat-label>
              <input matInput type="number" formControlName="inlineAdCount" min="1" required />
              <mat-error *ngIf="form.controls.inlineAdCount.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Remote control polling (seconds)</mat-label>
              <input matInput type="number" formControlName="remoteControlPollingSeconds" min="1" max="60" required />
              <mat-error *ngIf="form.controls.remoteControlPollingSeconds.hasError('required')">
                Polling interval is required.
              </mat-error>
              <mat-error *ngIf="form.controls.remoteControlPollingSeconds.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
              <mat-error *ngIf="form.controls.remoteControlPollingSeconds.hasError('min') || form.controls.remoteControlPollingSeconds.hasError('max')">
                Must be between 1 and 60 seconds.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Event duration (minutes)</mat-label>
              <input
                matInput
                type="number"
                formControlName="configuredEventDurationMinutes"
                min="1"
                required
              />
              <mat-error *ngIf="form.controls.configuredEventDurationMinutes.hasError('positiveInteger')">
                Must be a positive integer.
              </mat-error>
            </mat-form-field>
          </div>

          <mat-divider />
          <div class="display-config__row display-config__row--align-center">
            <mat-slide-toggle formControlName="isEnabled">Kiosk enabled</mat-slide-toggle>
            <span class="display-config__hint" *ngIf="!form.controls.isEnabled.value">
              When disabled, the kiosk will not run and readiness will block setup.
            </span>
          </div>

          <app-admin-state
            *ngIf="saveError() as error"
            type="error"
            title="Could not save configuration"
            [message]="error.message"
          />
        </mat-card-content>
        <mat-card-actions align="end">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || facade.saving() || loading()"
          >
            <mat-icon aria-hidden="true">save</mat-icon>
            {{ facade.saving() ? 'Saving…' : 'Save' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </form>
  `,
  styles: [
    `
      .display-config {
        margin-top: 16px;
        display: block;
      }
      .display-config__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin: 16px 0;
      }
      .display-config__row--align-center {
        align-items: center;
      }
      .display-config__section {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .display-config__hint {
        color: #92400e;
        font-size: 13px;
      }
      mat-form-field {
        width: 100%;
      }
    `
  ]
})
export class DisplayConfigComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(DisplayConfigFacade);
  protected readonly animations = ROTATION_ANIMATIONS;
  private readonly destroy$ = new Subject<void>();

  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);

  protected form: FormGroup<{
    name: FormControl<string>;
    defaultTopDurationSeconds: FormControl<number>;
    defaultAdDurationSeconds: FormControl<number>;
    defaultTopRotationAnimation: FormControl<RotationAnimation>;
    defaultAdRotationAnimation: FormControl<RotationAnimation>;
    defaultTopAnimationDurationMilliseconds: FormControl<number>;
    defaultAdAnimationDurationMilliseconds: FormControl<number>;
    inlineAdCount: FormControl<number>;
    remoteControlPollingSeconds: FormControl<number>;
    configuredEventDurationMinutes: FormControl<number>;
    isEnabled: FormControl<boolean>;
  }> | null = null;

  private initialSnapshot = '';

  ngOnInit(): void {
    this.buildForm();
    this.loading.set(true);
    this.facade.refresh().pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        if (config) {
          this.populate(config);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(this.facade.error());
        this.loading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasUnsavedChanges(): boolean {
    if (!this.form || this.facade.saving()) {
      return false;
    }
    return this.snapshot() !== this.initialSnapshot;
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as DisplayConfigFormValue;
    const payload: Omit<KioskConfiguration, 'id'> = {
      name: value.name.trim(),
      defaultTopDurationSeconds: value.defaultTopDurationSeconds,
      defaultAdDurationSeconds: value.defaultAdDurationSeconds,
      defaultTopRotationAnimation: value.defaultTopRotationAnimation,
      defaultAdRotationAnimation: value.defaultAdRotationAnimation,
      defaultTopAnimationDurationMilliseconds: value.defaultTopAnimationDurationMilliseconds,
      defaultAdAnimationDurationMilliseconds: value.defaultAdAnimationDurationMilliseconds,
      inlineAdCount: value.inlineAdCount,
      remoteControlPollingSeconds: value.remoteControlPollingSeconds,
      configuredEventDurationMinutes: value.configuredEventDurationMinutes,
      isEnabled: value.isEnabled
    };
    this.saveError.set(null);
    this.facade.save(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        if (config) {
          this.populate(config);
        }
        this.snackBar.open('Display configuration saved.', 'Dismiss', { duration: 3000 });
        this.markPristine();
      },
      error: () => {
        this.saveError.set(this.facade.error());
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      defaultTopDurationSeconds: this.fb.nonNullable.control(10, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      defaultAdDurationSeconds: this.fb.nonNullable.control(8, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      defaultTopRotationAnimation: this.fb.nonNullable.control<RotationAnimation>('fade', {
        validators: [Validators.required]
      }),
      defaultAdRotationAnimation: this.fb.nonNullable.control<RotationAnimation>('slide', {
        validators: [Validators.required]
      }),
      defaultTopAnimationDurationMilliseconds: this.fb.nonNullable.control(300, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      defaultAdAnimationDurationMilliseconds: this.fb.nonNullable.control(300, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      inlineAdCount: this.fb.nonNullable.control(1, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      remoteControlPollingSeconds: this.fb.nonNullable.control(3, {
        validators: [Validators.required, positiveInteger('positiveInteger'), Validators.min(1), Validators.max(60)]
      }),
      configuredEventDurationMinutes: this.fb.nonNullable.control(60, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      isEnabled: this.fb.nonNullable.control(true)
    });
  }

  private populate(config: KioskConfiguration): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      name: config.name,
      defaultTopDurationSeconds: config.defaultTopDurationSeconds,
      defaultAdDurationSeconds: config.defaultAdDurationSeconds,
      defaultTopRotationAnimation: config.defaultTopRotationAnimation,
      defaultAdRotationAnimation: config.defaultAdRotationAnimation,
      defaultTopAnimationDurationMilliseconds: config.defaultTopAnimationDurationMilliseconds,
      defaultAdAnimationDurationMilliseconds: config.defaultAdAnimationDurationMilliseconds,
      inlineAdCount: config.inlineAdCount,
      remoteControlPollingSeconds: config.remoteControlPollingSeconds,
      configuredEventDurationMinutes: config.configuredEventDurationMinutes,
      isEnabled: config.isEnabled
    });
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    if (!this.form) {
      return '';
    }
    const v = this.form.value as DisplayConfigFormValue;
    return JSON.stringify(v);
  }
}
