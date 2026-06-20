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

import { ContentFacade } from './content.facade';
import { ContentItem, ContentItemRequest } from '../../core/api/content.api';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { FormPageComponent } from '../../shared/ui/form-page.component';
import { FileInputComponent } from '../../shared/ui/file-input.component';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

type ContentType = 'photo' | 'video';

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
      <app-form-page [loading]="loading()">
        <app-admin-state
          *ngIf="loadError() as error"
          kind="error"
          title="Could not load content"
          [message]="error.message"
        />

        <div class="content-form__row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Type</mat-label>
            <mat-select formControlName="contentType" required>
              <mat-option value="photo">Photo</mat-option>
              <mat-option value="video">Video</mat-option>
            </mat-select>
            <mat-error *ngIf="form.controls.contentType.hasError('required')">Type is required.</mat-error>
          </mat-form-field>
        </div>

        <div class="content-form__file">
          <span class="content-form__file-label">Upload file</span>
          <app-file-input
            [accept]="fileAccept()"
            [buttonLabel]="fileButtonLabel()"
            [ariaLabel]="fileLabel()"
            [existingFileName]="existingMediaName()"
            [multiple]="!contentId()"
            [showPreview]="isPhoto()"
            (fileSelected)="onFileSelected($event)"
            (filesSelected)="onFilesSelected($event)"
          />
        </div>

        <div class="content-form__row" *ngIf="contentId()">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Display order</mat-label>
            <input matInput type="number" formControlName="displayOrder" min="1" />
            <mat-hint>Reorder by dragging rows in the content list.</mat-hint>
            <mat-error *ngIf="form.controls.displayOrder.hasError('positiveInteger')">
              Order must be a positive integer.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Rotation time (seconds)</mat-label>
            <input matInput type="number" formControlName="durationSeconds" min="1" />
            <mat-hint>Leave empty to use kiosk default.</mat-hint>
          </mat-form-field>
        </div>

        <div class="content-form__row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Animation</mat-label>
            <mat-select formControlName="rotationAnimation">
              <mat-option [value]="null">Default</mat-option>
              <mat-option *ngFor="let animation of animations" [value]="animation">
                {{ animation }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Animation duration (ms)</mat-label>
            <input matInput type="number" formControlName="animationDurationMilliseconds" min="1" />
            <mat-hint>Leave empty to use kiosk default.</mat-hint>
          </mat-form-field>
        </div>

        <mat-divider />

        <div class="content-form__toggle">
          <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
          <span class="content-form__hint" *ngIf="!form.controls.isActive.value">
            Inactive items are skipped during rotation.
          </span>
        </div>

        <app-admin-state
          *ngIf="saveError() as error"
          kind="error"
          title="Could not save content"
          [message]="error.message"
        />

        <div formPageActions>
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
        </div>
      </app-form-page>
    </form>
  `,
  styles: [
    `
      .content-form {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .content-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .content-form__file {
        display: grid;
        gap: 6px;
      }
      .content-form__file-label {
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }
      .content-form__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .content-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
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
  protected readonly selectedFiles = signal<readonly File[]>([]);
  protected readonly existingMedia = signal<string | null>(null);

  protected form: FormGroup<{
    title: FormControl<string>;
    contentType: FormControl<ContentType>;
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

  protected fileButtonLabel(): string {
    const type = this.form?.controls.contentType.value;
    if (type === 'video') {
      return this.contentId() ? 'Choose video' : 'Choose videos';
    }
    if (type === 'photo') {
      return this.contentId() ? 'Choose image' : 'Choose images';
    }
    return 'Choose file';
  }

  protected fileLabel(): string {
    const type = this.form?.controls.contentType.value;
    if (type === 'video') {
      return this.contentId() ? 'Choose a video file to upload' : 'Choose video files to upload';
    }
    if (type === 'photo') {
      return this.contentId() ? 'Choose an image file to upload' : 'Choose image files to upload';
    }
    return 'Choose a file to upload';
  }

  protected existingMediaName(): string | null {
    return this.existingMedia();
  }

  protected isPhoto(): boolean {
    return this.form?.controls.contentType.value === 'photo';
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
    const value = this.form.value as ContentFormValue;
    const payload: ContentItemRequest = {
      title: this.deriveTitle(value),
      contentType: value.contentType,
      sourceReference: value.sourceReference.trim(),
      mediaFile: null,
      displayOrder: value.displayOrder ?? undefined,
      isActive: value.isActive,
      durationSeconds: value.durationSeconds,
      rotationAnimation: value.rotationAnimation,
      animationDurationMilliseconds: value.animationDurationMilliseconds
    };

    const uploadFiles = this.filesToUpload();
    if (this.requiresFile(value.contentType) && !uploadFiles.length && !value.sourceReference.trim() && !this.contentId()) {
      this.saveError.set({
        code: 'validation_missing_file',
        message: 'Choose an image, video, or external source URL before saving.',
        category: 'validation'
      });
      return;
    }

    this.saveError.set(null);
    const id = this.contentId() || undefined;

    let request$: Observable<unknown>;
    if (!id && uploadFiles.length > 1) {
      request$ = this.facade.uploadMany(
        (file) => ({
          ...payload,
          title: this.titleFromFileName(file.name),
          displayOrder: undefined
        }),
        uploadFiles
      );
    } else if (uploadFiles.length) {
      request$ = this.facade.upload(payload, uploadFiles[0], id);
    } else {
      request$ = this.facade.save(payload, id);
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Saved content.`, 'Dismiss', { duration: 3000 });
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
      title: this.fb.nonNullable.control(''),
      contentType: this.fb.nonNullable.control<ContentType>('photo', {
        validators: [Validators.required]
      }),
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
      selectedFile: this.filesToUpload().map((file) => file.name).join(',')
    });
  }

  private requiresFile(type: ContentType): boolean {
    return type === 'photo' || type === 'video';
  }

  private deriveTitle(value: ContentFormValue): string {
    const selectedName = this.filesToUpload()[0]?.name;
    if (selectedName) {
      return this.titleFromFileName(selectedName);
    }

    const source = value.sourceReference.trim();
    if (source) {
      return this.titleFromSource(source);
    }

    const existingTitle = value.title.trim();
    return existingTitle || 'Content item';
  }

  private titleFromFileName(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').trim() || fileName;
  }

  private titleFromSource(source: string): string {
    try {
      const url = new URL(source);
      return url.hostname || source;
    } catch {
      return source;
    }
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
