// src/app/features/auth/login.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }     from '../../core/auth/auth.service';
import { ToastService }    from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-left d-none d-lg-flex">
        <div class="auth-inner">
          <div class="auth-brand">Near<span>By</span></div>
          <h2 class="auth-tagline">Find trusted local<br>services near you</h2>
          <div class="auth-features">
            @for (f of features; track f) {
              <div class="af"><i class="bi bi-check-circle-fill"></i>{{ f }}</div>
            }
          </div>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-card">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-sub">Sign in to your NearBy account</p>

          @if (error()) {
            <div class="msg-box error" data-testid="error-message">
              <i class="bi bi-exclamation-circle me-2"></i>{{ error() }}
            </div>
          }

          <div class="mb-3">
            <label class="nb-label" for="login-email">Email</label>
            <input id="login-email" type="email" class="nb-input"
                   [(ngModel)]="email" placeholder="you@example.com"
                   (keyup.enter)="doLogin()" />
          </div>

          <div class="mb-4">
            <label class="nb-label" for="login-pass">Password</label>
            <div class="input-eye">
              <input id="login-pass" [type]="showPass?'text':'password'" class="nb-input"
                     [(ngModel)]="password" placeholder="••••••••"
                     (keyup.enter)="doLogin()" />
              <button class="eye-btn" type="button" (click)="showPass=!showPass">
                <i class="bi" [class.bi-eye]="!showPass" [class.bi-eye-slash]="showPass"></i>
              </button>
            </div>
          </div>

          <button class="btn-nb-primary btn w-100 py-2 mb-3"
                  (click)="doLogin()" [disabled]="loading()">
            @if (loading()) { <span class="spinner-border spinner-border-sm me-2"></span> }
            Sign In
          </button>

          <p class="text-center" style="font-size:.875rem;color:var(--nb-text-muted)">
            Don't have an account? <a routerLink="/auth/register" style="font-weight:600">Join free</a>
          </p>

          <!-- Demo credentials — click to auto-fill -->
          <div class="demo-box">
            <p class="demo-title"><i class="bi bi-info-circle me-1"></i>Demo Credentials (click to fill)</p>
            <div class="demo-rows">
              @for (c of demos; track c.role) {
                <div class="demo-row" (click)="fill(c)">
                  <span class="demo-role">{{ c.role }}</span>
                  <span>{{ c.email }} / {{ c.pass }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display:flex; min-height:calc(100vh - 65px); }
    .auth-left { flex:1; background:linear-gradient(145deg,#0F2744,#1A3C5E); padding:3rem; flex-direction:column; justify-content:center; }
    .auth-inner { max-width:360px; }
    .auth-brand { font-family:var(--font-display); font-size:2rem; font-weight:800; color:#fff; margin-bottom:1.5rem; }
    .auth-brand span { color:var(--nb-accent); }
    .auth-tagline { font-size:1.75rem; font-weight:800; color:#fff; line-height:1.25; margin-bottom:1.5rem; }
    .auth-features { display:flex; flex-direction:column; gap:10px; }
    .af { color:rgba(255,255,255,.8); font-size:.9rem; display:flex; align-items:center; gap:10px; }
    .af i { color:var(--nb-accent); }
    .auth-right { flex:1; display:flex; align-items:center; justify-content:center; padding:2rem 1rem; background:var(--nb-bg); }
    .auth-card { background:#fff; border-radius:var(--radius-xl); border:1px solid var(--nb-border); padding:2.5rem; width:100%; max-width:440px; box-shadow:var(--shadow-lg); }
    .auth-title { font-size:1.6rem; font-weight:800; margin-bottom:.25rem; }
    .auth-sub { color:var(--nb-text-muted); font-size:.9rem; margin-bottom:1.5rem; }
    .msg-box { border-radius:var(--radius-md); padding:10px 14px; font-size:.875rem; margin-bottom:1rem; }
    .msg-box.error { background:#FEE2E2; color:var(--nb-danger); }
    .input-eye { position:relative; }
    .input-eye .nb-input { padding-right:44px; }
    .eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--nb-text-muted); cursor:pointer; }
    .demo-box { background:var(--nb-surface-2); border-radius:var(--radius-md); padding:12px 14px; border:1px solid var(--nb-border); margin-top:1rem; }
    .demo-title { font-family:var(--font-display); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--nb-text-muted); margin-bottom:6px; }
    .demo-rows { display:flex; flex-direction:column; gap:4px; }
    .demo-row { font-size:.78rem; color:var(--nb-text-muted); cursor:pointer; padding:4px 8px; border-radius:6px; transition:background .15s; display:flex; align-items:center; gap:8px; }
    .demo-row:hover { background:var(--nb-border); }
    .demo-role { font-weight:700; font-family:var(--font-display); color:var(--nb-primary); min-width:60px; text-transform:capitalize; }
  `]
})
export class LoginComponent {
  email    = '';
  password = '';
  showPass = false;
  loading  = signal(false);
  error    = signal('');

  features = [
    'Browse 500+ verified local providers',
    'Book in-person or online sessions',
    'Real reviews from real people',
    'Free to use — always',
  ];

  demos = [
    { role: 'customer', email: 'customer@test.com', pass: 'Test@1234' },
    { role: 'provider', email: 'provider@test.com', pass: 'Test@1234' },
    { role: 'admin',    email: 'admin@test.com',    pass: 'Admin@1234' },
  ];

  constructor(
    private auth:  AuthService,
    private toast: ToastService,
    private router: Router,
  ) {}

  fill(c: { email: string; pass: string }) {
    this.email    = c.email;
    this.password = c.pass;
  }

  doLogin() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Email and password are required.'); return;
    }
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.toast.success(`Welcome back!`);
        const role = this.auth.userRole();
        this.router.navigate([
          role === 'provider' ? '/dashboard/provider' :
          role === 'admin'    ? '/admin' :
          '/dashboard/customer'
        ]);
      },
      error: (msg: string) => {
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }
}
