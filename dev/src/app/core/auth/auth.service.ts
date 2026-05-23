// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Router }      from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { throwError }  from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  _id:    string;
  name:   string;
  email:  string;
  role:   'customer' | 'provider' | 'admin';
  avatar: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;

  // Reactive signals — components auto-update when these change
  readonly currentUser = signal<User | null>(this.loadUser());
  readonly isLoggedIn  = computed(() => this.currentUser() !== null);
  readonly userRole    = computed(() => this.currentUser()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  // Register new account
  register(payload: { name: string; email: string; phone: string; password: string; role: string }) {
    return this.http.post<any>(`${this.API}/register`, payload).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => throwError(() => err.error?.message ?? 'Registration failed'))
    );
  }

  // Login with email + password
  login(email: string, password: string) {
    return this.http.post<any>(`${this.API}/login`, { email, password }).pipe(
      tap(res => this.saveSession(res.data)),
      catchError(err => throwError(() => err.error?.message ?? 'Login failed'))
    );
  }

  // Logout — clear session locally and call backend to revoke token
  logout() {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clearSession();
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
