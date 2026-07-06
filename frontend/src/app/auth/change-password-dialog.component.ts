import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { adaptApiError } from '../core/errors/api-error-adapter';
import { AuthService } from '../core/auth/auth.service';
import { MIN_PASSWORD_LENGTH, minPasswordLength } from '../shared/forms/admin-validators';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Change password</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="change-password-dialog">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Current password</mat-label>
        <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
        @if (form.controls.currentPassword.hasError('required')) {
          <mat-error>Current password is required.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>New password</mat-label>
        <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
        @if (form.controls.newPassword.hasError('required')) {
          <mat-error>New password is required.</mat-error>
        }
        @if (form.controls.newPassword.hasError('minPasswordLength')) {
          <mat-error>Password must be at least {{ minPasswordLength }} characters.</mat-error>
        }
      </mat-form-field>

      @if (errorMessage()) {
        <p class="change-password-dialog__error" role="alert">{{ errorMessage() }}</p>
      }
    </form>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()" (click)="submit()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </div>
  `,
  styles: [
    `
      .change-password-dialog {
        display: grid;
        gap: 12px;
        min-width: min(420px, 90vw);
        padding-top: 8px;
      }
      mat-form-field {
        width: 100%;
      }
      .change-password-dialog__error {
        margin: 0;
        color: var(--mat-sys-error);
        font: var(--mat-sys-body-small);
      }
    `
  ]
})
export class ChangePasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent, boolean>);

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    newPassword: this.fb.nonNullable.control('', {
      validators: [Validators.required, minPasswordLength()]
    })
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: unknown) => {
        this.errorMessage.set(adaptApiError(error).message);
        this.saving.set(false);
      }
    });
  }
}
