// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Router }      from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError }  from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  _id:      string;
  name:     string;
  email:    string;
  role:     'customer' | 'provider' | 'admin';
  avatar:   string;
  phone?:   string;
  location?: { city?: string; address?: string; district?: string; area?: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;

  // Reactive signals — components auto-update when these change
  readonly currentUser = signal<User | null>(this.loadUser());
  readonly isLoggedIn  = computed(() => this.currentUser() !== null);
  readonly userRole    = computed(() => this.currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  // Check if a phone number already has an account and whether a password is set.
  checkPhone(phone: string) {
    return this.http.post<any>(`${this.API}/check-phone`, { phone }).pipe(
      catchError(err => throwError(() => err.error?.message ?? 'Check failed'))
    );
  }

  // Password-based login for users who have already set a password.
  loginPhone(phone: string, password: string) {
    return this.http.post<any>(`${this.API}/login-phone`, { phone, password }).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => throwError(() => err.error?.message ?? 'Login failed'))
    );
  }

  // Check if a Firebase ID token belongs to a new or existing user.
  // Returns { isNewUser: boolean } without creating the account yet.
  firebaseCheck(idToken: string) {
    return this.http.post<any>(`${this.API}/firebase-check`, { idToken }).pipe(
      catchError(err => throwError(() => err.error?.message ?? 'Phone verification failed'))
    );
  }

  // Exchange a verified Firebase ID token for our own JWT session.
  // profile is passed for new users; password is always passed so it gets set immediately.
  firebaseVerify(
    idToken: string,
    role: 'customer' | 'provider' = 'customer',
    profile?: { name?: string; city?: string; email?: string },
    password?: string,
  ) {
    return this.http.post<any>(`${this.API}/firebase-verify`, { idToken, role, profile, password }).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => throwError(() => err.error?.message ?? 'Phone verification failed'))
    );
  }

  // Passwordless sign-up / first-time password set, used when phone OTP is
  // disabled by the admin. The server re-checks the toggle before trusting it.
  registerDirect(
    phone: string,
    role: 'customer' | 'provider' = 'customer',
    profile?: { name?: string; city?: string; email?: string },
    password?: string,
    reset = false,
  ) {
    return this.http.post<any>(`${this.API}/register-direct`, { phone, role, profile, password, reset }).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => throwError(() => err.error?.message ?? 'Sign up failed'))
    );
  }

  // Logout — clear session locally and call backend to revoke token
  logout() {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
  }

  // Load the full profile (includes phone + location, which the
  // login response omits) — used by the settings page.
  loadProfile() {
    return this.http.get<any>(`${this.API}/me`);
  }

  // Update own profile (name, phone, city, address, optional new password)
  updateProfile(payload: { name?: string; phone?: string; city?: string; address?: string; district?: string; area?: string; password?: string }) {
    return this.http.put<any>(`${this.API}/me`, payload).pipe(
      tap(res => {
        // Refresh the cached user so the navbar etc. update immediately
        const updated = { ...(this.currentUser() ?? {}), ...res.data } as User;
        localStorage.setItem('nb_user', JSON.stringify(updated));
        this.currentUser.set(updated);
      }),
      catchError(err => throwError(() => err.error?.message ?? 'Update failed'))
    );
  }

  // Used by JWT interceptor
  getAccessToken(): string | null {
    return localStorage.getItem('nb_access');
  }

  // Refresh expired access token using stored refresh token
  refreshToken() {
    const refreshToken = localStorage.getItem('nb_refresh');
    return this.http.post<any>(`${this.API}/refresh-token`, { refreshToken }).pipe(
      tap(res => localStorage.setItem('nb_access', res.data.accessToken)),
      catchError(err => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => err);
      })
    );
  }

  private saveSession(data: { user: User; accessToken: string; refreshToken: string }) {
    localStorage.setItem('nb_access',  data.accessToken);
    localStorage.setItem('nb_refresh', data.refreshToken);
    localStorage.setItem('nb_user',    JSON.stringify(data.user));
    this.currentUser.set(data.user);
  }

  private clearSession() {
    localStorage.removeItem('nb_access');
    localStorage.removeItem('nb_refresh');
    localStorage.removeItem('nb_user');
    this.currentUser.set(null);
  }

  private loadUser(): User | null {
    try {
      const s = localStorage.getItem('nb_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
}
