// Unified auth page.
// Login  → phone → password → dashboard  (forgot: phone → OTP → set password)
// Sign Up → phone → OTP → profile (new users) → set password → dashboard
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FirebaseAuthService } from '../../core/auth/firebase-auth.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';

type Mode = 'login' | 'signup';
type Step = 'phone' | 'password' | 'otp' | 'profile' | 'setpass';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">

      <!-- ── Left branding panel ── -->
      <div class="auth-left d-none d-lg-flex">
        <div class="al-inner">
          <div class="al-brand">Near<span>By</span></div>
          <h2 class="al-tagline">Find trusted local<br>services near you</h2>
          <div class="al-features">
            @for (f of features; track f.text) {
              <div class="al-feat">
                <div class="al-icon"><i class="bi" [class]="f.icon"></i></div>
                <span>{{ f.text }}</span>
              </div>
            }
          </div>
          <div class="al-footer">Trusted by 10,000+ people in Chennai</div>
        </div>
      </div>

      <!-- ── Right form panel ── -->
      <div class="auth-right">
        <div class="auth-card">

          <!-- Mobile brand -->
          <div class="d-lg-none text-center mb-4">
            <div class="mb-brand">Near<span>By</span></div>
          </div>

          <!-- Back + progress bar — non-phone steps -->
          @if (step() !== 'phone') {
            <div class="step-nav">
              <button class="back-btn" type="button" (click)="goBack()">
                <i class="bi bi-arrow-left me-1"></i>Back
              </button>
              <div class="prog-track"><div class="prog-fill" [style.width.%]="progress"></div></div>
            </div>
          }

          <!-- Error message -->
          @if (error()) {
            <div class="auth-err">
              <i class="bi bi-exclamation-circle-fill me-2"></i>{{ error() }}
            </div>
          }

          <!-- ── PHONE STEP ── -->
          @if (step() === 'phone') {
            <div class="step-body">
              <h2 class="step-title">{{ mode()==='login' ? 'Welcome back' : 'Create account' }}</h2>
              <p class="step-sub">{{ mode()==='login' ? 'Enter your mobile number to sign in' : 'Enter your mobile number to get started' }}</p>
              <label class="nb-label">Mobile number</label>
              <div class="phone-row">
                <span class="cc">🇮🇳 +91</span>
                <input type="tel" class="nb-input" [(ngModel)]="phone"
                       maxlength="10" inputmode="numeric" placeholder="98765 43210"
                       (keyup.enter)="onContinue()" />
              </div>
              @if (!fb.isConfigured && mode()==='signup') {
                <p class="cfg-note"><i class="bi bi-info-circle me-1"></i>Firebase OTP not configured on this build</p>
              }
              <button class="auth-btn mt-3" type="button" (click)="onContinue()" [disabled]="busy()">
                @if (busy()) { <span class="mini-spin"></span>Checking… }
                @else { {{ mode()==='login' ? 'Continue' : 'Send OTP' }} <i class="bi bi-arrow-right ms-1"></i> }
              </button>
              <p class="switch-hint">
                @if (mode()==='login') {
                  No account? <button class="link-btn" type="button" (click)="setMode('signup')">Sign up free</button>
                } @else {
                  Already have an account? <button class="link-btn" type="button" (click)="setMode('login')">Login</button>
                }
              </p>
            </div>
          }

          <!-- ── PASSWORD STEP (login) ── -->
          @if (step() === 'password') {
            <div class="step-body">
              <div class="phone-badge">
                <i class="bi bi-phone me-2"></i>+91 {{ phone }}
                <button class="chg-btn" type="button" (click)="goBack()">Change</button>
              </div>
              <h2 class="step-title">Enter your password</h2>
              <p class="step-sub">Sign in to your NearBy account</p>
              <label class="nb-label">Password</label>
              <div class="inp-eye">
                <input [type]="showPass ? 'text' : 'password'" class="nb-input"
                       [(ngModel)]="password" placeholder="••••••••" (keyup.enter)="doLogin()" />
                <button class="eye-btn" type="button" (click)="showPass = !showPass">
                  <i class="bi" [class.bi-eye]="!showPass" [class.bi-eye-slash]="showPass"></i>
                </button>
              </div>
              <button class="auth-btn mt-3" type="button" (click)="doLogin()" [disabled]="busy()">
                @if (busy()) { <span class="mini-spin"></span>Signing in… }
                @else { Sign In <i class="bi bi-arrow-right ms-1"></i> }
              </button>
              <p class="forgot-row">
                <button class="link-btn" type="button" (click)="doForgot()" [disabled]="busy()">
                  <i class="bi bi-shield-lock me-1"></i>Forgot password? Reset via OTP
                </button>
              </p>
            </div>
          }

          <!-- ── OTP STEP ── -->
          @if (step() === 'otp') {
            <div class="step-body">
              <div class="otp-hero"><i class="bi bi-phone-vibrate"></i></div>
              <h2 class="step-title">Check your phone</h2>
              <p class="step-sub">We sent a 6-digit code to<br><strong>+91 {{ phone }}</strong></p>
              <label class="nb-label">Verification code</label>
              <input type="text" class="nb-input otp-inp" [(ngModel)]="code"
                     maxlength="6" inputmode="numeric" placeholder="— — — — — —"
                     (keyup.enter)="confirmOtp()" />
              <button class="auth-btn mt-3" type="button" (click)="confirmOtp()" [disabled]="busy()">
                @if (busy()) { <span class="mini-spin"></span>Verifying… }
                @else { Verify & Continue <i class="bi bi-arrow-right ms-1"></i> }
              </button>
              <p class="forgot-row">
                <button class="link-btn" type="button" (click)="sendOtp()" [disabled]="busy()">
                  <i class="bi bi-arrow-clockwise me-1"></i>Resend code
                </button>
              </p>
            </div>
          }

          <!-- ── PROFILE STEP (new users) ── -->
          @if (step() === 'profile') {
            <div class="step-body">
              <div class="prof-hero"><i class="bi bi-person-circle"></i></div>
              <h2 class="step-title">Almost there!</h2>
              <p class="step-sub">A few quick details to set up your profile</p>
              <div class="mb-3">
                <label class="nb-label">Full name <span class="req">*</span></label>
                <input type="text" class="nb-input" [(ngModel)]="profileName"
                       placeholder="e.g. Priya Kumar" maxlength="80" />
              </div>
              <div class="mb-3">
                <label class="nb-label">City / District <span class="req">*</span></label>
                <input type="text" class="nb-input" [(ngModel)]="profileCity"
                       placeholder="e.g. Chennai" maxlength="80" />
              </div>
              <div class="mb-4">
                <label class="nb-label">I'm joining as</label>
                <div class="role-pick">
                  <button type="button" [class.active]="profileRole==='customer'" (click)="profileRole='customer'">
                    <i class="bi bi-person-fill rp-icon"></i>
                    <div><strong>Customer</strong><small>Find & hire services</small></div>
                  </button>
                  <button type="button" [class.active]="profileRole==='provider'" (click)="profileRole='provider'">
                    <i class="bi bi-briefcase-fill rp-icon"></i>
                    <div><strong>Provider</strong><small>Offer your services</small></div>
                  </button>
                </div>
              </div>
              <button class="auth-btn" type="button" (click)="saveProfileAndContinue()">
                Next — Set Password <i class="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          }

          <!-- ── SET PASSWORD STEP ── -->
          @if (step() === 'setpass') {
            <div class="step-body">
              <div class="lock-hero"><i class="bi bi-shield-lock-fill"></i></div>
              @if (isForgot) {
                <h2 class="step-title">Set new password</h2>
                <p class="step-sub">Choose a new secure password for your account</p>
              } @else {
                <h2 class="step-title">Create your password</h2>
                <p class="step-sub">You'll use this password to sign in next time</p>
              }
              <div class="mb-3">
                <label class="nb-label">New password <span class="req">*</span></label>
                <div class="inp-eye">
                  <input [type]="showNewPass ? 'text' : 'password'" class="nb-input"
                         [(ngModel)]="newPassword" placeholder="Min 6 characters"
                         (keyup.enter)="doSetPassword()" />
                  <button class="eye-btn" type="button" (click)="showNewPass = !showNewPass">
                    <i class="bi" [class.bi-eye]="!showNewPass" [class.bi-eye-slash]="showNewPass"></i>
                  </button>
                </div>
                @if (newPassword.length > 0) {
                  <div class="strength-wrap">
                    <div class="strength-track">
                      <div class="strength-bar" [style.width.%]="passStrength * 20" [style.background]="passStrengthColor"></div>
                    </div>
                    <span class="strength-lbl" [style.color]="passStrengthColor">{{ passStrengthLabel }}</span>
                  </div>
                }
              </div>
              <div class="mb-4">
                <label class="nb-label">Confirm password <span class="req">*</span></label>
                <div class="inp-eye">
                  <input [type]="showConfPass ? 'text' : 'password'" class="nb-input"
                         [(ngModel)]="confirmPassword" placeholder="Repeat password"
                         (keyup.enter)="doSetPassword()" />
                  <button class="eye-btn" type="button" (click)="showConfPass = !showConfPass">
                    <i class="bi" [class.bi-eye]="!showConfPass" [class.bi-eye-slash]="showConfPass"></i>
                  </button>
                </div>
                @if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
                  <p class="match-err"><i class="bi bi-x-circle me-1"></i>Passwords don't match</p>
                }
                @if (confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 6) {
                  <p class="match-ok"><i class="bi bi-check-circle me-1"></i>Passwords match</p>
                }
              </div>
              <button class="auth-btn" type="button" (click)="doSetPassword()" [disabled]="busy()">
                @if (busy()) { <span class="mini-spin"></span>Saving… }
                @else { @if (isForgot) { Update Password } @else { Create Account } <i class="bi bi-check-lg ms-1"></i> }
              </button>
            </div>
          }

          <!-- invisible reCAPTCHA container -->
          <div id="login-recaptcha"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .auth-page { display:flex; min-height:calc(100vh - 65px); }
    .auth-left { flex:1; background:linear-gradient(145deg,#0F2744 0%,#1A3C5E 60%,#1e4d7a 100%); padding:3rem; flex-direction:column; justify-content:center; position:relative; overflow:hidden; }
    .auth-left::before { content:''; position:absolute; top:-30%; right:-20%; width:500px; height:500px; background:radial-gradient(circle, rgba(245,158,11,.12) 0%, transparent 70%); pointer-events:none; }
    .al-inner { max-width:380px; }
    .al-brand { font-family:var(--font-display); font-size:2.2rem; font-weight:800; color:#fff; margin-bottom:1.5rem; letter-spacing:-.02em; }
    .al-brand span { color:var(--nb-accent); }
    .al-tagline { font-size:1.85rem; font-weight:800; color:#fff; line-height:1.25; margin-bottom:2rem; }
    .al-features { display:flex; flex-direction:column; gap:14px; margin-bottom:2.5rem; }
    .al-feat { display:flex; align-items:center; gap:12px; }
    .al-icon { width:36px; height:36px; background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.25); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.95rem; color:var(--nb-accent); flex-shrink:0; }
    .al-feat span { color:rgba(255,255,255,.8); font-size:.9rem; }
    .al-footer { color:rgba(255,255,255,.35); font-size:.78rem; border-top:1px solid rgba(255,255,255,.1); padding-top:1.5rem; }

    .auth-right { flex:1; display:flex; align-items:center; justify-content:center; padding:2.5rem 1rem; background:var(--nb-bg); }
    .auth-card { background:#fff; border-radius:var(--radius-xl); border:1px solid var(--nb-border); padding:2.5rem; width:100%; max-width:440px; box-shadow:0 8px 40px rgba(0,0,0,.08); }

    .mb-brand { font-family:var(--font-display); font-size:1.6rem; font-weight:800; color:var(--nb-primary); }
    .mb-brand span { color:var(--nb-accent); }

    /* ── Step nav ── */
    .step-nav { display:flex; align-items:center; gap:12px; margin-bottom:1.5rem; }
    .back-btn { background:none; border:none; color:var(--nb-text-muted); font-size:.85rem; font-weight:600; cursor:pointer; padding:6px 10px; border-radius:8px; display:flex; align-items:center; gap:4px; transition:all .15s; white-space:nowrap; }
    .back-btn:hover { background:var(--nb-surface-2); color:var(--nb-text); }
    .prog-track { flex:1; height:4px; background:var(--nb-surface-2); border-radius:99px; overflow:hidden; }
    .prog-fill { height:100%; background:linear-gradient(90deg,var(--nb-primary),var(--nb-primary-light)); border-radius:99px; transition:width .4s cubic-bezier(.4,0,.2,1); }

    /* ── Error ── */
    .auth-err { background:#FEF2F2; border:1px solid #FECACA; color:#dc2626; border-radius:var(--radius-md); padding:10px 14px; font-size:.875rem; margin-bottom:1.25rem; display:flex; align-items:flex-start; animation:errShake .3s cubic-bezier(.36,.07,.19,.97); }
    @keyframes errShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }

    /* ── Step body ── */
    .step-body { animation:fadeSlide .25s cubic-bezier(.4,0,.2,1); }
    @keyframes fadeSlide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .step-title { font-size:1.45rem; font-weight:800; color:var(--nb-text); margin-bottom:.3rem; letter-spacing:-.02em; }
    .step-sub { color:var(--nb-text-muted); font-size:.875rem; margin-bottom:1.5rem; line-height:1.5; }

    /* ── Phone field ── */
    .phone-badge { display:inline-flex; align-items:center; background:var(--nb-surface-2); border:1px solid var(--nb-border); border-radius:99px; padding:6px 12px; font-size:.82rem; font-weight:600; color:var(--nb-text-muted); margin-bottom:1.25rem; gap:4px; }
    .chg-btn { background:none; border:none; color:var(--nb-primary); font-size:.82rem; font-weight:700; cursor:pointer; padding:0 4px; }
    .phone-row { display:flex; align-items:stretch; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); overflow:hidden; background:#fff; transition:border-color .2s,box-shadow .2s; }
    .phone-row:focus-within { border-color:var(--nb-primary-light); box-shadow:0 0 0 3px color-mix(in srgb,var(--nb-primary) 10%,transparent); }
    .cc { display:flex; align-items:center; padding:0 14px; background:var(--nb-surface-2); border-right:1.5px solid var(--nb-border); font-family:var(--font-display); font-size:.88rem; font-weight:600; color:var(--nb-text-muted); white-space:nowrap; user-select:none; gap:4px; }
    .phone-row .nb-input { border:none; border-radius:0; background:transparent; box-shadow:none; }

    /* ── Input base ── */
    .inp-eye { position:relative; }
    .inp-eye .nb-input { padding-right:44px; }
    .eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--nb-text-muted); cursor:pointer; padding:4px; font-size:1rem; transition:color .15s; }
    .eye-btn:hover { color:var(--nb-text); }

    /* ── OTP ── */
    .otp-hero { font-size:2.75rem; text-align:center; margin-bottom:1rem; color:var(--nb-primary); animation:otp-pulse 1.5s ease-in-out infinite; }
    @keyframes otp-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    .otp-inp { text-align:center; letter-spacing:.5em; padding-left:.5em; font-size:1.75rem; font-weight:800; font-family:var(--font-display); border:2px solid var(--nb-primary-light) !important; border-radius:var(--radius-md); }
    .otp-inp:focus { border-color:var(--nb-primary) !important; box-shadow:0 0 0 3px color-mix(in srgb,var(--nb-primary) 12%,transparent) !important; }

    /* ── Profile step ── */
    .prof-hero { font-size:2.75rem; text-align:center; margin-bottom:1rem; color:var(--nb-primary); }
    .lock-hero { font-size:2.75rem; text-align:center; margin-bottom:1rem; color:var(--nb-primary); }

    /* ── Role picker ── */
    .role-pick { display:flex; gap:10px; }
    .role-pick button { flex:1; display:flex; align-items:center; gap:12px; padding:14px 12px; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); background:#fff; cursor:pointer; text-align:left; transition:all .2s; }
    .role-pick button:hover { border-color:var(--nb-primary-light); background:color-mix(in srgb,var(--nb-primary) 4%,white); }
    .role-pick button.active { border-color:var(--nb-primary); background:color-mix(in srgb,var(--nb-primary) 6%,white); }
    .role-pick button strong { display:block; font-family:var(--font-display); font-size:.85rem; font-weight:700; color:var(--nb-text); }
    .role-pick button small { display:block; font-size:.72rem; color:var(--nb-text-muted); margin-top:2px; }
    .rp-icon { font-size:1.25rem; color:var(--nb-primary); flex-shrink:0; }
    .role-pick button.active .rp-icon { color:var(--nb-primary); }

    /* ── Password strength ── */
    .strength-wrap { display:flex; align-items:center; gap:10px; margin-top:8px; }
    .strength-track { flex:1; height:4px; background:var(--nb-surface-2); border-radius:99px; overflow:hidden; }
    .strength-bar { height:100%; border-radius:99px; transition:width .3s,background .3s; }
    .strength-lbl { font-size:.72rem; font-weight:700; white-space:nowrap; transition:color .3s; }
    .match-err { color:#dc2626; font-size:.78rem; margin:.4rem 0 0; display:flex; align-items:center; }
    .match-ok  { color:#16a34a; font-size:.78rem; margin:.4rem 0 0; display:flex; align-items:center; }

    /* ── CTA button ── */
    .auth-btn { width:100%; padding:13px; background:var(--nb-primary); color:#fff; border:none; border-radius:var(--radius-md); font-family:var(--font-display); font-size:.95rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .2s; box-shadow:0 4px 16px rgba(15,39,68,.2); }
    .auth-btn:hover:not(:disabled) { background:var(--nb-primary-light); transform:translateY(-1px); box-shadow:0 6px 20px rgba(15,39,68,.28); }
    .auth-btn:active:not(:disabled) { transform:translateY(0); }
    .auth-btn:disabled { opacity:.6; cursor:not-allowed; }

    /* ── Misc ── */
    .mini-spin { width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .6s linear infinite; display:inline-block; flex-shrink:0; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .link-btn { background:none; border:none; color:var(--nb-primary); font-weight:600; cursor:pointer; padding:0; font-size:.875rem; font-family:inherit; text-decoration:underline; text-underline-offset:2px; transition:opacity .15s; }
    .link-btn:hover { opacity:.75; }
    .link-btn:disabled { opacity:.4; cursor:not-allowed; }
    .forgot-row { text-align:center; margin:1rem 0 0; }
    .switch-hint { text-align:center; margin:1.25rem 0 0; font-size:.85rem; color:var(--nb-text-muted); }
    .req { color:var(--nb-danger); }
    .cfg-note { font-size:.72rem; color:var(--nb-text-muted); margin:.75rem 0 0; display:flex; align-items:center; gap:4px; }
    .cfg-note i { color:var(--nb-warning); }
  `]
})
export class LoginComponent implements OnInit {
  step = signal<Step>('phone');
  mode = signal<Mode>('login');
  busy  = signal(false);
  error = signal('');

  phone    = '';
  password = '';
  showPass = false;
  code     = '';

  profileName = '';
  profileCity = '';
  profileRole: 'customer' | 'provider' = 'customer';

  newPassword     = '';
  confirmPassword = '';
  showNewPass  = false;
  showConfPass = false;

  isForgot  = false;
  isNewUser = false;
  private pendingToken = '';

  features = [
    { icon: 'bi-patch-check-fill', text: 'Browse 500+ verified local providers' },
    { icon: 'bi-telephone-fill',   text: 'Contact via call or WhatsApp instantly' },
    { icon: 'bi-star-fill',        text: 'Real reviews from real people' },
    { icon: 'bi-shield-check',     text: 'Safe, trusted, always free to use' },
  ];

  constructor(
    public  fb:    FirebaseAuthService,
    private auth:  AuthService,
    private toast: ToastService,
    private router: Router,
    private route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    const m = this.route.snapshot.queryParamMap.get('mode');
    if (m === 'signup') this.mode.set('signup');
  }

  // ── Mode switch (only allowed on phone step) ──────────────────────
  setMode(m: Mode) {
    if (this.step() !== 'phone') return;
    this.error.set('');
    this.mode.set(m);
  }

  // ── Phone step: route by mode ─────────────────────────────────────
  onContinue() {
    this.error.set('');
    if (!/^\d{10}$/.test(this.phone)) { this.error.set('Enter a valid 10-digit mobile number.'); return; }
    if (this.mode() === 'signup') {
      this.sendOtp();
    } else {
      this.busy.set(true);
      this.auth.checkPhone(this.phone).subscribe({
        next: (res: any) => {
          const { exists, hasPassword } = res.data ?? res;
          this.busy.set(false);
          if (!exists) {
            // Unknown number → offer to sign up
            this.error.set('No account found for this number. Switch to Sign Up?');
            return;
          }
          if (hasPassword) {
            this.step.set('password');
          } else {
            this.sendOtp(); // existing user, no password yet
          }
        },
        error: (msg: string) => { this.busy.set(false); this.error.set(msg); },
      });
    }
  }

  // ── Password login ─────────────────────────────────────────────────
  doLogin() {
    this.error.set('');
    if (!this.password) { this.error.set('Please enter your password.'); return; }
    this.busy.set(true);
    this.auth.loginPhone(this.phone, this.password).subscribe({
      next: ()  => this.navigateToDashboard('Welcome back!'),
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); },
    });
  }

  // ── Forgot password ────────────────────────────────────────────────
  doForgot() {
    this.isForgot = true;
    this.sendOtp();
  }

  // ── Send OTP via Firebase ──────────────────────────────────────────
  async sendOtp() {
    this.error.set('');
    if (!this.fb.isConfigured) {
      this.busy.set(false);
      this.error.set('OTP is not configured on this build yet.');
      return;
    }
    this.busy.set(true);
    try {
      await this.fb.sendOtp(`+91${this.phone}`, 'login-recaptcha');
      this.step.set('otp');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not send OTP. Please try again.');
      this.fb.reset();
    } finally {
      this.busy.set(false);
    }
  }

  // ── Confirm OTP ────────────────────────────────────────────────────
  async confirmOtp() {
    this.error.set('');
    if (!/^\d{6}$/.test(this.code)) { this.error.set('Enter the 6-digit code sent to your phone.'); return; }
    this.busy.set(true);
    try {
      const idToken = await this.fb.confirmOtp(this.code);
      this.pendingToken = idToken;
      this.auth.firebaseCheck(idToken).subscribe({
        next: (res: any) => {
          this.busy.set(false);
          this.isNewUser = !!(res.data?.isNewUser ?? res.isNewUser);
          this.step.set(this.isNewUser ? 'profile' : 'setpass');
        },
        error: (msg: string) => { this.busy.set(false); this.error.set(msg); },
      });
    } catch {
      this.busy.set(false);
      this.error.set('Incorrect or expired code. Please try again.');
    }
  }

  // ── Profile step → set password ────────────────────────────────────
  saveProfileAndContinue() {
    this.error.set('');
    if (!this.profileName.trim()) { this.error.set('Please enter your name.'); return; }
    if (!this.profileCity.trim()) { this.error.set('Please enter your city.'); return; }
    this.step.set('setpass');
  }

  // ── Set password ───────────────────────────────────────────────────
  doSetPassword() {
    this.error.set('');
    if (this.newPassword.length < 6)               { this.error.set('Password must be at least 6 characters.'); return; }
    if (this.newPassword !== this.confirmPassword)  { this.error.set('Passwords do not match.'); return; }

    const profile = this.isNewUser
      ? { name: this.profileName.trim(), city: this.profileCity.trim() }
      : undefined;
    const role = this.isNewUser ? this.profileRole : 'customer';

    this.busy.set(true);
    this.auth.firebaseVerify(this.pendingToken, role, profile, this.newPassword).subscribe({
      next: ()  => this.navigateToDashboard(this.isForgot ? 'Password updated!' : 'Welcome to NearBy!'),
      error: (msg: string) => { this.busy.set(false); this.error.set(msg); },
    });
  }

  // ── Back to phone ──────────────────────────────────────────────────
  goBack() {
    this.error.set('');
    this.code     = '';
    this.password = '';
    this.isForgot = false;
    this.fb.reset();
    this.step.set('phone');
  }

  // ── Post-auth navigation ───────────────────────────────────────────
  private navigateToDashboard(msg: string) {
    this.busy.set(false);
    this.toast.success(msg);
    const role = this.auth.userRole();
    this.router.navigate([
      role === 'provider' ? '/dashboard/provider' :
      role === 'admin'    ? '/admin' :
      '/dashboard/customer'
    ]);
  }

  // ── Progress bar percentage ────────────────────────────────────────
  get progress(): number {
    const s = this.step();
    if (s === 'phone')    return 20;
    if (s === 'password') return 100;
    if (s === 'otp')      return this.mode() === 'signup' ? 40 : 60;
    if (s === 'profile')  return 70;
    if (s === 'setpass')  return 100;
    return 50;
  }

  // ── Password strength ──────────────────────────────────────────────
  get passStrength(): number {
    const p = this.newPassword;
    if (p.length < 4) return 0;
    let s = 0;
    if (p.length >= 6)          s++;
    if (p.length >= 10)         s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  get passStrengthLabel(): string {
    const s = this.passStrength;
    if (s <= 1) return 'Weak';
    if (s <= 3) return 'Fair';
    return 'Strong';
  }

  get passStrengthColor(): string {
    const s = this.passStrength;
    if (s <= 1) return '#ef4444';
    if (s <= 3) return '#f59e0b';
    return '#22c55e';
  }
}
