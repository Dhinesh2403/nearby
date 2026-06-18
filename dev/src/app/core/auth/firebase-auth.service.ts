// src/app/core/auth/firebase-auth.service.ts
// Thin wrapper around Firebase Phone Auth (OTP). Lazy-initialises the
// Firebase app on first use so the SDK isn't loaded until someone actually
// triggers the contact flow.
import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth, Auth, RecaptchaVerifier, signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private app?: FirebaseApp;
  private auth?: Auth;
  private recaptcha?: RecaptchaVerifier;
  private confirmation?: ConfirmationResult;

  // True only once real keys are pasted into environment.firebase.
  get isConfigured(): boolean {
    return !environment.firebase.apiKey.startsWith('PASTE_');
  }

  private ensureInit(): Auth {
    if (!this.auth) {
      this.app  = initializeApp(environment.firebase);
      this.auth = getAuth(this.app);
    }
    return this.auth;
  }

  // Build (once) an invisible reCAPTCHA bound to a container element id.
  private ensureRecaptcha(containerId: string): RecaptchaVerifier {
    const auth = this.ensureInit();
    if (!this.recaptcha) {
      this.recaptcha = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    }
    return this.recaptcha;
  }

  // Step 1 — send the OTP SMS. phone must be E.164 (e.g. +919876543210).
  async sendOtp(phoneE164: string, recaptchaContainerId: string): Promise<void> {
    const auth = this.ensureInit();
    const verifier = this.ensureRecaptcha(recaptchaContainerId);
    this.confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
  }

  // Step 2 — confirm the 6-digit code; resolves to the Firebase ID token
  // which the backend (/api/auth/firebase-verify) will validate.
  async confirmOtp(code: string): Promise<string> {
    if (!this.confirmation) throw new Error('No OTP request in progress.');
    const cred = await this.confirmation.confirm(code);
    return cred.user.getIdToken();
  }

  // Reset reCAPTCHA between attempts (e.g. after a failed code).
  reset(): void {
    try { this.recaptcha?.clear(); } catch { /* ignore */ }
    this.recaptcha = undefined;
    this.confirmation = undefined;
  }
}
