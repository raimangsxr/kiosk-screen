import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { EventConfiguration } from '../../core/api/event-config.api';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { FormPageComponent } from '../../shared/ui/form-page.component';
import { FileInputComponent } from '../../shared/ui/file-input.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EventConfigFacade } from './event-config.facade';

interface EventConfigFormValue {
  eventName: string;
  organizerName: string;
  eventDurationMinutes: number;
  removeLogo: boolean;
}

const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_LOGO_BYTES = 1024 * 1024;

@Component({
  selector: 'app-event-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    AdminStateComponent,
    FileInputComponent,
    FormPageComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Event configuration"
      description="Organizer, event name, logo, and operator session duration."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="event-config"
        novalidate
        aria-label="Event configuration form"
      >
        <app-form-page [loading]="facade.loading()">
          @if (facade.error(); as error) {
            <app-admin-state
              kind="error"
              title="Event configuration issue"
              [message]="error.message"
            />
          }

          <div class="event-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Organizer name</mat-label>
              <input matInput formControlName="organizerName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Event name</mat-label>
              <input matInput formControlName="eventName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Event duration (minutes)</mat-label>
              <input matInput type="number" formControlName="eventDurationMinutes" min="1" max="1440" required />
              @if (form.controls.eventDurationMinutes.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
              @if (form.controls.eventDurationMinutes.hasError('max')) {
                <mat-error>
                  Must be 1440 minutes or less.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <div class="event-config__logo">
            <app-file-input
              buttonLabel="Choose logo"
              ariaLabel="Choose organizer logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              [existingFileName]="configuration()?.organizerLogoMediaFile?.originalFilename ?? null"
              [showPreview]="true"
              (fileSelected)="onFileSelected($event)"
            />

            @if (configuration()?.organizerLogoMediaFile) {
              <mat-checkbox
                formControlName="removeLogo"
                [disabled]="selectedFile() !== null"
              >
                Remove logo
              </mat-checkbox>
            }
          </div>

          @if (fileError(); as error) {
            <app-admin-state
              kind="error"
              title="Logo rejected"
              [message]="error"
            />
          }

          <div formPageActions>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || facade.saving() || fileError() !== null"
            >
              <mat-icon aria-hidden="true">save</mat-icon>
              {{ facade.saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </app-form-page>
      </form>
    }
  `,
  styles: [
    `
      .event-config {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .event-config__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .event-config__logo {
        display: grid;
        gap: 12px;
        margin-top: 8px;
      }
    `
  ],
})
export class EventConfigComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly facade = inject(EventConfigFacade);
  private readonly destroy$ = new Subject<void>();

  protected readonly configuration = this.facade.configuration;
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);

  protected form: FormGroup<{
    eventName: FormControl<string>;
    organizerName: FormControl<string>;
    eventDurationMinutes: FormControl<number>;
    removeLogo: FormControl<boolean>;
  }> | null = null;

  private initialSnapshot = '';

  ngOnInit(): void {
    this.buildForm();
    this.facade.refresh().pipe(takeUntil(this.destroy$)).subscribe((configuration) => this.populate(configuration));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasUnsavedChanges(): boolean {
    return !!this.form && !this.facade.saving() && this.snapshot() !== this.initialSnapshot;
  }

  onFileSelected(file: File): void {
    this.fileError.set(null);
    this.selectedFile.set(null);
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      this.fileError.set('Unsupported file type. Allowed: PNG, JPG, WebP, SVG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.fileError.set('Logo file too large (max 1 MB).');
      return;
    }
    this.selectedFile.set(file);
    this.form?.controls.removeLogo.setValue(false);
  }

  submit(): void {
    if (!this.form || this.form.invalid || this.fileError()) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as EventConfigFormValue;
    this.facade.save(value, this.selectedFile(), value.removeLogo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (configuration) => {
        this.selectedFile.set(null);
        this.populate(configuration);
        this.snackBar.open('Event configuration saved.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      eventName: this.fb.nonNullable.control('', { validators: [Validators.maxLength(255)] }),
      organizerName: this.fb.nonNullable.control('', { validators: [Validators.maxLength(255)] }),
      eventDurationMinutes: this.fb.nonNullable.control(240, {
        validators: [Validators.required, positiveInteger('positiveInteger'), Validators.max(1440)]
      }),
      removeLogo: this.fb.nonNullable.control(false)
    });
  }

  private populate(configuration: EventConfiguration): void {
    this.form?.patchValue({
      eventName: configuration.eventName,
      organizerName: configuration.organizerName,
      eventDurationMinutes: configuration.eventDurationMinutes,
      removeLogo: false
    });
    this.markPristine();
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }

  private snapshot(): string {
    return JSON.stringify({
      form: this.form?.value ?? null,
      selectedFile: this.selectedFile()?.name ?? null,
    });
  }
}
