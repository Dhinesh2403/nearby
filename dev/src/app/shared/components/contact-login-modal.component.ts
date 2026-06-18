// src/app/shared/components/contact-login-modal.component.ts
// Popup shown when a guest clicks Call / WhatsApp. Drives the Firebase
// Phone Auth OTP flow (3 steps: phone → otp → profile), then exchanges
// the verified token for a JWT session.
// Step 3 (profile) is shown only for NEW users — returning users skip it.
import { Component, signal, input, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseAuthService } from '../../core/auth/firebase-auth.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-contact-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clm-backdrop" (click)="close()">
      <div class="clm-card" (click)="$event.stopPropagation()">
        <button class="clm-x" (click)="close()" aria-label="Close"><i class="bi bi-x-lg"></i></button>

        <!-- Step indicator -->
        <div class="clm-steps">
          <div class="clm-step" [class.active]="step() === 'phone'" [class.done]="step() === 'otp' || step() === 'profile'">
            <span class="clm-step-dot"><i class="bi bi-check-lg" *ngIf="step() === 'otp' || step() === 'profile'"></i><span *ngIf="step() === 'phone'">1</span></span>
            <span class="clm-step-label">Mobile</span>
          </div>
          <div class="clm-step-line" [class.done]="step() === 'otp' || step() === 'profile'"></div>
          <div class="clm-step" [class.active]="step() === 'otp'" [class.done]="step() === 'profile'">
            <span class="clm-step-dot"><i class="bi bi-check-lg" *ngIf="step() === 'profile'"></i><span *ngIf="step() !== 'profile'">2</span></span>
            <span class="clm-step-label">OTP</span>
          </div>
          <div class="clm-step-line" [class.done]="step() === 'profile'"></div>
          <div class="clm-step" [class.active]="step() === 'profile'">
            <span class="clm-step-dot">3</span>
            <span class="clm-step-label">Profile</span>
          </div>
        </div>

        <!-- STEP 1: Phone -->
        @if (step() === 'phone') {
          <div class="clm-head">
            <div class="clm-icon"><i class="bi bi-phone"></i></div>
            <h5>Verify your number</h5>
            <p>We'll send a one-time code to reveal contact details.</p>
          </div>
          <label class="nb-label">Mobile number</label>
          <div class="clm-phone">
            <span class="clm-cc">+91</span>
            <input type="tel" class="nb-input" maxlength="10" inputmode="numeric"
                   [(ngModel)]="phone" placeholder="98765 43210"
                   (keyup.enter)="sendOtp()" />
          </div>
          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }
          <button class="btn-nb-primary btn w-100 mt-3" [disabled]="busy()" (click)="sendOtp()">
            @if (busy()) { <span class="clm-spinner"></span> Sending… } @else { Send OTP <i class="bi bi-arrow-right ms-1"></i> }
          </button>
        }

        <!-- STEP 2: OTP -->
        @if (step() === 'otp') {
          <div class="clm-head">
            <div class="clm-icon clm-icon--green"><i class="bi bi-shield-lock"></i></div>
            <h5>Enter the code</h5>
            <p>Sent to +91 {{ phone }}. <button class="clm-link" (click)="back()">Change</button></p>
          </div>
          <label class="nb-label">6-digit OTP</label>
          <input type="text" class="nb-input clm-otp" maxlength="6" inputmode="numeric"
                 [(ngModel)]="code" placeholder="••••••" (keyup.enter)="confirm()" />
          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }
          <button class="btn-nb-primary btn w-100 mt-3" [disabled]="busy()" (click)="confirm()">
            @if (busy()) { <span class="clm-spinner"></span> Verifying… } @else { Verify & Continue <i class="bi bi-arrow-right ms-1"></i> }
          </button>
        }

        <!-- STEP 3: Profile (new users only) -->
        @if (step() === 'profile') {
          <div class="clm-head">
            <div class="clm-icon clm-icon--purple"><i class="bi bi-person-circle"></i></div>
            <h5>Almost there!</h5>
            <p>Tell us a little about yourself to complete your profile.</p>
          </div>

          <div class="mb-3">
            <label class="nb-label">Your name <span class="clm-required">*</span></label>
            <input type="text" class="nb-input" [(ngModel)]="profileName"
                   placeholder="e.g. Dhinesh Kumar" maxlength="80" />
          </div>

          <div class="mb-3">
            <label class="nb-label">City / Place <span class="clm-required">*</span></label>
            <input type="text" class="nb-input" [(ngModel)]="profileCity"
                   placeholder="e.g. Coimbatore" maxlength="80" />
          </div>

          <div class="mb-3">
            <label class="nb-label">Email <span class="clm-optional">(optional)</span></label>
            <input type="email" class="nb-input" [(ngModel)]="profileEmail"
                   placeholder="you@example.com" maxlength="120" />
          </div>

          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }

          <button class="btn-nb-primary btn w-100 mt-1" [disabled]="busy()" (click)="saveProfile()">
            @if (busy()) { <span class="clm-spinner"></span> Saving… } @else { Done — Let me in <i class="bi bi-check-lg ms-1"></i> }
          </button>
        }

        <!-- invisible reCAPTCHA host -->
        <div id="clm-recaptcha"></div>

        @if (!fb.isConfigured) {
          <p class="clm-note">
            <i class="bi bi-info-circle"></i>
            Firebase keys not set yet — paste them into <code>environment.ts</code> to enable OTP.
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .clm-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:2000; display:flex; align-items:center; justify-content:center; padding:1rem; animation:clmFade .2s ease-out; }
    @keyframes clmFade { from { opacity:0; } to { opacity:1; } }
    .clm-card { background:#fff; border-radius:var(--radius-lg); padding:1.75rem; width:min(420px,100%); position:relative; box-shadow:var(--shadow-lg); animation:clmUp .3s cubic-bezier(.4,0,.2,1); }
    @keyframes clmUp { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    .clm-x { position:absolute; top:14px; right:14px; background:none; border:none; font-size:1rem; color:var(--nb-text-muted); cursor:pointer; transition:color .15s; }
    .clm-x:hover { color:var(--nb-danger); }

    /* Step indicator */
    .clm-steps { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:1.5rem; }
    .clm-step { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .clm-step-dot { width:28px; height:28px; border-radius:50%; border:2px solid var(--nb-border); background:#fff; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:var(--nb-text-muted); transition:all .3s; }
    .clm-step.active .clm-step-dot { border-color:var(--nb-primary); background:var(--nb-primary); color:#fff; }
    .clm-step.done .clm-step-dot { border-color:#22c55e; background:#22c55e; color:#fff; }
    .clm-step-label { font-size:.65rem; font-weight:600; color:var(--nb-text-muted); text-transform:uppercase; letter-spacing:.04em; }
    .clm-step.active .clm-step-label { color:var(--nb-primary); }
    .clm-step.done .clm-step-label { color:#22c55e; }
    .clm-step-line { flex:1; height:2px; background:var(--nb-border); margin:0 6px; margin-bottom:18px; transition:background .3s; min-width:32px; }
    .clm-step-line.done { background:#22c55e; }

    .clm-head { text-align:center; margin-bottom:1.25rem; }
    .clm-icon { width:56px; height:56px; border-radius:16px; background:#EFF6FF; color:var(--nb-primary); display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto .75rem; }
    .clm-icon--green { background:#f0fdf4; color:#22c55e; }
    .clm-icon--purple { background:#faf5ff; color:#a855f7; }
    .clm-head h5 { font-family:var(--font-display); font-weight:800; margin:0 0 4px; }
    .clm-head p { font-size:.85rem; color:var(--nb-text-muted); margin:0; }

    .clm-phone { display:flex; align-items:stretch; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); overflow:hidden; background:var(--nb-surface); transition:border-color .2s, box-shadow .2s; }
    .clm-phone:focus-within { border-color:var(--nb-primary-light); box-shadow:0 0 0 3px color-mix(in srgb, var(--nb-primary) 12%, transparent); }
    .clm-cc { display:flex; align-items:center; padding:0 12px; background:var(--nb-surface-2); border-right:1.5px solid var(--nb-border); font-family:var(--font-display); font-size:.88rem; font-weight:600; color:var(--nb-text-muted); white-space:nowrap; user-select:none; }
    .clm-phone .nb-input { border:none; border-radius:0; background:transparent; box-shadow:none; }
    .clm-otp { text-align:center; letter-spacing:.5em; font-size:1.3rem; font-weight:700; }
    .clm-err { color:var(--nb-danger); font-size:.8rem; margin:.5rem 0 0; }
    .clm-link { background:none; border:none; color:var(--nb-primary); font-weight:600; cursor:pointer; padding:0; font-size:.85rem; }
    .clm-required { color:var(--nb-danger); }
    .clm-optional { color:var(--nb-text-muted); font-weight:400; font-size:.75rem; }
    .clm-note { font-size:.72rem; color:var(--nb-text-muted); margin:1rem 0 0; display:flex; gap:6px; align-items:flex-start; }
    .clm-note i { color:var(--nb-warning); }
    .clm-note code { background:var(--nb-surface-2); padding:1px 5px; border-radius:4px; }
    .clm-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite; margin-right:6px; vertical-align:middle; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class ContactLoginModalComponent {
  role     = input<'customer' | 'provider'>('customer');
  verified = output<void>();
  closed   = output<void>();

  step  = signal<'phone' | 'otp' | 'profile'>('phone');
  busy  = signal(false);
  error = signal<string | null>(null);

  phone = '';
  code  = '';

  // Step 3 — profile fields
  profileName  = '';
  profileCity  = '';
  profileEmail = '';

  // Stored after OTP confirm, used in saveProfile()
  private pendingToken = '';
  private isNewUser    = false;

  constructor(
    public fb: FirebaseAuthService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  async sendOtp() {
    this.error.set(null);
    if (!/^\d{10}$/.test(this.phone)) { this.error.set('Enter a valid 10-digit number.'); return; }
    if (!this.fb.isConfigured) { this.error.set('OTP is not configured on this build yet.'); return; }
    this.busy.set(true);
    try {
      await this.fb.sendOtp(`+91${this.phone}`, 'clm-recaptcha');
      this.step.set('otp');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not send OTP. Try again.');
      this.fb.reset();
    } finally {
      this.busy.set(false);
      this.cdr.detectChanges();
    }
  }

  async confirm() {
    this.error.set(null);
    if (!/^\d{6}$/.test(this.code)) { this.error.set('Enter the 6-digit code.'); return; }
    this.busy.set(true);
    try {
      const idToken = await this.fb.confirmOtp(this.code);
      // Check if this is a new or existing user before saving profile
      this.pendingToken = idToken;
      this.auth.firebaseCheck(idToken).subscribe({
        next: (res: any) => {
          this.busy.set(false);
          if (res.isNewUser) {
            // New user → collect profile details
            this.isNewUser = true;
            this.step.set('profile');
          } else {
            // Returning user → verify and proceed
            this.finalizeLogin();
          }
          this.cdr.detectChanges();
        },
        error: (msg: string) => {
          this.busy.set(false);
          this.error.set(msg);
          this.cdr.detectChanges();
        },
      });
    } catch (e: any) {
      this.busy.set(false);
      this.error.set('Incorrect or expired code.');
      this.cdr.detectChanges();
    }
  }

  saveProfile() {
    this.error.set(null);
    if (!this.profileName.trim()) { this.error.set('Please enter your name.'); return; }
    if (!this.profileCity.trim()) { this.error.set('Please enter your city or place.'); return; }
    if (this.profileEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.profileEmail)) {
      this.error.set('Enter a valid email address or leave it blank.'); return;
    }
    this.finalizeLogin({
      name:  this.profileName.trim(),
      city:  this.profileCity.trim(),
      email: this.profileEmail.trim() || undefined,
    });
  }

  private finalizeLogin(profile?: { name?: string; city?: string; email?: string }) {
    this.busy.set(true);
    this.auth.firebaseVerify(this.pendingToken, this.role(), profile).subscribe({
      next: () => { this.busy.set(false); this.verified.emit(); },
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); this.cdr.detectChanges(); },
    });
  }

  back()  { this.step.set('phone'); this.code = ''; this.error.set(null); this.fb.reset(); }
  close() { this.fb.reset(); this.closed.emit(); }
}
