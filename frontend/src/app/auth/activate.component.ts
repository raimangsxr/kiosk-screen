import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../core/auth/auth.service';
import { DeviceActivationService } from '../core/auth/device-activation.service';
import { adaptApiError } from '../core/errors/api-error-adapter';

type ActivateView = 'form' | 'success';

@Component({
  selector: 'app-activate',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <main class="activate-page" aria-label="Activar pantalla">
      <mat-card appearance="outlined" class="activate-card">
        @if (view() === 'success') {
          <mat-card-header>
            <div mat-card-avatar class="activate-card__avatar activate-card__avatar--success">
              <mat-icon aria-hidden="true">check_circle</mat-icon>
            </div>
            <mat-card-title>Pantalla activada</mat-card-title>
            <mat-card-subtitle>Ya puedes cerrar esta página.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>La pantalla del quiosco recibirá la sesión en unos segundos.</p>
          </mat-card-content>
        } @else {
          <mat-card-header>
            <div mat-card-avatar class="activate-card__avatar">
              <mat-icon aria-hidden="true">smartphone</mat-icon>
            </div>
            <mat-card-title>Activar pantalla</mat-card-title>
            <mat-card-subtitle>Introduce el código que aparece en el quiosco.</mat-card-subtitle>
          </mat-card-header>

          <form class="activate-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-card-content class="activate-form__content">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Código de 6 letras</mat-label>
                <input
                  matInput
                  formControlName="userCode"
                  maxlength="6"
                  autocomplete="one-time-code"
                  autocapitalize="characters"
                  spellcheck="false"
                  aria-describedby="activate-code-hint"
                />
                <mat-hint id="activate-code-hint">Solo letras mayúsculas A–Z.</mat-hint>
                @if (form.controls.userCode.hasError('pattern')) {
                  <mat-error>Introduce un código de 6 letras mayúsculas.</mat-error>
                }
                @if (form.controls.userCode.hasError('required')) {
                  <mat-error>El código es obligatorio.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nombre de pantalla</mat-label>
                <input
                  matInput
                  formControlName="displayLabel"
                  maxlength="80"
                  autocomplete="off"
                  placeholder="Ej. Sala ultrawide"
                />
                <mat-hint>Se mostrará en el quiosco y en el panel de control.</mat-hint>
                @if (form.controls.displayLabel.hasError('required')) {
                  <mat-error>El nombre de pantalla es obligatorio.</mat-error>
                }
              </mat-form-field>

              @if (!auth.isAuthenticated()) {
                <p class="activate-form__login-hint">Inicia sesión para autorizar la pantalla.</p>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Correo electrónico</mat-label>
                  <input matInput type="email" formControlName="email" autocomplete="username" />
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic">
                  <mat-label>Contraseña</mat-label>
                  <input matInput type="password" formControlName="password" autocomplete="current-password" />
                </mat-form-field>
                <mat-checkbox formControlName="rememberMe">Recordarme (30 días)</mat-checkbox>
              }

              @if (errorMessage(); as message) {
                <p class="activate-form__error" role="alert">
                  <mat-icon aria-hidden="true">error</mat-icon>
                  <span>{{ message }}</span>
                </p>
              }
            </mat-card-content>

            <mat-card-actions align="end" class="activate-form__actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
                @if (submitting()) {
                  <mat-progress-spinner diameter="18" mode="indeterminate" aria-label="Activando" />
                } @else {
                  Confirmar activación
                }
              </button>
            </mat-card-actions>
          </form>
        }
      </mat-card>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .activate-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: clamp(20px, 6vw, 48px);
        background: var(--mat-sys-surface-container-lowest);
      }
      .activate-card {
        width: min(100%, 420px);
      }
      .activate-card__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .activate-card__avatar--success {
        background: var(--mat-sys-tertiary-container);
        color: var(--mat-sys-on-tertiary-container);
      }
      .activate-form__content {
        display: grid;
        gap: 14px;
      }
      .activate-form__login-hint {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .activate-form__error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 8px 12px;
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        border-radius: var(--mat-sys-corner-medium);
      }
      .activate-form__actions {
        padding: 8px 24px 16px;
      }
    `,
  ],
})
export class ActivateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  private readonly activation = inject(DeviceActivationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly view = signal<ActivateView>('form');
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    userCode: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{6}$/)],
    }),
    displayLabel: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    email: this.fb.nonNullable.control(''),
    password: this.fb.nonNullable.control(''),
    rememberMe: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.form.controls.userCode.setValue(this.activation.normalizeUserCode(code));
    }
    this.form.controls.userCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const normalized = this.activation.normalizeUserCode(value);
        if (normalized !== value) {
          this.form.controls.userCode.setValue(normalized, { emitEvent: false });
        }
      });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const userCode = this.activation.normalizeUserCode(this.form.controls.userCode.value);
    const rememberMe = this.form.controls.rememberMe.value;
    const displayLabel = this.form.controls.displayLabel.value.trim();

    const authorize = () =>
      this.activation.authorize(userCode, rememberMe, displayLabel).subscribe({
        next: () => {
          this.submitting.set(false);
          this.view.set('success');
        },
        error: (error) => {
          this.submitting.set(false);
          this.errorMessage.set(adaptApiError(error).message);
        },
      });

    if (this.auth.isAuthenticated()) {
      authorize();
      return;
    }

    this.auth
      .login({
        email: this.form.controls.email.value.trim(),
        password: this.form.controls.password.value,
        rememberMe,
      })
      .subscribe({
        next: () => authorize(),
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Correo o contraseña incorrectos.');
        },
      });
  }
}
