import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../core/auth/auth.service';

interface LoginFormValue {
  email: string;
  password: string;
  rememberMe: boolean;
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
    MatCheckboxModule,
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

            <mat-checkbox formControlName="rememberMe" class="login-form__remember">
              Recordarme (mantener la sesión iniciada durante 30 días)
            </mat-checkbox>

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
              class="login-form__submit"
              [disabled]="form.invalid || submitting()"
            >
              @if (submitting()) {
                <span class="login-form__submit-content">
                  <mat-progress-spinner
                    diameter="18"
                    mode="indeterminate"
                    aria-label="Signing in"
                  />
                  <span>Signing in…</span>
                </span>
              } @else {
                <span class="login-form__submit-content">
                  <mat-icon aria-hidden="true" class="login-form__submit-icon">login</mat-icon>
                  <span>Sign in</span>
                </span>
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
        position: relative;
        overflow: hidden;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: clamp(20px, 6vw, 48px);
        background:
          linear-gradient(135deg, var(--mat-sys-surface-container-lowest) 0 44%, transparent 44%),
          repeating-linear-gradient(
            90deg,
            color-mix(in srgb, var(--mat-sys-primary) 9%, transparent) 0 1px,
            transparent 1px 72px
          ),
          var(--mat-sys-surface);
      }
      .login-page::before {
        content: '';
        position: absolute;
        inset: 0 0 0 58%;
        background:
          linear-gradient(180deg, var(--mat-sys-primary-container), var(--mat-sys-secondary-container));
        opacity: 0.34;
        pointer-events: none;
      }
      .login-page::after {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(var(--mat-sys-outline-variant) 1px, transparent 1px),
          linear-gradient(90deg, var(--mat-sys-outline-variant) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: linear-gradient(135deg, transparent 0 36%, black 36% 100%);
        opacity: 0.18;
        pointer-events: none;
      }
      .login-card {
        position: relative;
        z-index: 1;
        width: min(100%, 420px);
        background: color-mix(in srgb, var(--mat-sys-surface) 94%, transparent);
        box-shadow: var(--mat-sys-level2);
        backdrop-filter: blur(8px);
      }
      .login-card mat-card-header {
        padding: 24px 24px 12px;
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
        gap: 14px;
        padding: 16px 24px 8px;
      }
      .login-form__error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 8px 12px;
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        border-radius: var(--mat-sys-corner-medium);
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
      }
      .login-form__remember {
        margin: 4px 0 0;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface);
      }
      .login-form__actions {
        padding: 8px 24px 16px;
        gap: 8px;
      }
      .login-form__submit {
        min-width: 132px;
        min-height: var(--app-touch-target);
      }
      .login-form__submit-content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        line-height: 1;
      }
      .login-form__submit-icon {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
        font-size: 20px;
        line-height: 20px;
      }
      .login-card__hint {
        margin: 0;
        padding: 0 24px 24px;
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
      .login-card__hint code {
        background: var(--mat-sys-surface-container);
        padding: 1px 6px;
        border-radius: var(--mat-sys-corner-extra-small);
      }
      @media (max-width: 599.98px) {
        .login-page::before {
          inset: auto 0 0 0;
          height: 34%;
        }
        .login-page::after {
          mask-image: linear-gradient(180deg, transparent 0 52%, black 52% 100%);
        }
        .login-card mat-card-header {
          padding-inline: 20px;
        }
        .login-form__content,
        .login-form__actions,
        .login-card__hint {
          padding-inline: 20px;
        }
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
    rememberMe: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email]
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required]
    }),
    rememberMe: this.fb.nonNullable.control(false),
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

    this.auth
      .login({
        email: value.email.trim(),
        password: value.password,
        rememberMe: value.rememberMe,
      })
      .subscribe({
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
