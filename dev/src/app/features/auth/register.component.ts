// src/app/features/auth/register.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { FormsModule }     from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }     from '../../core/auth/auth.service';
import { ToastService }    from '../../core/services/toast.service';
import { DISTRICTS }       from '../../core/constants';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-left d-none d-lg-flex">
        <div class="auth-inner">
          <div class="auth-brand">Near<span>By</span></div>
          <h2 class="auth-tagline">Join thousands of<br>locals on NearBy</h2>
          <div class="role-cards">
            <div class="role-card" [class.sel]="form.role==='customer'" (click)="form.role='customer'">
              <i class="bi bi-person-circle"></i>
              <div><p class="rc-t">I need services</p><p class="rc-s">Find & book providers</p></div>
            </div>
            <div class="role-card" [class.sel]="form.role==='provider'" (click)="form.role='provider'">
              <i class="bi bi-briefcase"></i>
              <div><p class="rc-t">I offer services</p><p class="rc-s">List & grow my business</p></div>
            </div>
          </div>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-card">
          <h2 class="auth-title">Create account</h2>
          <p class="auth-sub">Free forever. No credit card needed.</p>

          @if (error()) {
            <div class="msg-box error" data-testid="error-message">
              <i class="bi bi-exclamation-circle me-2"></i>{{ error() }}
            </div>
          }

          <div class="mb-3">
            <label class="nb-label">Full Name</label>
            <input type="text" class="nb-input" [(ngModel)]="form.name" placeholder="Your full name" />
          </div>
          <div class="mb-3">
            <label class="nb-label">Email</label>
            <input type="email" class="nb-input" [(ngModel)]="form.email" placeholder="you@example.com" />
          </div>
          <div class="mb-3">
            <label class="nb-label">Phone</label>
            <input type="tel" class="nb-input" [(ngModel)]="form.phone"
                   placeholder="10-digit mobile number" maxlength="10" />
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="nb-label">District</label>
              <select class="nb-input" [(ngModel)]="form.district">
                <option value="" disabled>Select district</option>
                @for (d of districts; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <div class="col-6">
              <label class="nb-label">Area / Location</label>
              <input type="text" class="nb-input" [(ngModel)]="form.area" placeholder="e.g. Anna Nagar" />
            </div>
          </div>
          <p style="font-size:.72rem;color:var(--nb-text-muted);margin:-8px 0 12px">
            <i class="bi bi-geo-alt me-1"></i>District is used to match you with nearby offline services.
          </p>
          <div class="mb-3">
            <label class="nb-label">Password</label>
            <input type="password" class="nb-input" [(ngModel)]="form.password"
                   placeholder="Min 8 characters" />
          </div>
          <div class="mb-4">
            <label class="nb-label">I am a</label>
            <div class="role-toggle">
              <button [class.active]="form.role==='customer'" (click)="form.role='customer'">
                <i class="bi bi-person me-1"></i>Customer
              </button>
              <button [class.active]="form.role==='provider'" (click)="form.role='provider'">
                <i class="bi bi-briefcase me-1"></i>Provider
              </button>
            </div>
          </div>

          <button class="btn-nb-primary btn w-100 py-2 mb-3"
                  (click)="doRegister()" [disabled]="loading()">
            @if (loading()) { <span class="spinner-border spinner-border-sm me-2"></span> }
            Create Free Account
          </button>

          <p class="text-center" style="font-size:.875rem;color:var(--nb-text-muted)">
            Already have an account? <a routerLink="/auth/login" style="font-weight:600">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display:flex; min-height:calc(100vh - 65px); }
    .auth-left { flex:1; background:linear-gradient(145deg,#065f46,#059669); padding:3rem; flex-direction:column; justify-content:center; }
    .auth-inner { max-width:360px; }
    .auth-brand { font-family:var(--font-display); font-size:2rem; font-weight:800; color:#fff; margin-bottom:1.5rem; }
    .auth-brand span { color:#86efac; }
    .auth-tagline { font-size:1.75rem; font-weight:800; color:#fff; line-height:1.25; margin-bottom:1.5rem; }
    .role-cards { display:flex; flex-direction:column; gap:10px; }
    .role-card { display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.1); border:2px solid rgba(255,255,255,.2); border-radius:var(--radius-md); padding:14px; cursor:pointer; transition:all .2s; }
    .role-card.sel, .role-card:hover { background:rgba(255,255,255,.2); border-color:rgba(255,255,255,.6); }
    .role-card i { font-size:1.5rem; color:#fff; }
    .rc-t { font-family:var(--font-display); font-weight:700; color:#fff; margin:0; font-size:.9rem; }
    .rc-s { color:rgba(255,255,255,.7); margin:0; font-size:.78rem; }
    .auth-right { flex:1; display:flex; align-items:center; justify-content:center; padding:2rem 1rem; background:var(--nb-bg); }
    .auth-card { background:#fff; border-radius:var(--radius-xl); border:1px solid var(--nb-border); padding:2.5rem; width:100%; max-width:440px; box-shadow:var(--shadow-lg); }
    .auth-title { font-size:1.6rem; font-weight:800; margin-bottom:.25rem; }
    .auth-sub { color:var(--nb-text-muted); font-size:.9rem; margin-bottom:1.5rem; }
    .msg-box { border-radius:var(--radius-md); padding:10px 14px; font-size:.875rem; margin-bottom:1rem; }
    .msg-box.error { background:#FEE2E2; color:var(--nb-danger); }
    .role-toggle { display:flex; gap:8px; }
    .role-toggle button { flex:1; padding:9px; border-radius:var(--radius-sm); border:1.5px solid var(--nb-border); background:var(--nb-bg); font-family:var(--font-display); font-size:.8rem; font-weight:600; cursor:pointer; transition:all .2s; }
    .role-toggle button.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
  `]
})
export class RegisterComponent {
  form    = { name:'', email:'', phone:'', password:'', role:'customer', district:'', area:'' };
  districts = DISTRICTS;
  loading = signal(false);
  error   = signal('');

  constructor(private auth: AuthService, private toast: ToastService, private router: Router) {}

  doRegister() {
    this.error.set('');
    const { name, email, phone, password, district } = this.form;
    if (!name || !email || !phone || !password) { this.error.set('All fields are required.'); return; }
    if (!district) { this.error.set('Please select your district.'); return; }
    if (password.length < 8) { this.error.set('Password must be at least 8 characters.'); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { this.error.set('Enter a valid 10-digit Indian mobile number.'); return; }

    this.loading.set(true);
    this.auth.register(this.form).subscribe({
      next: () => {
        this.toast.success('Account created successfully!');
        const role = this.auth.userRole();
        this.router.navigate([role === 'provider' ? '/dashboard/provider' : '/dashboard/customer']);
      },
      error: (msg: string) => { this.error.set(msg); this.loading.set(false); },
    });
  }
}
