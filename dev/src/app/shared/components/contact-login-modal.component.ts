// src/app/shared/components/contact-login-modal.component.ts
// Popup shown when a guest clicks Call / WhatsApp.
// Smart flow (mirrors the full login page):
//   phone → check-phone
//     • returning user WITH password  → password step (sign in, no OTP)
//     • returning user WITHOUT password → OTP → set password
//     • first-time number             → OTP → profile → set password
// OTP is only ever asked once (first verification). After that the number is
// "already verified" and the user signs in with their password.
import { Component, signal, input, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseAuthService } from '../../core/auth/firebase-auth.service';
import { AuthService } from '../../core/auth/auth.service';
import { SettingsService } from '../../core/services/settings.service';

type Step = 'phone' | 'password' | 'otp' | 'profile' | 'setpass';
type Flow = 'password' | 'otp' | 'direct';

@Component({
  selector: 'app-contact-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="clm-backdrop" (click)="close()">
      <div class="clm-card" (click)="$event.stopPropagation()">
        <button class="clm-x" (click)="close()" aria-label="Close"><i class="bi bi-x-lg"></i></button>

        <!-- Step indicator (adapts to the password vs OTP flow) -->
        <div class="clm-steps">
          @for (st of stepList(); track st.label; let i = $index) {
            @if (i > 0) { <div class="clm-step-line" [class.done]="st.done || st.active"></div> }
            <div class="clm-step" [class.active]="st.active" [class.done]="st.done">
              <span class="clm-step-dot">
                <i class="bi bi-check-lg" *ngIf="st.done"></i>
                <span *ngIf="!st.done">{{ i + 1 }}</span>
              </span>
              <span class="clm-step-label">{{ st.label }}</span>
            </div>
          }
        </div>

        <!-- STEP: Phone -->
        @if (step() === 'phone') {
          <div class="clm-head">
            <div class="clm-icon"><i class="bi bi-phone"></i></div>
            <h5>Continue with your number</h5>
            <p>We'll check if you've verified before — no repeat OTP needed.</p>
          </div>
          <label class="nb-label">Mobile number</label>
          <div class="clm-phone">
            <span class="clm-cc">+91</span>
            <input type="tel" class="nb-input" maxlength="10" inputmode="numeric"
                   [(ngModel)]="phone" placeholder="98765 43210"
                   (keyup.enter)="onContinue()" />
          </div>
          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }
          <button class="btn-nb-primary btn w-100 mt-3" [disabled]="busy()" (click)="onContinue()">
            @if (busy()) { <span class="clm-spinner"></span> Checking… } @else { Continue <i class="bi bi-arrow-right ms-1"></i> }
          </button>
        }

        <!-- STEP: Password (returning user, already verified) -->
        @if (step() === 'password') {
          <div class="clm-head">
            <div class="clm-icon clm-icon--green"><i class="bi bi-shield-check"></i></div>
            <h5>Welcome back!</h5>
            <p>This number is already verified. Enter your password to continue.
              <button class="clm-link" (click)="back()">Change</button></p>
          </div>
          <label class="nb-label">Password</label>
          <div class="clm-eye">
            <input [type]="showPass ? 'text' : 'password'" class="nb-input"
                   [(ngModel)]="password" placeholder="••••••••" (keyup.enter)="doLogin()" />
            <button class="clm-eye-btn" type="button" (click)="showPass = !showPass">
              <i class="bi" [class.bi-eye]="!showPass" [class.bi-eye-slash]="showPass"></i>
            </button>
          </div>
          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }
          <button class="btn-nb-primary btn w-100 mt-3" [disabled]="busy()" (click)="doLogin()">
            @if (busy()) { <span class="clm-spinner"></span> Signing in… } @else { Sign In <i class="bi bi-arrow-right ms-1"></i> }
          </button>
          <p class="clm-forgot">
            <button class="clm-link" (click)="doForgot()" [disabled]="busy()">
              <i class="bi bi-shield-lock me-1"></i>Forgot password? Reset via OTP
            </button>
          </p>
        }

        <!-- STEP: OTP (first-time verification only) -->
        @if (step() === 'otp') {
          <div class="clm-head">
            <div class="clm-icon clm-icon--green"><i class="bi bi-shield-lock"></i></div>
            <h5>Enter the code</h5>
            <p>Sent to +91 {{ phone }}. <button class="clm-link" (click)="back()">Change</button></p>
          </div>
          <label class="nb-label">6-digit OTP</label>
          <input type="text" class="nb-input clm-otp" maxlength="6" inputmode="numeric"
                 [(ngModel)]="code" placeholder="••••••" (keyup.enter)="confirmOtp()" />
          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }
          <button class="btn-nb-primary btn w-100 mt-3" [disabled]="busy()" (click)="confirmOtp()">
            @if (busy()) { <span class="clm-spinner"></span> Verifying… } @else { Verify & Continue <i class="bi bi-arrow-right ms-1"></i> }
          </button>
          <p class="clm-forgot">
            <button class="clm-link" (click)="sendOtp()" [disabled]="busy()">
              <i class="bi bi-arrow-clockwise me-1"></i>Resend code
            </button>
          </p>
        }

        <!-- STEP: Profile (new users only) -->
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
            @if (busy()) { <span class="clm-spinner"></span> Saving… } @else { Next — Set Password <i class="bi bi-arrow-right ms-1"></i> }
          </button>
        }

        <!-- STEP: Set password (after first-time OTP / forgot) -->
        @if (step() === 'setpass') {
          <div class="clm-head">
            <div class="clm-icon clm-icon--purple"><i class="bi bi-shield-lock-fill"></i></div>
            <h5>{{ isForgot ? 'Set a new password' : 'Create a password' }}</h5>
            <p>You'll use this next time instead of an OTP.</p>
          </div>

          <div class="mb-3">
            <label class="nb-label">New password <span class="clm-required">*</span></label>
            <div class="clm-eye">
              <input [type]="showNewPass ? 'text' : 'password'" class="nb-input"
                     [(ngModel)]="newPassword" placeholder="Min 6 characters" (keyup.enter)="doSetPassword()" />
              <button class="clm-eye-btn" type="button" (click)="showNewPass = !showNewPass">
                <i class="bi" [class.bi-eye]="!showNewPass" [class.bi-eye-slash]="showNewPass"></i>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="nb-label">Confirm password <span class="clm-required">*</span></label>
            <div class="clm-eye">
              <input [type]="showConfPass ? 'text' : 'password'" class="nb-input"
                     [(ngModel)]="confirmPassword" placeholder="Repeat password" (keyup.enter)="doSetPassword()" />
              <button class="clm-eye-btn" type="button" (click)="showConfPass = !showConfPass">
                <i class="bi" [class.bi-eye]="!showConfPass" [class.bi-eye-slash]="showConfPass"></i>
              </button>
            </div>
            @if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
              <p class="clm-err"><i class="bi bi-x-circle me-1"></i>Passwords don't match</p>
            }
          </div>

          @if (error()) { <p class="clm-err"><i class="bi bi-exclamation-circle me-1"></i>{{ error() }}</p> }

          <button class="btn-nb-primary btn w-100 mt-1" [disabled]="busy()" (click)="doSetPassword()">
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
    .clm-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:2000; display:flex; align-items:center; justify-content:center; padding:1rem; animation:clmFade .2s ease-out; overflow-y:auto; }
    @keyframes clmFade { from { opacity:0; } to { opacity:1; } }
    .clm-card { background:#fff; border-radius:var(--radius-lg); padding:1.75rem; width:min(420px,100%); position:relative; box-shadow:var(--shadow-lg); animation:clmUp .3s cubic-bezier(.4,0,.2,1); max-height:calc(100vh - 2rem); overflow-y:auto; margin:auto; }
    /* On small phones shift card to top so keyboard doesn't push it off-screen */
    @media (max-width:480px) { .clm-backdrop { align-items:flex-start; } .clm-card { margin:auto; padding:1.25rem; } }
    @keyframes clmUp { from { opacity:0; transform:translateY(20px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
    .clm-x { position:absolute; top:12px; right:12px; z-index:2; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--nb-surface-2); border:none; font-size:.9rem; color:var(--nb-text-muted); cursor:pointer; transition:color .15s, background .15s; }
    .clm-x:hover { color:var(--nb-danger); background:var(--nb-surface); }

    /* Step indicator — extra top room so it clears the close button */
    .clm-steps { display:flex; align-items:center; justify-content:center; gap:0; margin-top:1.25rem; margin-bottom:1.5rem; }
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
    .clm-eye { position:relative; }
    .clm-eye .nb-input { padding-right:44px; }
    .clm-eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--nb-text-muted); cursor:pointer; padding:4px; font-size:1rem; transition:color .15s; }
    .clm-eye-btn:hover { color:var(--nb-text); }
    .clm-err { color:var(--nb-danger); font-size:.8rem; margin:.5rem 0 0; }
    .clm-link { background:none; border:none; color:var(--nb-primary); font-weight:600; cursor:pointer; padding:0; font-size:.85rem; }
    .clm-link:disabled { opacity:.4; cursor:not-allowed; }
    .clm-forgot { text-align:center; margin:1rem 0 0; }
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

  step  = signal<Step>('phone');
  // 'password' = returning verified user signs in; 'otp' = first-time verification;
  // 'direct' = OTP disabled by admin, set a password without verification.
  flow  = signal<Flow | null>(null);
  busy  = signal(false);
  error = signal<string | null>(null);

  phone    = '';
  password = '';
  showPass = false;
  code     = '';

  // Step: profile fields (new users)
  profileName  = '';
  profileCity  = '';
  profileEmail = '';

  // Step: set password
  newPassword     = '';
  confirmPassword = '';
  showNewPass  = false;
  showConfPass = false;

  // Stored after OTP confirm, used in saveProfile()/doSetPassword()
  private pendingToken = '';
  private isNewUser    = false;
  isForgot             = false;

  constructor(
    public fb: FirebaseAuthService,
    private auth: AuthService,
    private settings: SettingsService,
    private cdr: ChangeDetectorRef,
  ) {}

  // Step indicator entries for the current flow.
  stepList(): { label: string; active: boolean; done: boolean }[] {
    const s = this.step();
    if (this.flow() === 'password') {
      return [
        { label: 'Mobile',   active: s === 'phone',    done: s !== 'phone' },
        { label: 'Sign in',  active: s === 'password', done: false },
      ];
    }
    if (this.flow() === 'direct') {
      // OTP disabled — no verify step. New users still get a details step.
      const order: Step[]   = this.isNewUser ? ['phone', 'profile', 'setpass'] : ['phone', 'setpass'];
      const labels: string[] = this.isNewUser ? ['Mobile', 'Details', 'Finish'] : ['Mobile', 'Finish'];
      const idx = Math.max(0, order.indexOf(s));
      return labels.map((label, i) => ({ label, active: i === idx, done: i < idx }));
    }
    // OTP flow (default / unknown)
    const order: Step[] = ['phone', 'otp', s === 'profile' ? 'profile' : 'setpass'];
    const idx = Math.max(0, order.indexOf(s));
    const labels = ['Mobile', 'Verify', 'Finish'];
    return labels.map((label, i) => ({ label, active: i === idx, done: i < idx }));
  }

  // ── Phone step: decide password vs OTP ──────────────────────────────
  onContinue() {
    this.error.set(null);
    if (!/^\d{10}$/.test(this.phone)) { this.error.set('Enter a valid 10-digit number.'); return; }
    this.busy.set(true);
    this.auth.checkPhone(this.phone).subscribe({
      next: (res: any) => {
        const { exists, hasPassword } = res.data ?? res;
        this.busy.set(false);
        if (exists && hasPassword) {
          // Already verified before → just ask for the password.
          this.flow.set('password');
          this.step.set('password');
          this.cdr.detectChanges();
        } else if (!this.settings.otpRequired(this.role())) {
          // OTP disabled by admin → skip verification entirely.
          // New numbers collect a profile first; existing ones just set a password.
          this.isNewUser = !exists;
          this.flow.set('direct');
          this.step.set(this.isNewUser ? 'profile' : 'setpass');
          this.cdr.detectChanges();
        } else {
          // First time, or verified but never set a password → OTP.
          this.flow.set('otp');
          this.sendOtp();
        }
      },
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); this.cdr.detectChanges(); },
    });
  }

  // ── Password login (returning verified user) ────────────────────────
  doLogin() {
    this.error.set(null);
    if (!this.password) { this.error.set('Please enter your password.'); return; }
    this.busy.set(true);
    this.auth.loginPhone(this.phone, this.password).subscribe({
      next: () => { this.busy.set(false); this.verified.emit(); },
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); this.cdr.detectChanges(); },
    });
  }

  // ── Forgot password → reset (via OTP, or directly when OTP is off) ───
  doForgot() {
    this.isForgot = true;
    this.error.set(null);
    if (!this.settings.otpRequired(this.role())) {
      // OTP disabled → reset the password directly, no verification step.
      this.flow.set('direct');
      this.step.set('setpass');
      this.cdr.detectChanges();
      return;
    }
    this.flow.set('otp');
    this.sendOtp();
  }

  // ── Send OTP via Firebase ───────────────────────────────────────────
  async sendOtp() {
    this.error.set(null);
    if (!this.fb.isConfigured) {
      this.busy.set(false);
      this.error.set('OTP is not configured on this build yet.');
      return;
    }
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

  // ── Confirm OTP → new user (profile) or set password ────────────────
  async confirmOtp() {
    this.error.set(null);
    if (!/^\d{6}$/.test(this.code)) { this.error.set('Enter the 6-digit code.'); return; }
    this.busy.set(true);
    try {
      const idToken = await this.fb.confirmOtp(this.code);
      this.pendingToken = idToken;
      this.auth.firebaseCheck(idToken).subscribe({
        next: (res: any) => {
          this.busy.set(false);
          this.isNewUser = !!(res.data?.isNewUser ?? res.isNewUser);
          this.step.set(this.isNewUser ? 'profile' : 'setpass');
          this.cdr.detectChanges();
        },
        error: (msg: string) => { this.busy.set(false); this.error.set(msg); this.cdr.detectChanges(); },
      });
    } catch {
      this.busy.set(false);
      this.error.set('Incorrect or expired code.');
      this.cdr.detectChanges();
    }
  }

  // ── Profile step → set password ─────────────────────────────────────
  saveProfile() {
    this.error.set(null);
    if (!this.profileName.trim()) { this.error.set('Please enter your name.'); return; }
    if (!this.profileCity.trim()) { this.error.set('Please enter your city or place.'); return; }
    if (this.profileEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.profileEmail)) {
      this.error.set('Enter a valid email address or leave it blank.'); return;
    }
    this.step.set('setpass');
    this.cdr.detectChanges();
  }

  // ── Set password → create/verify account and finish ─────────────────
  doSetPassword() {
    this.error.set(null);
    if (this.newPassword.length < 6)              { this.error.set('Password must be at least 6 characters.'); return; }
    if (this.newPassword !== this.confirmPassword) { this.error.set('Passwords do not match.'); return; }

    const profile = this.isNewUser
      ? { name: this.profileName.trim(), city: this.profileCity.trim(), email: this.profileEmail.trim() || undefined }
      : undefined;

    this.busy.set(true);
    // OTP disabled → register without a Firebase token; otherwise exchange the verified token.
    const req$ = this.flow() === 'direct'
      ? this.auth.registerDirect(this.phone, this.role(), profile, this.newPassword, this.isForgot)
      : this.auth.firebaseVerify(this.pendingToken, this.role(), profile, this.newPassword);
    req$.subscribe({
      next: () => { this.busy.set(false); this.verified.emit(); },
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); this.cdr.detectChanges(); },
    });
  }

  back() {
    this.step.set('phone');
    this.flow.set(null);
    this.code = '';
    this.password = '';
    this.isForgot = false;
    this.error.set(null);
    this.fb.reset();
  }
  close() { this.fb.reset(); this.closed.emit(); }
}
