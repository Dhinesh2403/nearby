// src/app/features/auth/provider-register.component.ts
// "Become a Provider" entry point — verifies a new mobile number via
// Firebase OTP, creates a provider account, then sends them to the
// guided profile-setup form.
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ContactLoginModalComponent } from '../../shared/components/contact-login-modal.component';
import { ToastService } from '../../core/services/toast.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-provider-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ContactLoginModalComponent],
  template: `
    <div class="pr-wrap">
      <div class="pr-card">
        <div class="pr-icon"><i class="bi bi-briefcase-fill"></i></div>
        <h1 class="pr-title">Grow your business on <span>NearbyPro</span></h1>
        <p class="pr-sub">List your services free and reach thousands of nearby customers.
          Get found, get contacted, get more work.</p>

        <ul class="pr-benefits">
          <li><i class="bi bi-check-circle-fill"></i> Free listing — no commission</li>
          <li><i class="bi bi-check-circle-fill"></i> Direct call &amp; WhatsApp from customers</li>
          <li><i class="bi bi-check-circle-fill"></i> See who viewed your profile</li>
        </ul>

        @if (registrationsClosed()) {
          <div class="pr-closed">
            <i class="bi bi-lock-fill"></i>
            <p>New provider registrations are temporarily closed. Please check back soon.</p>
          </div>
        } @else {
          <button class="btn-nb-accent btn btn-lg w-100" (click)="showModal.set(true)">
            <i class="bi bi-phone me-2"></i>Get started
          </button>
        }

        <p class="pr-alt">
          Already a provider? <a routerLink="/auth/login">Sign in</a>
        </p>
      </div>
    </div>

    @if (showModal()) {
      <app-contact-login-modal
        role="provider"
        (verified)="onVerified()"
        (closed)="showModal.set(false)" />
    }
  `,
  styles: [`
    .pr-wrap { min-height:calc(100vh - 65px); display:flex; align-items:center; justify-content:center; padding:2rem 1rem; background:linear-gradient(145deg,#0F2744,#1A3C5E); }
    .pr-card { background:#fff; border-radius:var(--radius-xl); padding:2.5rem; max-width:460px; width:100%; box-shadow:var(--shadow-lg); text-align:center; }
    .pr-icon { width:64px; height:64px; border-radius:18px; background:var(--nb-accent); color:var(--nb-primary); display:flex; align-items:center; justify-content:center; font-size:1.8rem; margin:0 auto 1.25rem; }
    .pr-title { font-family:var(--font-display); font-size:1.6rem; font-weight:800; margin:0 0 .5rem; }
    .pr-title span { color:var(--nb-accent); }
    .pr-sub { color:var(--nb-text-muted); font-size:.9rem; margin-bottom:1.5rem; }
    .pr-benefits { list-style:none; padding:0; margin:0 0 1.75rem; text-align:left; display:flex; flex-direction:column; gap:8px; }
    .pr-benefits li { display:flex; align-items:center; gap:10px; font-size:.875rem; font-weight:500; }
    .pr-benefits i { color:var(--nb-success); }
    .pr-alt { font-size:.8rem; color:var(--nb-text-muted); margin:1rem 0 0; }
    .pr-alt a { font-weight:600; }
    .pr-closed { display:flex; gap:10px; align-items:flex-start; text-align:left; background:#FEF3C7; border-radius:var(--radius-md); padding:14px 16px; }
    .pr-closed i { color:var(--nb-warning); font-size:1.2rem; margin-top:2px; }
    .pr-closed p { margin:0; font-size:.875rem; font-weight:500; color:var(--nb-text); }
  `]
})
export class ProviderRegisterComponent {
  showModal = signal(false);

  constructor(private router: Router, private toast: ToastService, private settings: SettingsService) {}

  // Admin can freeze new provider signups (5.12). Defaults to open until
  // settings load so we never wrongly block while the fetch is in flight.
  registrationsClosed(): boolean {
    return this.settings.settings()?.registrationsEnabled === false;
  }

  onVerified() {
    this.showModal.set(false);
    this.toast.success('Welcome aboard! Let\'s set up your profile.');
    // Send to the guided profile-creation form (create mode).
    this.router.navigate(['/provider/services']);
  }
}
