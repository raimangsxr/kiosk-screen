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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Observable, Subject, takeUntil } from 'rxjs';

import { ContentFacade } from './content.facade';
import { ContentItem, ContentItemRequest } from '../../core/api/content.api';
import { ROTATION_ANIMATIONS, RotationAnimation } from '../../shared/media-upload.models';
import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { AdminFormShellComponent } from '../../shared/ui/admin/admin-form-shell.component';
import { FileInputComponent } from '../../shared/ui/file-input.component';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { ContentAnimationSectionComponent } from './sections/content-animation-section.component';
import { ContentLifecycleSectionComponent } from './sections/content-lifecycle-section.component';
import { ContentActiveToggleSectionComponent } from './sections/content-active-toggle-section.component';

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
  isFixed: boolean;
  recurringEveryXIterations: number | null;
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
    MatDividerModule,
    MatSnackBarModule,
    AdminPageComponent,
    AdminStateComponent,
    AdminFormShellComponent,
    FileInputComponent,
    ContentAnimationSectionComponent,
    ContentLifecycleSectionComponent,
    ContentActiveToggleSectionComponent
  ],
  template: `
    <app-admin-page
      [title]="formTitle()"
      description="Configura el orden, la rotación, la animación y la disponibilidad de un elemento de la zona superior."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="content-form"
        novalidate
        aria-label="Formulario de contenido"
      >
        <app-admin-form-shell [loading]="loading()">
          @if (loadError(); as error) {
            <app-admin-state
              kind="error"
              title="No se pudo cargar el contenido"
              [message]="error.message"
            />
          }

          <div class="content-form__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="contentType" required>
                <mat-option value="photo">Foto</mat-option>
                <mat-option value="video">Vídeo</mat-option>
              </mat-select>
              @if (form.controls.contentType.hasError('required')) {
                <mat-error>El tipo es obligatorio.</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="content-form__file">
            <span class="content-form__file-label">Subir archivo</span>
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

          @if (contentId()) {
            <div class="content-form__row">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Orden de visualización</mat-label>
                <input matInput type="number" formControlName="displayOrder" min="1" />
                <mat-hint>Reordena arrastrando las filas en la lista de contenido.</mat-hint>
                @if (form.controls.displayOrder.hasError('positiveInteger')) {
                  <mat-error>
                    El orden debe ser un número entero positivo.
                  </mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Tiempo de rotación (segundos)</mat-label>
                <input matInput type="number" formControlName="durationSeconds" min="1" />
                <mat-hint>Déjalo vacío para usar el valor por defecto del quiosco.</mat-hint>
              </mat-form-field>
            </div>
          }

          <app-content-animation-section [form]="form" [animations]="animations" />

          <mat-divider />

          <app-content-lifecycle-section
            [form]="form"
            (isFixedChange)="onIsFixedChange()"
          />

          <mat-divider />

          <app-content-active-toggle-section [form]="form" />

          @if (saveError(); as error) {
            <app-admin-state
              kind="error"
              title="No se pudo guardar el contenido"
              [message]="error.message"
            />
          }

          <div formShellActions>
            <a mat-button routerLink="/admin/content">Cancelar</a>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || facade.saving() || loading()"
            >
              <mat-icon aria-hidden="true">save</mat-icon>
              {{ facade.saving() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </app-admin-form-shell>
      </form>
    }
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
    isFixed: FormControl<boolean>;
    recurringEveryXIterations: FormControl<number | null>;
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
    return this.contentId() ? 'Editar contenido' : 'Nuevo contenido';
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
      return this.contentId() ? 'Elegir vídeo' : 'Elegir vídeos';
    }
    if (type === 'photo') {
      return this.contentId() ? 'Elegir imagen' : 'Elegir imágenes';
    }
    return 'Elegir archivo';
  }

  protected fileLabel(): string {
    const type = this.form?.controls.contentType.value;
    if (type === 'video') {
      return this.contentId() ? 'Elige un archivo de vídeo para subir' : 'Elige archivos de vídeo para subir';
    }
    if (type === 'photo') {
      return this.contentId() ? 'Elige un archivo de imagen para subir' : 'Elige archivos de imagen para subir';
    }
    return 'Elige un archivo para subir';
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

  protected onIsFixedChange(): void {
    // FR-016 / spec 018: isFixed and recurringEveryXIterations are mutually
    // exclusive. When isFixed flips on, clear the cadence value so the user
    // can't submit a contradictory state.
    if (this.form?.controls.isFixed.value) {
      this.form.controls.recurringEveryXIterations.setValue(null);
    }
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
      animationDurationMilliseconds: value.animationDurationMilliseconds,
      isFixed: value.isFixed,
      recurringEveryXIterations: value.isFixed ? null : value.recurringEveryXIterations,
    };

    const uploadFiles = this.filesToUpload();
    if (this.requiresFile(value.contentType) && !uploadFiles.length && !value.sourceReference.trim() && !this.contentId()) {
      this.saveError.set({
        code: 'validation_missing_file',
        message: 'Elige una imagen, un vídeo o una URL de origen externa antes de guardar.',
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
        this.snackBar.open(`Contenido guardado.`, 'Cerrar', { duration: 3000 });
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
      isActive: this.fb.nonNullable.control(true),
      isFixed: this.fb.nonNullable.control(false),
      recurringEveryXIterations: this.fb.control<number | null>(null, {
        validators: [positiveInteger('positiveInteger')]
      })
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
      isActive: item.isActive,
      isFixed: item.isFixed ?? false,
      recurringEveryXIterations: item.recurringEveryXIterations ?? null,
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
      isFixed: v.isFixed,
      recurringEveryXIterations: v.recurringEveryXIterations,
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
    return existingTitle || 'Contenido';
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
