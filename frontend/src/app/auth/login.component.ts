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
import { HttpErrorResponse } from '@angular/common/http';
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
import { DisplayLabelService } from '../display/display-label.service';
import { environment } from '../../environments/environment';

interface LoginFormValue {
  email: string;
  password: string;
  rememberMe: boolean;
}

type ActivationPhase = 'idle' | 'loading' | 'ready' | 'error';

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
      <header class="login-header">
        <div class="login-header__brand" aria-hidden="true">
          <mat-icon>tv</mat-icon>
        </div>
        <h1 class="login-header__title">Acceso al quiosco</h1>
        <p class="login-header__subtitle">Kiosk Screen</p>
      </header>

      <div class="login-panels">
        <mat-card appearance="outlined" class="login-panel login-panel--credentials" aria-label="Acceso con correo y contraseña">
          <mat-card-header class="login-panel__header">
            <mat-icon mat-card-avatar aria-hidden="true">mail</mat-icon>
            <mat-card-title>Correo y contraseña</mat-card-title>
          </mat-card-header>

          <mat-card-content>
            @if (form) {
              <form
                [formGroup]="form"
                (ngSubmit)="submit()"
                class="login-form"
                novalidate
                aria-label="Formulario de acceso"
              >
                <div class="login-form__content">
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
                    Recordarme (30 días)
                  </mat-checkbox>

                  @if (errorMessage(); as message) {
                    <p class="login-form__error" role="alert">
                      <mat-icon aria-hidden="true">error</mat-icon>
                      <span>{{ message }}</span>
                    </p>
                  }
                </div>

                <div class="login-form__actions">
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
                </div>
              </form>
            }
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="login-panel login-panel--activation" aria-label="Acceso por QR">
          <mat-card-header class="login-panel__header login-panel__header--centered">
            <div class="login-panel__header-icon" mat-card-avatar aria-hidden="true">
              <mat-icon>qr_code_2</mat-icon>
            </div>
            <mat-card-title>Acceso por QR</mat-card-title>
          </mat-card-header>

          <mat-card-content class="activation-panel">
            <div class="activation-panel__body">
              <p class="activation-panel__hint">Activa desde tu móvil</p>

              @if (qrDataUrl(); as qrUrl) {
                <img
                  class="activation-panel__qr"
                  [src]="qrUrl"
                  width="168"
                  height="168"
                  alt="Código QR para activar la pantalla"
                />
              } @else if (activationPhase() === 'loading') {
                <div class="activation-panel__qr-placeholder" aria-hidden="true">
                  <mat-progress-spinner diameter="40" mode="indeterminate" aria-label="Cargando código QR" />
                </div>
              } @else {
                <div class="activation-panel__qr-placeholder" aria-hidden="true"></div>
              }

              @if (userCode(); as code) {
                <p class="activation-panel__code" aria-label="Código de activación">{{ code }}</p>
              }

              <p class="activation-panel__status" aria-live="polite">
                @switch (activationPhase()) {
                  @case ('loading') {
                    Generando código…
                  }
                  @case ('ready') {
                    Escanea el QR o introduce el código en tu móvil.
                  }
                  @case ('error') {
                    No se pudo generar el código de activación.
                  }
                  @default {
                    Preparando activación…
                  }
                }
              </p>

              @if (activationError(); as message) {
                <div class="activation-panel__error">
                  <p class="login-form__error" role="alert">
                    <mat-icon aria-hidden="true">error</mat-icon>
                    <span>{{ message }}</span>
                  </p>
                  <button mat-stroked-button type="button" (click)="retryActivation()">
                    Reintentar
                  </button>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (showDevHint) {
        <p class="login-page__hint">
          Credenciales de desarrollo: <code>admin&#64;example.com</code> / <code>admin</code>.
        </p>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100dvh;
        overflow: hidden;
      }
      .login-page {
        position: relative;
        box-sizing: border-box;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 12px 16px 16px;
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
      .login-header {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .login-header__brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: var(--mat-sys-corner-large);
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .login-header__brand mat-icon {
        width: 26px;
        height: 26px;
        font-size: 26px;
      }
      .login-header__title {
        margin: 0;
        font: var(--mat-sys-title-large);
        color: var(--mat-sys-on-surface);
      }
      .login-header__subtitle {
        margin: 0;
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-on-surface-variant);
      }
      .login-panels {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        width: min(100%, 860px);
        flex: 0 1 auto;
        min-height: 0;
        max-height: min(520px, calc(100dvh - 7.5rem));
      }
      .login-panel {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--mat-sys-surface);
        box-shadow: var(--mat-sys-level2);
        border: 1px solid var(--mat-sys-outline-variant);
      }
      .login-panel__header {
        padding: 12px 16px 0;
        flex-shrink: 0;
      }
      .login-panel__header--centered {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 4px;
        padding-bottom: 4px;
      }
      .login-panel__header-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        margin: 0;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
      }
      .login-panel__header-icon mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
      }
      .login-panel mat-card-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: 8px 16px 14px;
      }
      .activation-panel {
        display: flex;
        flex: 1;
        min-height: 0;
        align-items: center;
        justify-content: center;
      }
      .activation-panel__body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        text-align: center;
      }
      .activation-panel__hint {
        margin: 0;
        font: var(--mat-sys-label-large);
        color: var(--mat-sys-on-surface-variant);
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .activation-panel__status {
        margin: 0;
        max-width: 24ch;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
      }
      .activation-panel__code {
        margin: 0;
        font: var(--mat-sys-title-large);
        letter-spacing: 0.28em;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }
      .activation-panel__qr,
      .activation-panel__qr-placeholder {
        width: 168px;
        height: 168px;
        flex-shrink: 0;
      }
      .activation-panel__qr {
        border-radius: var(--mat-sys-corner-medium);
        background: white;
      }
      .activation-panel__qr-placeholder {
        display: grid;
        place-items: center;
      }
      .activation-panel__error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: min(100%, 20rem);
      }
      .login-form {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        justify-content: space-between;
        gap: 8px;
      }
      .login-form__content {
        display: grid;
        gap: 6px;
        align-content: start;
      }
      .login-form__error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        padding: 6px 10px;
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
        border-radius: var(--mat-sys-corner-medium);
        font: var(--mat-sys-body-small);
      }
      .login-form__remember {
        margin: 0;
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface);
      }
      .login-form__actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 0;
      }
      .login-form__submit {
        min-width: 124px;
        min-height: 40px;
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
        width: 18px;
        height: 18px;
        font-size: 18px;
        line-height: 18px;
      }
      .login-page__hint {
        position: absolute;
        bottom: 6px;
        left: 50%;
        z-index: 1;
        margin: 0;
        transform: translateX(-50%);
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
        text-align: center;
        white-space: nowrap;
      }
      .login-page__hint code {
        background: var(--mat-sys-surface-container);
        padding: 1px 4px;
        border-radius: var(--mat-sys-corner-extra-small);
      }
      @media (max-width: 767.98px) {
        :host {
          height: auto;
          min-height: 100dvh;
          overflow: auto;
        }
        .login-page {
          height: auto;
          min-height: 100dvh;
          overflow: auto;
          justify-content: flex-start;
          padding-top: 16px;
        }
        .login-panels {
          grid-template-columns: 1fr;
          max-height: none;
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
  private readonly displayLabel = inject(DisplayLabelService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showDevHint = environment.devMode;
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activationPhase = signal<ActivationPhase>('idle');
  protected readonly activationError = signal<string | null>(null);
  protected readonly userCode = signal<string | null>(null);
  protected readonly qrDataUrl = signal<string | null>(null);

  private pollSubscription: Subscription | null = null;
  private activationSetupSubscription: Subscription | null = null;
  private activationAttempt = 0;
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
    this.destroyRef.onDestroy(() => {
      this.stopPolling();
      this.stopActivationSetup();
    });
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected retryActivation(): void {
    this.beginActivation();
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
          this.stopActivationSetup();
          void this.router.navigateByUrl('/hall');
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Correo o contraseña incorrectos.');
        },
      });
  }

  private beginActivation(): void {
    const attempt = ++this.activationAttempt;
    this.stopPolling();
    this.stopActivationSetup();
    this.activationPhase.set('loading');
    this.activationError.set(null);
    this.userCode.set(null);
    this.qrDataUrl.set(null);

    this.activationSetupSubscription = this.activation
      .start()
      .pipe(
        switchMap((started) => {
          if (attempt !== this.activationAttempt) {
            throw new ActivationSetupCancelledError();
          }
          this.userCode.set(started.userCode);
          this.rememberMeOnActivation = false;
          return this.activation.buildQrDataUrl(started.userCode).pipe(map((qrUrl) => ({ started, qrUrl })));
        }),
      )
      .subscribe({
        next: ({ started, qrUrl }) => {
          if (attempt !== this.activationAttempt) {
            return;
          }
          this.qrDataUrl.set(qrUrl);
          this.activationPhase.set('ready');
          this.startPolling(started.deviceCode, started.pollIntervalSeconds);
        },
        error: (error: unknown) => {
          if (attempt !== this.activationAttempt || isRequestAborted(error) || error instanceof ActivationSetupCancelledError) {
            return;
          }
          this.activationPhase.set('error');
          this.activationError.set('No se pudo iniciar la activación. Inténtalo de nuevo.');
        },
      });
  }

  private startPolling(deviceCode: string, intervalSeconds: number): void {
    this.stopPolling();
    this.pollSubscription = this.activation
      .pollUntilAuthorized(deviceCode, intervalSeconds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.stopPolling();
          this.stopActivationSetup();
          this.displayLabel.setLabel(result.displayLabel);
          this.auth.hydrateFromActivation(result.user, this.rememberMeOnActivation);
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

  private stopActivationSetup(): void {
    this.activationSetupSubscription?.unsubscribe();
    this.activationSetupSubscription = null;
  }
}

class ActivationSetupCancelledError extends Error {
  constructor() {
    super('activation_setup_cancelled');
    this.name = 'ActivationSetupCancelledError';
  }
}

function isRequestAborted(error: unknown): boolean {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return true;
  }
  return error instanceof DOMException && error.name === 'AbortError';
}
