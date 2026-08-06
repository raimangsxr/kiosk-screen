import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map, Subscription, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../core/auth/auth.service';
import { DeviceActivationService } from '../core/auth/device-activation.service';
import { environment } from '../../environments/environment';

interface LoginFormValue {
  email: string;
  password: string;
  rememberMe: boolean;
}

type LoginView = 'activation' | 'credentials';

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
    MatProgressSpinnerModule,
  ],
  template: `
    <main class="login-page" aria-label="Acceso de operador">
      <mat-card appearance="outlined" class="login-card">
        <mat-card-header>
          <div class="login-card__brand" mat-card-avatar>
            <mat-icon aria-hidden="true">tv</mat-icon>
          </div>
          <mat-card-title>Acceso al quiosco</mat-card-title>
          <mat-card-subtitle>Kiosk Screen</mat-card-subtitle>
        </mat-card-header>

        <div class="login-card__tabs" role="tablist" aria-label="Método de acceso">
          <button
            type="button"
            role="tab"
            class="login-card__tab"
            [class.login-card__tab--active]="activeView() === 'activation'"
            [attr.aria-selected]="activeView() === 'activation'"
            (click)="switchView('activation')"
          >
            Código / QR
          </button>
          <button
            type="button"
            role="tab"
            class="login-card__tab"
            [class.login-card__tab--active]="activeView() === 'credentials'"
            [attr.aria-selected]="activeView() === 'credentials'"
            (click)="switchView('credentials')"
          >
            Correo y contraseña
          </button>
        </div>

        @if (activeView() === 'activation') {
          <section class="activation-panel" aria-label="Activación desde móvil">
            <p class="activation-panel__hint">Activa desde tu móvil</p>
            <p class="activation-panel__status" aria-live="polite">
              @if (activationLoading()) {
                Generando código…
              } @else if (userCode()) {
                Escanea el QR o introduce este código en tu móvil.
              } @else {
                No se pudo generar el código. Inténtalo de nuevo.
              }
            </p>

            @if (userCode(); as code) {
              <p class="activation-panel__code" aria-label="Código de activación">{{ code }}</p>
            }

            @if (qrDataUrl(); as qrUrl) {
              <img class="activation-panel__qr" [src]="qrUrl" width="256" height="256" alt="Código QR para activar la pantalla" />
            } @else if (activationLoading()) {
              <mat-progress-spinner diameter="48" mode="indeterminate" aria-label="Cargando código QR" />
            }

            @if (activationError(); as message) {
              <p class="login-form__error" role="alert">
                <mat-icon aria-hidden="true">error</mat-icon>
                <span>{{ message }}</span>
              </p>
            }
          </section>
        } @else if (form) {
          <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="login-form"
            novalidate
            aria-label="Formulario de acceso"
          >
            <mat-card-content class="login-form__content">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Correo electrónico</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  required
                  autocomplete="username"
                  inputmode="email"
                />
                <mat-icon matIconPrefix aria-hidden="true">mail</mat-icon>
                @if (form.controls.email.hasError('required')) {
                  <mat-error>El correo es obligatorio.</mat-error>
                }
                @if (form.controls.email.hasError('email')) {
                  <mat-error>Introduce un correo válido.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Contraseña</mat-label>
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
                  [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                >
                  <mat-icon aria-hidden="true">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.controls.password.hasError('required')) {
                  <mat-error>La contraseña es obligatoria.</mat-error>
                }
              </mat-form-field>

              <mat-checkbox formControlName="rememberMe" class="login-form__remember">
                Recordarme (mantener la sesión iniciada durante 30 días)
              </mat-checkbox>

              @if (errorMessage(); as message) {
                <p class="login-form__error" role="alert">
                  <mat-icon aria-hidden="true">error</mat-icon>
                  <span>{{ message }}</span>
                </p>
              }
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
                    <mat-progress-spinner diameter="18" mode="indeterminate" aria-label="Iniciando sesión" />
                    <span>Iniciando sesión…</span>
                  </span>
                } @else {
                  <span class="login-form__submit-content">
                    <mat-icon aria-hidden="true" class="login-form__submit-icon">login</mat-icon>
                    <span>Iniciar sesión</span>
                  </span>
                }
              </button>
            </mat-card-actions>
          </form>
        }

        @if (showDevHint) {
          <p class="login-card__hint">
            Credenciales de desarrollo: <code>admin&#64;example.com</code> / <code>admin</code>.
          </p>
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
      .login-page {
        position: relative;
        overflow: hidden;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: clamp(20px, 6vw, 48px);
        background:
          radial-gradient(
            120% 80% at 100% 0%,
            color-mix(in srgb, var(--mat-sys-primary) 14%, transparent) 0%,
            transparent 60%
          ),
          radial-gradient(
            100% 70% at 0% 100%,
            color-mix(in srgb, var(--mat-sys-tertiary) 10%, transparent) 0%,
            transparent 55%
          ),
          var(--mat-sys-surface-container-lowest);
      }
      .login-card {
        position: relative;
        z-index: 1;
        width: min(100%, 420px);
        background: var(--mat-sys-surface);
        box-shadow: var(--mat-sys-level2);
        border: 1px solid var(--mat-sys-outline-variant);
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
      .login-card__tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 0 24px 12px;
      }
      .login-card__tab {
        border: 1px solid var(--mat-sys-outline-variant);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        border-radius: var(--mat-sys-corner-medium);
        min-height: var(--app-touch-target);
        cursor: pointer;
        font: var(--mat-sys-label-large);
      }
      .login-card__tab--active {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        border-color: transparent;
      }
      .activation-panel {
        display: grid;
        justify-items: center;
        gap: 12px;
        padding: 8px 24px 24px;
        text-align: center;
      }
      .activation-panel__hint {
        margin: 0;
        font: var(--mat-sys-title-medium);
        color: var(--mat-sys-on-surface);
      }
      .activation-panel__status {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .activation-panel__code {
        margin: 0;
        font: var(--mat-sys-headline-medium);
        letter-spacing: 0.35em;
        font-weight: 600;
      }
      .activation-panel__qr {
        border-radius: var(--mat-sys-corner-medium);
        background: white;
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
        .login-card mat-card-header,
        .login-card__tabs,
        .activation-panel,
        .login-form__content,
        .login-form__actions,
        .login-card__hint {
          padding-inline: 20px;
        }
      }
    `,
  ],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activation = inject(DeviceActivationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showDevHint = environment.devMode;
  protected readonly activeView = signal<LoginView>('activation');
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activationLoading = signal(false);
  protected readonly activationError = signal<string | null>(null);
  protected readonly userCode = signal<string | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  private pollSubscription: Subscription | null = null;
  private rememberMeOnActivation = false;

  protected readonly form: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
    rememberMe: FormControl<boolean>;
  }> = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.nonNullable.control('', {
      validators: [Validators.required],
    }),
    rememberMe: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      this.beginActivation();
    }
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  protected switchView(view: LoginView): void {
    this.activeView.set(view);
    if (view === 'credentials') {
      this.stopPolling();
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.beginActivation();
    }
  }

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
          this.stopPolling();
          void this.router.navigateByUrl('/hall');
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Correo o contraseña incorrectos.');
        },
      });
  }

  private beginActivation(): void {
    this.stopPolling();
    this.activationLoading.set(true);
    this.activationError.set(null);
    this.userCode.set(null);
    this.qrDataUrl.set(null);

    this.activation
      .start()
      .pipe(
        switchMap((started) => {
          this.userCode.set(started.userCode);
          this.rememberMeOnActivation = false;
          return this.activation.buildQrDataUrl(started.userCode).pipe(map((qrUrl) => ({ started, qrUrl })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ started, qrUrl }) => {
          this.qrDataUrl.set(qrUrl);
          this.activationLoading.set(false);
          this.startPolling(started.deviceCode, started.pollIntervalSeconds);
        },
        error: () => {
          this.activationLoading.set(false);
          this.activationError.set('No se pudo iniciar la activación. Inténtalo de nuevo.');
        },
      });
  }

  private startPolling(deviceCode: string, intervalSeconds: number): void {
    this.stopPolling();
    this.pollSubscription = this.activation.pollUntilAuthorized(deviceCode, intervalSeconds).subscribe({
      next: (user) => {
        this.stopPolling();
        this.auth.hydrateFromActivation(user, this.rememberMeOnActivation);
        void this.router.navigateByUrl('/display');
      },
      error: (error) => {
        if (this.activation.isExpiredActivationError(error)) {
          this.beginActivation();
          return;
        }
        this.activationError.set('Error de conexión. Reintentando…');
        this.startPolling(deviceCode, intervalSeconds);
      },
    });
  }

  private stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
  }
}
