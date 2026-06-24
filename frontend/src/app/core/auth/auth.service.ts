import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

const AUTH_STORAGE_KEY = 'kiosk_authenticated';
const USER_STORAGE_KEY = 'kiosk_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<AuthenticatedUser | null>(this.readStoredUser());
  private readonly readyState = signal(this.readAuthFlag());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.readyState() && this.userState() !== null);
  readonly displayName = computed(() => this.userState()?.displayName ?? '');
  readonly email = computed(() => this.userState()?.email ?? '');
  readonly initials = computed(() => this.computeInitials(this.userState()?.displayName || this.userState()?.email || ''));

  login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<AuthenticatedUser> {
    return this.http
      .post<UserResponse>(
        '/api/auth/login',
        {
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe ?? false,
        },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          const user: AuthenticatedUser = {
            id: response.id,
            email: response.email,
            displayName: response.displayName,
            roles: response.roles ?? []
          };
          this.persist(user);
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true }).pipe(
      tap(() => this.clearSession()),
      catchError(() => {
        this.clearSession();
        return of(void 0);
      })
    );
  }

  clearSession(): void {
    try {
      globalThis.localStorage?.removeItem(AUTH_STORAGE_KEY);
      globalThis.localStorage?.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.userState.set(null);
    this.readyState.set(false);
  }

  refresh(): Observable<AuthenticatedUser | null> {
    if (!this.isAuthenticated()) {
      return of(null);
    }
    return this.http.get<UserResponse>('/api/auth/me', { withCredentials: true }).pipe(
      tap((response) => {
        const user: AuthenticatedUser = {
          id: response.id,
          email: response.email,
          displayName: response.displayName,
          roles: response.roles ?? []
        };
        this.persist(user);
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  private persist(user: AuthenticatedUser): void {
    try {
      globalThis.localStorage?.setItem(AUTH_STORAGE_KEY, 'true');
      globalThis.localStorage?.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // storage may be unavailable; runtime still works
    }
    this.userState.set(user);
    this.readyState.set(true);
  }

  private readAuthFlag(): boolean {
    return globalThis.localStorage?.getItem(AUTH_STORAGE_KEY) === 'true';
  }

  private readStoredUser(): AuthenticatedUser | null {
    try {
      const raw = globalThis.localStorage?.getItem(USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as AuthenticatedUser;
      if (!parsed?.email) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private computeInitials(name: string): string {
    if (!name) {
      return '?';
    }
    const localPart = name.split('@')[0];
    const parts = localPart.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
