import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../core/auth/auth.service';

interface LoginFormValue {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <main class="login-page" aria-label="Operator sign in">
      <mat-card appearance="outlined" class="login-card">
        <mat-card-header>
          <div class="login-card__brand" mat-card-avatar>
            <mat-icon aria-hidden="true">tv</mat-icon>
          </div>
          <mat-card-title>Operator access</mat-card-title>
          <mat-card-subtitle>Kiosk Screen administration</mat-card-subtitle>
        </mat-card-header>
        <form
          *ngIf="form"
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="login-form"
          novalidate
          aria-label="Sign in form"
        >
          <mat-card-content class="login-form__content">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                required
                autocomplete="username"
                inputmode="email"
              />
              <mat-icon matIconPrefix aria-hidden="true">mail</mat-icon>
              <mat-error *ngIf="form.controls.email.hasError('required')">Email is required.</mat-error>
              <mat-error *ngIf="form.controls.email.hasError('email')">Enter a valid email address.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                required
                autocomplete="current-password"
              />
              <mat-icon matIconPrefix aria-hidden="true">lock</mat-icon>
              <button
                matSuffix
                mat-icon-button
                type="button"
                (click)="togglePassword()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <mat-icon aria-hidden="true">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.controls.password.hasError('required')">Password is required.</mat-error>
            </mat-form-field>

            <p
              *ngIf="errorMessage() as message"
              class="login-form__error"
              role="alert"
            >
              <mat-icon aria-hidden="true">error</mat-icon>
              <span>{{ message }}</span>
            </p>
          </mat-card-content>

          <mat-card-actions align="end" class="login-form__actions">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || submitting()"
            >
              @if (submitting()) {
                <ng-container>
                  <mat-progress-spinner
                    diameter="18"
                    mode="indeterminate"
                    aria-label="Signing in"
                  />
                  <span>Signing in…</span>
                </ng-container>
              } @else {
                <ng-container>
                  <mat-icon aria-hidden="true">login</mat-icon>
                  <span>Sign in</span>
                </ng-container>
              }
            </button>
          </mat-card-actions>
        </form>
        <p class="login-card__hint">
          Default credentials: <code>admin&#64;example.com</code> / <code>admin</code>.
        </p>
      </mat-card>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .login-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: var(--mat-sys-surface);
      }
      .login-card {
        width: min(100%, 420px);
      }
      .login-card__brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .login-form {
        display: block;
      }
      .login-form__content {
        display: grid;
        gap: 12px;
        padding-top: 12px;
      }
      .login-form__error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 8px 12px;
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        border-radius: 8px;
        font-size: 14px;
      }
      .login-form__actions {
        padding: 8px 16px 16px;
        gap: 8px;
      }
      .login-form__actions button {
        min-width: 132px;
        min-height: var(--app-touch-target);
      }
      .login-card__hint {
        margin: 0;
        padding: 0 16px 16px;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }
      .login-card__hint code {
        background: var(--mat-sys-surface-container);
        padding: 1px 6px;
        border-radius: 4px;
      }
    `
  ]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
  }> = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email]
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required]
    })
  });

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const value = this.form.value as LoginFormValue;

    this.auth.login({ email: value.email.trim(), password: value.password }).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigateByUrl('/hall');
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Invalid email or password.');
      }
    });
  }
}
