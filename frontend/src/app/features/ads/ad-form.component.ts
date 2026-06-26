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

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Observable, Subject, takeUntil } from 'rxjs';

import { AdsFacade } from './ads.facade';
import { AdItem, AdPayload } from '../../core/api/ads.api';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { FormPageComponent } from '../../shared/ui/form-page.component';
import { FileInputComponent } from '../../shared/ui/file-input.component';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface AdFormValue {
  advertiser: string;
  sourceReference: string;
  displayOrder: number | null;
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
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule,
    PageHeaderComponent,
    AdminStateComponent,
    FormPageComponent,
    FileInputComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      [title]="formTitle()"
      description="Upload an image ad for the bottom region. The advertiser field is optional and free-form."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="ad-form"
        novalidate
        aria-label="Ad form"
      >
        <app-form-page [loading]="loading()">
          @if (loadError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not load ad"
              [message]="error.message"
            />
          }

          <div class="ad-form__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Advertiser</mat-label>
              <input
                matInput
                formControlName="advertiser"
                maxlength="120"
                placeholder="Optional advertiser or sponsor name"
                autocomplete="off"
              />
              <mat-hint>Free-form; shows in the list. Optional.</mat-hint>
            </mat-form-field>
          </div>

          <div class="ad-form__row">
            <div class="ad-form__file">
              <span class="ad-form__file-label">Upload image</span>
              <app-file-input
                accept="image/*"
                buttonLabel="Choose image"
                ariaLabel="Choose an image file to upload"
                [existingFileName]="existingMediaName()"
                [multiple]="!adId()"
                [showPreview]="true"
                (fileSelected)="onFileSelected($event)"
                (filesSelected)="onFilesSelected($event)"
              />
            </div>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
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

          @if (adId()) {
            <div class="ad-form__row">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Display order</mat-label>
                <input matInput type="number" formControlName="displayOrder" min="1" />
                <mat-hint>Reorder by dragging rows in the ads list.</mat-hint>
                @if (form.controls.displayOrder.hasError('positiveInteger')) {
                  <mat-error>
                    Order must be a positive integer.
                  </mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Rotation time (seconds)</mat-label>
                <input matInput type="number" formControlName="durationSeconds" min="1" />
                <mat-hint>Leave empty to use kiosk default.</mat-hint>
              </mat-form-field>
            </div>
          }

          <div class="ad-form__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Animation</mat-label>
              <mat-select formControlName="rotationAnimation">
                <mat-option [value]="null">Default</mat-option>
                @for (animation of animations; track animation) {
                  <mat-option [value]="animation">
                    {{ animation }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Animation duration (ms)</mat-label>
              <input matInput type="number" formControlName="animationDurationMilliseconds" min="1" />
              <mat-hint>Leave empty to use kiosk default.</mat-hint>
            </mat-form-field>
          </div>

          <mat-divider />

          <div class="ad-form__toggle">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            @if (!form.controls.isActive.value) {
              <span class="ad-form__hint">
                Inactive ads are skipped during rotation.
              </span>
            }
          </div>

          @if (saveError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not save ad"
              [message]="error.message"
            />
          }

          <div formPageActions>
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
          </div>
        </app-form-page>
      </form>
    }
  `,
  styles: [
    `
      .ad-form {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .ad-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .ad-form__file {
        display: grid;
        gap: 6px;
      }
      .ad-form__file-label {
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }
      .ad-form__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .ad-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
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
  protected readonly selectedFiles = signal<readonly File[]>([]);
  protected readonly existingMedia = signal<string | null>(null);

  protected form: FormGroup<{
    advertiser: FormControl<string>;
    sourceReference: FormControl<string>;
    displayOrder: FormControl<number | null>;
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

  protected existingMediaName(): string | null {
    return this.existingMedia();
  }

  protected onFileSelected(file: File): void {
    this.selectedFile.set(file);
  }

  protected onFilesSelected(files: File[]): void {
    this.selectedFiles.set(files);
    this.selectedFile.set(files[0] ?? null);
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as AdFormValue;
    const uploadFiles = this.filesToUpload();
    const hasFile = uploadFiles.length > 0;
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

    const payload: AdPayload = {
      sourceReference: value.sourceReference.trim(),
      isActive: value.isActive,
      durationSeconds: value.durationSeconds,
      rotationAnimation: value.rotationAnimation,
      animationDurationMilliseconds: value.animationDurationMilliseconds,
      advertiser: value.advertiser.trim() || null
    };
    if (value.displayOrder !== null) {
      payload.displayOrder = value.displayOrder;
    }

    this.saveError.set(null);
    const id = this.adId() || undefined;
    const request$: Observable<unknown> = isCreate && uploadFiles.length > 1
      ? this.facade.uploadMany({ ...payload, displayOrder: undefined }, uploadFiles)
      : this.facade.save(payload, id, hasFile ? uploadFiles[0] : null);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Saved ad.`, 'Dismiss', { duration: 3000 });
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
      advertiser: this.fb.nonNullable.control(''),
      sourceReference: this.fb.nonNullable.control(''),
      displayOrder: this.fb.control<number | null>(null, {
        validators: [positiveInteger('positiveInteger')]
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
      advertiser: ad.advertiser ?? '',
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
      advertiser: v.advertiser,
      sourceReference: v.sourceReference,
      displayOrder: v.displayOrder,
      durationSeconds: v.durationSeconds,
      rotationAnimation: v.rotationAnimation,
      animationDurationMilliseconds: v.animationDurationMilliseconds,
      isActive: v.isActive,
      selectedFile: this.filesToUpload().map((file) => file.name).join(',')
    });
  }

  private filesToUpload(): readonly File[] {
    const files = this.selectedFiles();
    if (files.length) {
      return files;
    }
    const file = this.selectedFile();
    return file ? [file] : [];
  }
}
