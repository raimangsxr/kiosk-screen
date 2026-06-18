import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login-page">
      <form class="login-panel" (ngSubmit)="submit()">
        <p class="eyebrow">Kiosk Screen</p>
        <h1>Operator access</h1>
        <label>
          Email
          <input name="email" type="email" [(ngModel)]="email" autocomplete="username" required>
        </label>
        <label>
          Password
          <input name="password" type="password" [(ngModel)]="password" autocomplete="current-password" required>
        </label>
        <p class="error" role="alert" *ngIf="errorMessage">{{ errorMessage }}</p>
        <button type="submit" [disabled]="isSubmitting">Sign in</button>
      </form>
    </main>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        linear-gradient(135deg, rgba(15, 43, 58, 0.88), rgba(24, 88, 89, 0.82)),
        radial-gradient(circle at 22% 18%, rgba(242, 184, 74, 0.42), transparent 32%),
        #102832;
      color: #f8faf6;
      padding: 24px;
    }

    .login-panel {
      width: min(100%, 420px);
      display: grid;
      gap: 16px;
      padding: 28px;
      border-radius: 8px;
      background: rgba(9, 24, 31, 0.84);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
    }

    .eyebrow {
      margin: 0;
      color: #f2b84a;
      font-size: 13px;
      text-transform: uppercase;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 32px;
    }

    label {
      display: grid;
      gap: 8px;
      font-weight: 700;
    }

    input {
      min-height: 44px;
      border: 1px solid #8fb6b2;
      border-radius: 6px;
      padding: 0 12px;
      font: inherit;
    }

    button {
      min-height: 46px;
      border: 0;
      border-radius: 6px;
      background: #f2b84a;
      color: #102832;
      font-weight: 800;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.7;
      cursor: wait;
    }

    .error {
      margin: 0;
      color: #ffd1d1;
    }
  `]
})
export class LoginComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  email = '';
  password = '';
  isSubmitting = false;
  errorMessage = '';

  submit(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.http.post('/api/auth/login', { email: this.email, password: this.password }, { withCredentials: true })
      .subscribe({
        next: () => {
          globalThis.localStorage?.setItem('kiosk_authenticated', 'true');
          void this.router.navigateByUrl('/hall');
        },
        error: () => {
          this.errorMessage = 'Invalid credentials';
          this.isSubmitting = false;
        }
      });
  }
}
