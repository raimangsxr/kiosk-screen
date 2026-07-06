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

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Subject, takeUntil } from 'rxjs';

import { UsersFacade, AVAILABLE_ROLES, AvailableRole } from './users.facade';
import { UserRecord } from '../../core/api/admin.api';
import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { AdminFormShellComponent } from '../../shared/ui/admin/admin-form-shell.component';
import { MIN_PASSWORD_LENGTH, minPasswordLength, nonBlankString } from '../../shared/forms/admin-validators';
import { DirtyFormAware } from '../../shared/dirty-form.models';

interface UserFormValue {
  email: string;
  displayName: string;
  isActive: boolean;
  roles: AvailableRole[];
  password: string;
  resetPassword: string;
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
    MatSlideToggleModule,
    MatCheckboxModule,
    MatDividerModule,
    MatSnackBarModule,
    AdminPageComponent,
    AdminStateComponent,
    AdminFormShellComponent
  ],
  template: `
    <app-admin-page
      eyebrow="Administration"
      [title]="formTitle()"
      description="Create or update an authorized account. Assign at least one existing role type."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="user-form"
        novalidate
        aria-label="User form"
      >
        <app-admin-form-shell [loading]="loading()">
          @if (loadError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not load user"
              [message]="error.message"
            />
          }

          <div class="user-form__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required maxlength="255" autocomplete="off" />
              @if (form.controls.email.hasError('required')) {
                <mat-error>Email is required.</mat-error>
              }
              @if (form.controls.email.hasError('nonBlankString')) {
                <mat-error>Email cannot be blank.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Display name</mat-label>
              <input matInput formControlName="displayName" required maxlength="120" autocomplete="off" />
              @if (form.controls.displayName.hasError('required')) {
                <mat-error>Name is required.</mat-error>
              }
              @if (form.controls.displayName.hasError('nonBlankString')) {
                <mat-error>Name cannot be blank.</mat-error>
              }
            </mat-form-field>
          </div>

          @if (!userId()) {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Initial password</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                required
                autocomplete="new-password"
              />
              @if (form.controls.password.hasError('required')) {
                <mat-error>Initial password is required.</mat-error>
              }
              @if (form.controls.password.hasError('minPasswordLength')) {
                <mat-error>Password must be at least {{ minPasswordLength }} characters.</mat-error>
              }
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>New password (optional reset)</mat-label>
              <input
                matInput
                type="password"
                formControlName="resetPassword"
                autocomplete="new-password"
              />
              @if (form.controls.resetPassword.hasError('minPasswordLength')) {
                <mat-error>Password must be at least {{ minPasswordLength }} characters.</mat-error>
              }
            </mat-form-field>
          }

          <mat-divider />

          <section class="user-form__roles" formArrayName="roles">
            <h3 class="user-form__section">Roles</h3>
            <div class="user-form__role-list">
              @for (role of availableRoles; track role; let i = $index) {
                <mat-checkbox
                  [checked]="rolesArray.at(i).value"
                  (change)="toggleRole(i, $event.checked)"
                >
                  {{ role }}
                </mat-checkbox>
              }
            </div>
          </section>

          <mat-divider />

          <div class="user-form__toggle">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            @if (!form.controls.isActive.value) {
              <span class="user-form__hint">
                Inactive users cannot sign in.
              </span>
            }
          </div>

          @if (saveError(); as error) {
            <app-admin-state
              kind="error"
              title="Could not save user"
              [message]="error.message"
            />
          }

          <div formShellActions>
            <a mat-button routerLink="/admin/users">Cancel</a>
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
      .user-form {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .user-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .user-form__section {
        margin: 0 0 8px;
        font: var(--mat-sys-title-small);
        letter-spacing: var(--mat-sys-title-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .user-form__role-list {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      .user-form__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .user-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
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
  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
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
    password: FormControl<string>;
    resetPassword: FormControl<string>;
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
    this.facade
      .save(payload, id, {
        password: this.userId() ? undefined : raw.password,
        resetPassword: this.userId() && raw.resetPassword.trim() ? raw.resetPassword : undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
      ),
      password: this.fb.nonNullable.control('', {
        validators: [Validators.required, minPasswordLength()]
      }),
      resetPassword: this.fb.nonNullable.control('', {
        validators: [minPasswordLength()]
      })
    });
    if (this.userId()) {
      this.form.controls.password.disable();
    } else {
      this.form.controls.resetPassword.disable();
    }
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
