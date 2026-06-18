import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormArray,
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { UsersFacade, AVAILABLE_ROLES, AvailableRole } from './users.facade';
import { UserRecord } from '../../admin/admin-api.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface UserFormValue {
  email: string;
  displayName: string;
  isActive: boolean;
  roles: AvailableRole[];
}

@Component({
  selector: 'app-user-form',
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
    MatCheckboxModule,
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
      description="Create or update an authorized account. Assign at least one existing role type."
    />

    <form *ngIf="form" [formGroup]="form" (ngSubmit)="submit()" class="user-form" novalidate aria-label="User form">
      <mat-card appearance="outlined">
        <mat-card-content>
          <mat-progress-bar *ngIf="loading()" mode="indeterminate" aria-label="Loading user" />
          <app-admin-state *ngIf="loadError() as error" type="error" title="Could not load user" [message]="error.message" />

          <div class="user-form__row">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required maxlength="255" autocomplete="off" />
              <mat-error *ngIf="form.controls.email.hasError('required')">Email is required.</mat-error>
              <mat-error *ngIf="form.controls.email.hasError('nonBlankString')">Email cannot be blank.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Display name</mat-label>
              <input matInput formControlName="displayName" required maxlength="120" autocomplete="off" />
              <mat-error *ngIf="form.controls.displayName.hasError('required')">Name is required.</mat-error>
              <mat-error *ngIf="form.controls.displayName.hasError('nonBlankString')">Name cannot be blank.</mat-error>
            </mat-form-field>
          </div>

          <mat-divider />
          <h3 class="user-form__section">Roles</h3>
          <div class="user-form__roles" formArrayName="roles">
            <mat-checkbox
              *ngFor="let role of availableRoles; let i = index"
              [checked]="rolesArray.at(i).value"
              (change)="toggleRole(i, $event.checked)"
            >
              {{ role }}
            </mat-checkbox>
          </div>

          <mat-divider />
          <div class="user-form__row user-form__row--align-center">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            <span class="user-form__hint" *ngIf="!form.controls.isActive.value">
              Inactive users cannot sign in.
            </span>
          </div>

          <app-admin-state *ngIf="saveError() as error" type="error" title="Could not save user" [message]="error.message" />
        </mat-card-content>
        <mat-card-actions align="end">
          <a mat-button routerLink="/admin/users">Cancel</a>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || facade.saving() || loading()">
            <mat-icon aria-hidden="true">save</mat-icon>
            {{ facade.saving() ? 'Saving…' : 'Save' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </form>
  `,
  styles: [
    `
      .user-form { margin-top: 16px; display: block; }
      .user-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .user-form__row--align-center { align-items: center; }
      .user-form__section {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin: 0 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .user-form__roles {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin: 8px 0 16px;
      }
      .user-form__hint { color: #92400e; font-size: 13px; }
      mat-form-field { width: 100%; }
    `
  ]
})
export class UserFormComponent implements OnInit, OnDestroy, DirtyFormAware {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(UsersFacade);
  protected readonly availableRoles = AVAILABLE_ROLES;
  private readonly destroy$ = new Subject<void>();

  protected readonly userId = signal<string>('');
  protected readonly loading = signal(false);
  protected readonly saveError = signal<{ code: string; message: string; category: string } | null>(null);
  protected readonly loadError = signal<{ code: string; message: string; category: string } | null>(null);

  protected form: FormGroup<{
    email: FormControl<string>;
    displayName: FormControl<string>;
    isActive: FormControl<boolean>;
    roles: FormArray<FormControl<boolean>>;
  }> | null = null;

  private initialSnapshot = '';

  get rolesArray(): FormArray<FormControl<boolean>> {
    return this.form!.controls.roles;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.userId.set(id);
    this.buildForm();

    if (id) {
      this.loading.set(true);
      this.facade.loadUser(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          const current = this.facade.current();
          if (current) {
            this.populate(current);
          } else {
            this.loadError.set(this.facade.error() ?? {
              code: 'not_found_user',
              message: 'User could not be found.',
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
    return this.userId() ? 'Edit user' : 'New user';
  }

  protected toggleRole(index: number, checked: boolean): void {
    this.rolesArray.at(index).setValue(checked);
  }

  submit(): void {
    if (!this.form || this.form.invalid) {
      this.form?.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const roles = raw.roles as boolean[];
    const selectedRoles: AvailableRole[] = this.availableRoles.filter((_, i) => roles[i]);
    if (selectedRoles.length === 0) {
      this.saveError.set({
        code: 'validation_missing_role',
        message: 'Select at least one role before saving.',
        category: 'validation'
      });
      return;
    }
    const payload = {
      email: raw.email.trim().toLowerCase(),
      displayName: raw.displayName.trim(),
      isActive: raw.isActive,
      roles: selectedRoles
    };
    this.saveError.set(null);
    const id = this.userId() || undefined;
    this.facade.save(payload, id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(`Saved ${payload.email}.`, 'Dismiss', { duration: 3000 });
        this.markPristine();
        this.router.navigate(['/admin/users']);
      },
      error: () => {
        this.saveError.set(this.facade.error());
      }
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group({
      email: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      displayName: this.fb.nonNullable.control('', {
        validators: [Validators.required, nonBlankString('nonBlankString')]
      }),
      isActive: this.fb.nonNullable.control(true),
      roles: this.fb.nonNullable.array(
        this.availableRoles.map(() => this.fb.nonNullable.control(false)),
        [Validators.required, this.atLeastOneRole()]
      )
    });
  }

  private atLeastOneRole() {
    return (control: { value: boolean[] | null }): { atLeastOneRole: true } | null => {
      const value = control.value;
      if (Array.isArray(value) && value.some((v) => v === true)) {
        return null;
      }
      return { atLeastOneRole: true };
    };
  }

  private populate(user: UserRecord): void {
    if (!this.form) {
      return;
    }
    this.form.patchValue({
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive
    });
    user.roles.forEach((role) => {
      const index = this.availableRoles.indexOf(role as AvailableRole);
      if (index >= 0) {
        this.rolesArray.at(index).setValue(true);
      }
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
    return JSON.stringify(this.form.getRawValue());
  }
}
