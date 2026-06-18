import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

import { AdsFacade } from './ads.facade';
import { AdItem } from '../../ads/ads-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { positiveInteger, nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface AdFormValue {
  clientId: string;
  label: string;
  sourceReference: string;
  displayOrder: number;
  durationSeconds: number | null;
  rotationAnimation: RotationAnimation | null;
  animationDurationMilliseconds: number | null;
  isActive: boolean;
}

@Component({
  selector: 'app-ad-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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
      [title]="formTitle()"
      description="Upload an image ad and bind it to an active client for the bottom region."
    />

    <form
      *ngIf="form"
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="ad-form"
      novalidate
      aria-label="Ad form"
    >
      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-progress-bar *ngIf="loading()" mode="indeterminate" aria-label="Loading ad" />
          <app-admin-state
            *ngIf="loadError() as error"
            type="error"
            title="Could not load ad"
            [message]="error.message"
          />

          <div class="ad-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Client</mat-label>
              <mat-select formControlName="clientId" required>
                <mat-option value="">Select a client</mat-option>
                <mat-option
                  *ngFor="let client of facade.clients()"
                  [value]="client.id"
                  [disabled]="!client.isActive"
                >
                  {{ client.name }} ({{ client.isActive ? 'active' : 'inactive' }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="form.controls.clientId.hasError('required')">Client is required.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Label</mat-label>
              <input matInput formControlName="label" required maxlength="120" autocomplete="off" />
              <mat-error *ngIf="form.controls.label.hasError('required')">Label is required.</mat-error>
              <mat-error *ngIf="form.controls.label.hasError('nonBlankString')">Label cannot be blank.</mat-error>
            </mat-form-field>
          </div>

          <div class="ad-form__row">
            <label class="ad-form__file">
              <span class="ad-form__file-label">Upload image</span>
              <input
                type="file"
                accept="image/*"
                (change)="selectFile($event)"
                aria-label="Choose an image file to upload"
              />
              <span class="ad-form__file-name" *ngIf="selectedFileName() as name">{{ name }}</span>
              <span class="ad-form__file-name" *ngIf="!selectedFileName() && existingMediaName() as name">
                Current file: {{ name }}
              </span>
            </label>

            <mat-form-field appearance="outline">
              <mat-label>External source URL (optional)</mat-label>
              <input
                matInput
                formControlName="sourceReference"
                placeholder="https://example.com/ad.jpg"
                autocomplete="off"
              />
              <mat-hint>Use when you do not upload a file.</mat-hint>
            </mat-form-field>
          </div>

          <div class="ad-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Display order</mat-label>
              <input matInput type="number" formControlName="displayOrder" min="1" required />
              <mat-error *ngIf="form.controls.displayOrder.hasError('required')">Order is required.</mat-error>
              <mat-error *ngIf="form.controls.displayOrder.hasError('positiveInteger')">
                Order must be a positive integer.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Rotation time (seconds)</mat-label>
              <input matInput type="number" formControlName="durationSeconds" min="1" />
              <mat-hint>Leave empty to use kiosk default.</mat-hint>
            </mat-form-field>
          </div>

          <div class="ad-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Animation</mat-label>
              <mat-select formControlName="rotationAnimation">
                <mat-option [value]="null">Default</mat-option>
                <mat-option *ngFor="let animation of animations" [value]="animation">
                  {{ animation }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Animation duration (ms)</mat-label>
              <input matInput type="number" formControlName="animationDurationMilliseconds" min="1" />
              <mat-hint>Leave empty to use kiosk default.</mat-hint>
            </mat-form-field>
          </div>

          <mat-divider />

          <div class="ad-form__row ad-form__row--align-center">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            <span class="ad-form__hint" *ngIf="!form.controls.isActive.value">
              Inactive ads are skipped during rotation.
            </span>
          </div>

          <app-admin-state
            *ngIf="saveError() as error"
            type="error"
            title="Could not save ad"
            [message]="error.message"
          />
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/admin/ads">Cancel</a>
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
      .ad-form {
        margin-top: 16px;
        display: block;
      }
      .ad-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .ad-form__row--align-center {
        align-items: center;
      }
      .ad-form__file {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
      }
      .ad-form__file-label {
        font-weight: 600;
      }
      .ad-form__file-name {
        color: #475569;
        font-size: 13px;
      }
      .ad-form__hint {
        color: #92400e;
        font-size: 13px;
      }
      mat-form-field {
        width: 100%;
      }
    `
  ]
})
export class AdFormComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(AdsFacade);
  protected readonly animations = ROTATION_ANIMATIONS;
  private readonly destroy$ = new Subject<void>();

  protected readonly adId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly existingMedia = signal<string | null>(null);

  protected form: FormGroup<{
    clientId: FormControl<string>;
    label: FormControl<string>;
    sourceReference: FormControl<string>;
    displayOrder: FormControl<number>;
    durationSeconds: FormControl<number | null>;
    rotationAnimation: FormControl<RotationAnimation | null>;
    animationDurationMilliseconds: FormControl<number | null>;
    isActive: FormControl<boolean>;
  }> | null = null;

  private initialSnapshot = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.adId.set(id);
    this.buildForm();
    this.facade.loadClients().pipe(takeUntil(this.destroy$)).subscribe();

    if (id) {
      this.loading.set(true);
      this.facade.loadAd(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (ad) => {
          this.populate(ad);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(this.facade.error());
          this.loading.set(false);
        }
      });
    } else {
      this.markPristine();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.facade.clearCurrent();
  }

  hasUnsavedChanges(): boolean {
    if (!this.form || this.facade.saving()) {
      return false;
    }
    return this.snapshot() !== this.initialSnapshot;
  }

  protected formTitle(): string {
    return this.adId() ? 'Edit ad' : 'New ad';
  }

  protected selectedFileName(): string | null {
    return this.selectedFile()?.name ?? null;
  }

  protected existingMediaName(): string | null {
    return this.existingMedia();
  }

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as AdFormValue;
    const hasFile = !!this.selectedFile();
    const hasSource = value.sourceReference.trim().length > 0;
    const isCreate = !this.adId();

    if (isCreate && !hasFile && !hasSource) {
      this.saveError.set({
        code: 'validation_missing_file',
        message: 'Choose an image or external source URL before saving.',
        category: 'validation'
      });
      return;
    }

    const payload = {
      clientId: value.clientId,
      label: value.label.trim(),
      sourceReference: value.sourceReference.trim(),
      displayOrder: value.displayOrder,
      isActive: value.isActive,
      durationSeconds: value.durationSeconds,
      rotationAnimation: value.rotationAnimation,
      animationDurationMilliseconds: value.animationDurationMilliseconds
    };

    this.saveError.set(null);
    const id = this.adId() || undefined;
    this.facade
      .save(payload, id, hasFile ? this.selectedFile() : null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Saved ${value.label}.`, 'Dismiss', { duration: 3000 });
          this.markPristine();
          this.router.navigate(['/admin/ads']);
        },
        error: () => {
          this.saveError.set(this.facade.error());
        }
      });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      clientId: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      label: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      sourceReference: this.fb.nonNullable.control(''),
      displayOrder: this.fb.nonNullable.control(1, {
        validators: [Validators.required, positiveInteger('positiveInteger')]
      }),
      durationSeconds: this.fb.control<number | null>(null),
      rotationAnimation: this.fb.control<RotationAnimation | null>(null),
      animationDurationMilliseconds: this.fb.control<number | null>(null),
      isActive: this.fb.nonNullable.control(true)
    });
  }

  private populate(ad: AdItem): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      clientId: ad.clientId,
      label: ad.label,
      sourceReference: ad.sourceReference,
      displayOrder: ad.displayOrder,
      durationSeconds: ad.durationSeconds ?? null,
      rotationAnimation: ad.rotationAnimation ?? null,
      animationDurationMilliseconds: ad.animationDurationMilliseconds ?? null,
      isActive: ad.isActive
    });
    this.existingMedia.set(ad.mediaFile?.originalFilename ?? null);
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    if (!this.form) {
      return '';
    }
    const v = this.form.value as AdFormValue;
    return JSON.stringify({
      clientId: v.clientId,
      label: v.label,
      sourceReference: v.sourceReference,
      displayOrder: v.displayOrder,
      durationSeconds: v.durationSeconds,
      rotationAnimation: v.rotationAnimation,
      animationDurationMilliseconds: v.animationDurationMilliseconds,
      isActive: v.isActive,
      selectedFile: this.selectedFile()?.name ?? ''
    });
  }
}
