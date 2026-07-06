import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { DisplayConfigFacade } from './display-config.facade';
import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { AdminFormShellComponent } from '../../shared/ui/admin/admin-form-shell.component';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { KioskConfiguration } from '../../core/api/admin.api';

interface DisplayConfigFormValue {
  name: string;
  topRegionRatio: number;
  bottomRegionRatio: number;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation: RotationAnimation;
  defaultAdRotationAnimation: RotationAnimation;
  defaultTopAnimationDurationMilliseconds: number;
  defaultAdAnimationDurationMilliseconds: number;
  inlineAdCount: number;
  inlineAdItemBorderRadiusPx: number;
  inlineAdItemBorderWidthPx: number;
  inlineAdItemBorderColor: string;
  remoteControlPollingSeconds: number;
  videoEndDelaySeconds: number;
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
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule,
    AdminPageComponent,
    AdminStateComponent,
    AdminFormShellComponent
  ],
  template: `
    <app-admin-page
      eyebrow="Administration"
      title="Display configuration"
      description="Kiosk-wide rotation timing, animation, inline ad count, and enabled state."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="display-config"
        novalidate
        aria-label="Display configuration form"
      >
        <app-admin-form-shell [loading]="loading()">
          @if (loadError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not load configuration"
              [message]="error.message"
            />
          }

          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Configuration name</mat-label>
              <input matInput formControlName="name" required maxlength="120" autocomplete="off" />
              @if (form.controls.name.hasError('required')) {
                <mat-error>Name is required.</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Top content defaults</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Top duration (seconds)</mat-label>
              <input matInput type="number" formControlName="defaultTopDurationSeconds" min="1" required />
              @if (form.controls.defaultTopDurationSeconds.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Top animation</mat-label>
              <mat-select formControlName="defaultTopRotationAnimation" required>
                @for (animation of animations; track animation) {
                  <mat-option [value]="animation">{{ animation }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Top animation duration (ms)</mat-label>
              <input
                matInput
                type="number"
                formControlName="defaultTopAnimationDurationMilliseconds"
                min="1"
                required
              />
              @if (form.controls.defaultTopAnimationDurationMilliseconds.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Ad defaults</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Ad duration (seconds)</mat-label>
              <input matInput type="number" formControlName="defaultAdDurationSeconds" min="1" required />
              @if (form.controls.defaultAdDurationSeconds.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Ad animation</mat-label>
              <mat-select formControlName="defaultAdRotationAnimation" required>
                @for (animation of animations; track animation) {
                  <mat-option [value]="animation">{{ animation }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Ad animation duration (ms)</mat-label>
              <input
                matInput
                type="number"
                formControlName="defaultAdAnimationDurationMilliseconds"
                min="1"
                required
              />
              @if (form.controls.defaultAdAnimationDurationMilliseconds.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Region ratio</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Top region units</mat-label>
              <input matInput type="number" formControlName="topRegionRatio" min="1" max="20" required />
              <mat-hint>Numerator of the host grid (5 = default 5/6 split).</mat-hint>
              @if (form.controls.topRegionRatio.hasError('min') || form.controls.topRegionRatio.hasError('max')) {
                <mat-error>
                  Must be between 1 and 20.
                </mat-error>
              }
              @if (form.controls.topRegionRatio.hasError('required')) {
                <mat-error>
                  Required.
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Bottom region units</mat-label>
              <input matInput type="number" formControlName="bottomRegionRatio" min="1" max="20" required />
              <mat-hint>Denominator of the host grid (1 = default 5/6 split).</mat-hint>
              @if (form.controls.bottomRegionRatio.hasError('min') || form.controls.bottomRegionRatio.hasError('max')) {
                <mat-error>
                  Must be between 1 and 20.
                </mat-error>
              }
              @if (form.controls.bottomRegionRatio.hasError('required')) {
                <mat-error>
                  Required.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Ad strip item style</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Corner radius (px)</mat-label>
              <input matInput type="number" formControlName="inlineAdItemBorderRadiusPx" min="0" max="32" required />
              @if (form.controls.inlineAdItemBorderRadiusPx.hasError('min') || form.controls.inlineAdItemBorderRadiusPx.hasError('max')) {
                <mat-error>Must be between 0 and 32.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Border width (px)</mat-label>
              <input matInput type="number" formControlName="inlineAdItemBorderWidthPx" min="0" max="8" required />
              @if (form.controls.inlineAdItemBorderWidthPx.hasError('min') || form.controls.inlineAdItemBorderWidthPx.hasError('max')) {
                <mat-error>Must be between 0 and 8.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Border color</mat-label>
              <input matInput formControlName="inlineAdItemBorderColor" maxlength="32" autocomplete="off" />
              <mat-hint>CSS color, e.g. #ffffff</mat-hint>
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="display-config__section">Kiosk settings</h3>
          <div class="display-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Inline ads per rotation</mat-label>
              <input matInput type="number" formControlName="inlineAdCount" min="1" required />
              @if (form.controls.inlineAdCount.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Remote polling (seconds)</mat-label>
              <input matInput type="number" formControlName="remoteControlPollingSeconds" min="1" max="60" required />
              @if (form.controls.remoteControlPollingSeconds.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Video end delay (s)</mat-label>
              <input matInput type="number" formControlName="videoEndDelaySeconds" min="0" max="30" required />
              @if (form.controls.videoEndDelaySeconds.hasError('min') || form.controls.videoEndDelaySeconds.hasError('max')) {
                <mat-error>
                  Must be between 0 and 30.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <mat-divider />
          <div class="display-config__toggle">
            <mat-slide-toggle formControlName="isEnabled">Kiosk enabled</mat-slide-toggle>
            @if (!form.controls.isEnabled.value) {
              <span class="display-config__hint">
                When disabled, the kiosk will not run and the setup check will report a blocker.
              </span>
            }
          </div>

          @if (saveError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not save configuration"
              [message]="error.message"
            />
          }

          <div formShellActions>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || facade.saving() || loading()"
            >
              <mat-icon aria-hidden="true">save</mat-icon>
              {{ facade.saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </app-admin-form-shell>
      </form>
    }
  `,
  styles: [
    `
      .display-config {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .display-config__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin: 12px 0;
      }
      .display-config__section {
        margin: 0 0 4px;
        font: var(--mat-sys-title-small);
        letter-spacing: var(--mat-sys-title-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .display-config__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .display-config__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
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
    topRegionRatio: FormControl<number>;
    bottomRegionRatio: FormControl<number>;
    defaultTopDurationSeconds: FormControl<number>;
    defaultAdDurationSeconds: FormControl<number>;
    defaultTopRotationAnimation: FormControl<RotationAnimation>;
    defaultAdRotationAnimation: FormControl<RotationAnimation>;
    defaultTopAnimationDurationMilliseconds: FormControl<number>;
    defaultAdAnimationDurationMilliseconds: FormControl<number>;
    inlineAdCount: FormControl<number>;
    inlineAdItemBorderRadiusPx: FormControl<number>;
    inlineAdItemBorderWidthPx: FormControl<number>;
    inlineAdItemBorderColor: FormControl<string>;
    remoteControlPollingSeconds: FormControl<number>;
    videoEndDelaySeconds: FormControl<number>;
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
      topRegionRatio: value.topRegionRatio,
      bottomRegionRatio: value.bottomRegionRatio,
      defaultTopDurationSeconds: value.defaultTopDurationSeconds,
      defaultAdDurationSeconds: value.defaultAdDurationSeconds,
      defaultTopRotationAnimation: value.defaultTopRotationAnimation,
      defaultAdRotationAnimation: value.defaultAdRotationAnimation,
      defaultTopAnimationDurationMilliseconds: value.defaultTopAnimationDurationMilliseconds,
      defaultAdAnimationDurationMilliseconds: value.defaultAdAnimationDurationMilliseconds,
      inlineAdCount: value.inlineAdCount,
      inlineAdItemBorderRadiusPx: value.inlineAdItemBorderRadiusPx,
      inlineAdItemBorderWidthPx: value.inlineAdItemBorderWidthPx,
      inlineAdItemBorderColor: value.inlineAdItemBorderColor.trim(),
      remoteControlPollingSeconds: value.remoteControlPollingSeconds,
      videoEndDelaySeconds: value.videoEndDelaySeconds,
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
      topRegionRatio: this.fb.nonNullable.control(5, {
        validators: [Validators.required, Validators.min(1), Validators.max(20)]
      }),
      bottomRegionRatio: this.fb.nonNullable.control(1, {
        validators: [Validators.required, Validators.min(1), Validators.max(20)]
      }),
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
      inlineAdItemBorderRadiusPx: this.fb.nonNullable.control(5, {
        validators: [Validators.required, Validators.min(0), Validators.max(32)]
      }),
      inlineAdItemBorderWidthPx: this.fb.nonNullable.control(0, {
        validators: [Validators.required, Validators.min(0), Validators.max(8)]
      }),
      inlineAdItemBorderColor: this.fb.nonNullable.control('#ffffff', {
        validators: [Validators.required, Validators.maxLength(32)]
      }),
      remoteControlPollingSeconds: this.fb.nonNullable.control(3, {
        validators: [Validators.required, positiveInteger('positiveInteger'), Validators.min(1), Validators.max(60)]
      }),
      videoEndDelaySeconds: this.fb.nonNullable.control(2, {
        validators: [Validators.required, Validators.min(0), Validators.max(30)]
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
      topRegionRatio: config.topRegionRatio,
      bottomRegionRatio: config.bottomRegionRatio,
      defaultTopDurationSeconds: config.defaultTopDurationSeconds,
      defaultAdDurationSeconds: config.defaultAdDurationSeconds,
      defaultTopRotationAnimation: config.defaultTopRotationAnimation,
      defaultAdRotationAnimation: config.defaultAdRotationAnimation,
      defaultTopAnimationDurationMilliseconds: config.defaultTopAnimationDurationMilliseconds,
      defaultAdAnimationDurationMilliseconds: config.defaultAdAnimationDurationMilliseconds,
      inlineAdCount: config.inlineAdCount,
      inlineAdItemBorderRadiusPx: config.inlineAdItemBorderRadiusPx ?? 5,
      inlineAdItemBorderWidthPx: config.inlineAdItemBorderWidthPx ?? 0,
      inlineAdItemBorderColor: config.inlineAdItemBorderColor ?? '#ffffff',
      remoteControlPollingSeconds: config.remoteControlPollingSeconds,
      videoEndDelaySeconds: config.videoEndDelaySeconds ?? 2,
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
