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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { ClientsFacade } from './clients.facade';
import { Client } from '../../ads/ads-api.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface ClientFormValue {
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-client-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
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
      description="A client owns one or more ads. Deactivate instead of deleting when ads depend on it."
    />

    <form
      *ngIf="form"
      [formGroup]="form"
      (ngSubmit)="submit()"
      class="client-form"
      novalidate
      aria-label="Client form"
    >
      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-progress-bar *ngIf="loading()" mode="indeterminate" aria-label="Loading client" />
          <app-admin-state
            *ngIf="loadError() as error"
            type="error"
            title="Could not load client"
            [message]="error.message"
          />

          <div class="client-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Client name</mat-label>
              <input matInput formControlName="name" required maxlength="120" autocomplete="off" />
              <mat-hint>Visible on the ad lists.</mat-hint>
              <mat-error *ngIf="form.controls.name.hasError('required')">Name is required.</mat-error>
              <mat-error *ngIf="form.controls.name.hasError('nonBlankString')">Name cannot be blank.</mat-error>
            </mat-form-field>
          </div>

          <mat-divider />

          <div class="client-form__row client-form__row--align-center">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            <span class="client-form__hint" *ngIf="!form.controls.isActive.value">
              Inactive clients keep their ads but are skipped during rotation.
            </span>
          </div>

          <app-admin-state
            *ngIf="saveError() as error"
            type="error"
            title="Could not save client"
            [message]="error.message"
          />
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/admin/clients">Cancel</a>
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
      .client-form {
        margin-top: 16px;
        display: block;
      }
      .client-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .client-form__row--align-center {
        align-items: center;
      }
      .client-form__hint {
        color: #92400e;
        font-size: 13px;
      }
      mat-form-field {
        width: 100%;
      }
    `
  ]
})
export class ClientFormComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(ClientsFacade);
  private readonly destroy$ = new Subject<void>();

  protected readonly clientId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);

  protected form: FormGroup<{
    name: FormControl<string>;
    isActive: FormControl<boolean>;
  }> | null = null;

  private initialSnapshot = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.clientId.set(id);
    this.buildForm();

    if (id) {
      this.loading.set(true);
      this.facade.loadClient(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const current = this.facade.current();
          if (current) {
            this.populate(current);
          } else {
            this.loadError.set(this.facade.error() ?? {
              code: 'not_found_client',
              message: 'Client could not be found.',
              category: 'not-found'
            });
          }
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
    return this.clientId() ? 'Edit client' : 'New client';
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const value = this.form.value as ClientFormValue;
    const payload: Omit<Client, 'id'> = {
      name: value.name.trim(),
      isActive: value.isActive
    };
    this.saveError.set(null);
    const id = this.clientId() || undefined;
    this.facade
      .save(payload, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open(`Saved ${value.name}.`, 'Dismiss', { duration: 3000 });
          this.markPristine();
          this.router.navigate(['/admin/clients']);
        },
        error: () => {
          this.saveError.set(this.facade.error());
        }
      });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      isActive: this.fb.nonNullable.control(true)
    });
  }

  private populate(client: Client): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      name: client.name,
      isActive: client.isActive
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
    const v = this.form.value as ClientFormValue;
    return JSON.stringify({ name: v.name, isActive: v.isActive });
  }
}
