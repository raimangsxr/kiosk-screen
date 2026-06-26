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

/**
 * localStorage holds ONLY a non-sensitive "we had a session recently" flag
 * (`kiosk_authenticated`) and an opt-in `kiosk_remember` flag that mirrors
 * the user's intent of staying signed in for 30 days. The actual session
 * lives in an HttpOnly cookie set by the backend — localStorage can never
 * hold PII (email, displayName, roles) again. The user signal is hydrated
 * exclusively from `GET /api/auth/me`, which reads the cookie server-side.
 */
const AUTH_STORAGE_KEY = 'kiosk_authenticated';
const REMEMBER_STORAGE_KEY = 'kiosk_remember';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<AuthenticatedUser | null>(null);
  private readonly readyState = signal(this.readAuthFlag());
  private readonly rememberState = signal(this.readRememberFlag());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.readyState() && this.userState() !== null);
  readonly displayName = computed(() => this.userState()?.displayName ?? '');
  readonly email = computed(() => this.userState()?.email ?? '');
  readonly initials = computed(() => this.computeInitials(this.userState()?.displayName || this.userState()?.email || ''));
  /**
   * True when localStorage carries the non-sensitive `kiosk_authenticated`
   * flag from a previous session. Distinct from `isAuthenticated()` which
   * also requires the user signal to be hydrated. Used by the session
   * guard to decide whether to attempt a silent `/me` rehydration on cold
   * boot before deciding to redirect to /login.
   */
  readonly hasPersistedSession = this.readyState.asReadonly();
  /**
   * True when the operator checked "Remember me" on the last successful
   * login. Pure UI hint: the cookie's TTL is decided server-side. The flag
   * is what the LoginComponent shows ("session lasts 30 days") and what
   * other UI affordances consult to decide whether to attempt a silent
   * rehydration on boot.
   */
  readonly remembered = this.rememberState.asReadonly();

  login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<AuthenticatedUser> {
    const rememberMe = credentials.rememberMe ?? false;
    return this.http
      .post<UserResponse>(
        '/api/auth/login',
        {
          email: credentials.email,
          password: credentials.password,
          rememberMe
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
          this.persist(user, rememberMe);
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
      globalThis.localStorage?.removeItem(REMEMBER_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.userState.set(null);
    this.readyState.set(false);
    this.rememberState.set(false);
  }

  /**
   * Hydrate the user signal by calling `/api/auth/me`. The session cookie is
   * the source of truth — localStorage only stores the non-sensitive flag
   * so the gate (`!readyState() → no call`) avoids a noisy roundtrip on a
   * cold start where the user was never signed in. Returns `null` without
   * an HTTP call when no session is known.
   */
  refresh(): Observable<AuthenticatedUser | null> {
    if (!this.readyState()) {
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
        this.userState.set(user);
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  private persist(user: AuthenticatedUser, rememberMe: boolean): void {
    try {
      globalThis.localStorage?.setItem(AUTH_STORAGE_KEY, 'true');
      if (rememberMe) {
        globalThis.localStorage?.setItem(REMEMBER_STORAGE_KEY, 'true');
      } else {
        globalThis.localStorage?.removeItem(REMEMBER_STORAGE_KEY);
      }
    } catch {
      // storage may be unavailable; runtime still works
    }
    this.userState.set(user);
    this.readyState.set(true);
    this.rememberState.set(rememberMe);
  }

  private readAuthFlag(): boolean {
    return globalThis.localStorage?.getItem(AUTH_STORAGE_KEY) === 'true';
  }

  private readRememberFlag(): boolean {
    return globalThis.localStorage?.getItem(REMEMBER_STORAGE_KEY) === 'true';
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