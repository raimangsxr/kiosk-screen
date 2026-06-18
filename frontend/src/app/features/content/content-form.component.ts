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

import { ContentFacade } from './content.facade';
import { ContentItem, ContentItemRequest } from '../../content/content-api.service';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { positiveInteger, nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

type ContentType = 'photo' | 'video' | 'embedded_web';

interface ContentFormValue {
  title: string;
  contentType: ContentType;
  sourceReference: string;
  displayOrder: number;
  durationSeconds: number | null;
  rotationAnimation: RotationAnimation | null;
  animationDurationMilliseconds: number | null;
  isActive: boolean;
}

@Component({
  selector: 'app-content-form',
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
      description="Configure ordering, rotation, animation, and availability for one top-region item."
    />

    <form
      *ngIf="form"
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="content-form"
      novalidate
      aria-label="Content item form"
    >
      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-progress-bar *ngIf="loading()" mode="indeterminate" aria-label="Loading content" />
          <app-admin-state
            *ngIf="loadError() as error"
            type="error"
            title="Could not load content"
            [message]="error.message"
          />

          <div class="content-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" required maxlength="120" autocomplete="off" />
              <mat-error *ngIf="form.controls.title.hasError('required')">Title is required.</mat-error>
              <mat-error *ngIf="form.controls.title.hasError('nonBlankString')">
                Title cannot be blank.
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="contentType" required>
                <mat-option value="photo">Photo</mat-option>
                <mat-option value="video">Video</mat-option>
                <mat-option value="embedded_web">Embedded web (iframe)</mat-option>
              </mat-select>
              <mat-error *ngIf="form.controls.contentType.hasError('required')">Type is required.</mat-error>
            </mat-form-field>
          </div>

          <div *ngIf="form.controls.contentType.value === 'embedded_web'" class="content-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Iframe source URL</mat-label>
              <input
                matInput
                formControlName="sourceReference"
                placeholder="https://example.com/embed"
                autocomplete="off"
              />
              <mat-hint>Must be on an approved domain allow-list.</mat-hint>
              <mat-error *ngIf="form.controls.sourceReference.hasError('required')">
                Iframe source is required.
              </mat-error>
            </mat-form-field>
          </div>

          <div *ngIf="form.controls.contentType.value !== 'embedded_web'" class="content-form__row">
            <label class="content-form__file">
              <span class="content-form__file-label">Upload file</span>
              <input
                type="file"
                [accept]="fileAccept()"
                (change)="selectFile($event)"
                [attr.aria-label]="fileLabel()"
              />
              <span class="content-form__file-name" *ngIf="selectedFileName() as name">
                {{ name }}
              </span>
              <span class="content-form__file-name" *ngIf="!selectedFileName() && existingMediaName() as name">
                Current file: {{ name }}
              </span>
            </label>
          </div>

          <div class="content-form__row">
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

          <div class="content-form__row">
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

          <div class="content-form__row content-form__row--align-center">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            <span class="content-form__hint" *ngIf="!form.controls.isActive.value">
              Inactive items are skipped during rotation.
            </span>
          </div>

          <app-admin-state
            *ngIf="saveError() as error"
            type="error"
            title="Could not save content"
            [message]="error.message"
          />
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/admin/content">Cancel</a>
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
      .content-form {
        margin-top: 16px;
        display: block;
      }
      .content-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .content-form__row--align-center {
        align-items: center;
      }
      .content-form__file {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 14px;
      }
      .content-form__file-label {
        font-weight: 600;
      }
      .content-form__file-name {
        color: #475569;
        font-size: 13px;
      }
      .content-form__hint {
        color: #92400e;
        font-size: 13px;
      }
      mat-form-field {
        width: 100%;
      }
    `
  ]
})
export class ContentFormComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(ContentFacade);
  protected readonly animations = ROTATION_ANIMATIONS;
  private readonly destroy$ = new Subject<void>();

  protected readonly contentId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly existingMedia = signal<string | null>(null);

  protected form: FormGroup<{
    title: FormControl<string>;
    contentType: FormControl<ContentType>;
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
    this.contentId.set(id);
    this.buildForm();

    if (id) {
      this.loading.set(true);
      this.facade.load(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (item) => {
          this.populate(item);
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
    return this.contentId() ? 'Edit content item' : 'New content item';
  }

  protected fileAccept(): string {
    const type = this.form?.controls.contentType.value;
    if (type === 'video') {
      return 'video/*';
    }
    if (type === 'photo') {
      return 'image/*';
    }
    return '';
  }

  protected fileLabel(): string {
    const type = this.form?.controls.contentType.value;
    if (type === 'video') {
      return 'Choose a video file to upload';
    }
    if (type === 'photo') {
      return 'Choose an image file to upload';
    }
    return 'Choose a file to upload';
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
    const value = this.form.value as ContentFormValue;
    const payload: ContentItemRequest = {
      title: value.title.trim(),
      contentType: value.contentType,
      sourceReference: value.sourceReference.trim(),
      mediaFile: null,
      displayOrder: value.displayOrder,
      isActive: value.isActive,
      durationSeconds: value.durationSeconds,
      rotationAnimation: value.rotationAnimation,
      animationDurationMilliseconds: value.animationDurationMilliseconds
    };

    if (this.requiresFile(value.contentType) && !this.selectedFile() && !value.sourceReference.trim() && !this.contentId()) {
      this.saveError.set({
        code: 'validation_missing_file',
        message: 'Choose an image, video, or external source URL before saving.',
        category: 'validation'
      });
      return;
    }

    this.saveError.set(null);
    const id = this.contentId() || undefined;

    let request$;
    if (value.contentType === 'embedded_web') {
      request$ = this.facade.saveIframe(payload, id);
    } else if (this.selectedFile()) {
      request$ = this.facade.upload(payload, this.selectedFile() as File, id);
    } else {
      request$ = this.facade.save(payload, id);
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Saved ${value.title}.`, 'Dismiss', { duration: 3000 });
        this.markPristine();
        this.router.navigate(['/admin/content']);
      },
      error: () => {
        this.saveError.set(this.facade.error());
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      title: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      contentType: this.fb.nonNullable.control<ContentType>('photo', {
        validators: [Validators.required]
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

    this.form.controls.contentType.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type) => {
      const source = this.form?.controls.sourceReference;
      if (!source) {
        return;
      }
      source.setValidators(type === 'embedded_web' ? [Validators.required] : []);
      source.updateValueAndValidity();
    });
  }

  private populate(item: ContentItem): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      title: item.title,
      contentType: item.contentType,
      sourceReference: item.sourceReference,
      displayOrder: item.displayOrder,
      durationSeconds: item.durationSeconds ?? null,
      rotationAnimation: item.rotationAnimation ?? null,
      animationDurationMilliseconds: item.animationDurationMilliseconds ?? null,
      isActive: item.isActive
    });
    this.existingMedia.set(item.mediaFile?.originalFilename ?? null);
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    if (!this.form) {
      return '';
    }
    const v = this.form.value as ContentFormValue;
    return JSON.stringify({
      title: v.title,
      contentType: v.contentType,
      sourceReference: v.sourceReference,
      displayOrder: v.displayOrder,
      durationSeconds: v.durationSeconds,
      rotationAnimation: v.rotationAnimation,
      animationDurationMilliseconds: v.animationDurationMilliseconds,
      isActive: v.isActive,
      selectedFile: this.selectedFile()?.name ?? ''
    });
  }

  private requiresFile(type: ContentType): boolean {
    return type === 'photo' || type === 'video';
  }
}
