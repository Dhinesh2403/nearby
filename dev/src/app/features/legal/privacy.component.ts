// src/app/features/legal/privacy.component.ts
// Static Privacy Policy page.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-wrap">
      <div class="container">
        <nav class="legal-crumb">
          <a routerLink="/">Home</a> <span>/</span> Privacy Policy
        </nav>

        <header class="legal-head">
          <h1>Privacy Policy</h1>
          <p class="legal-updated">Last updated: 20 June 2026</p>
        </header>

        <div class="legal-body">
          <p>
            This Privacy Policy explains how NearBy ("we", "us") collects, uses and protects your personal
            information when you use the NearBy website, applications and services (the "Platform"). By using the
            Platform you consent to the practices described here.
          </p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li><strong>Account details</strong> — your name, mobile number, city and (optionally) email address.</li>
            <li><strong>Provider details</strong> — business name, category, location, description and listing media.</li>
            <li><strong>Usage data</strong> — pages viewed, searches, and interactions with listings.</li>
            <li><strong>Device &amp; log data</strong> — IP address, browser type and approximate location.</li>
            <li><strong>Communications</strong> — messages and complaints you submit through the Platform.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account and verify your mobile number via OTP.</li>
            <li>To connect customers with relevant nearby providers.</li>
            <li>To operate, maintain and improve the Platform.</li>
            <li>To send service-related notifications and respond to your requests.</li>
            <li>To detect, prevent and address fraud, abuse or security issues.</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2>3. Sharing of Information</h2>
          <p>We do not sell your personal information. We may share information:</p>
          <ul>
            <li>With other users as needed to facilitate a connection (e.g. a provider's public listing).</li>
            <li>With service providers who help us operate the Platform (e.g. hosting, OTP/SMS, analytics).</li>
            <li>When required by law, regulation or valid legal process.</li>
            <li>To protect the rights, safety and property of NearBy and its users.</li>
          </ul>

          <h2>4. Phone Verification</h2>
          <p>
            We use a one-time password (OTP) sent to your mobile number to verify your identity. Your number is
            used for authentication, account security and essential service communications.
          </p>

          <h2>5. Cookies &amp; Tracking</h2>
          <p>
            We use cookies and similar technologies to keep you signed in, remember preferences and understand how
            the Platform is used. You can control cookies through your browser settings, though some features may
            not work without them.
          </p>

          <h2>6. Data Security</h2>
          <p>
            We implement reasonable technical and organisational measures to protect your information. However, no
            method of transmission or storage is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide the Platform,
            comply with legal obligations, resolve disputes and enforce our agreements.
          </p>

          <h2>8. Your Rights</h2>
          <p>
            Subject to applicable law, you may request access to, correction of, or deletion of your personal
            information. You can update most details from your account settings, or contact us for assistance.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            The Platform is not intended for individuals under 18, and we do not knowingly collect personal
            information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes become effective when posted on this page.
            We encourage you to review it periodically.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For privacy questions or requests, contact us at
            <a href="mailto:admin&#64;nearbypro.online">admin&#64;nearbypro.online</a>.
          </p>

          <p class="legal-foot">
            See also our <a routerLink="/terms">Terms &amp; Conditions</a>.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .legal-wrap { background:var(--nb-bg); min-height:70vh; padding:2.5rem 0 4rem; }
    .legal-crumb { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:1.25rem; }
    .legal-crumb a { color:var(--nb-primary); text-decoration:none; }
    .legal-crumb span { margin:0 .4rem; }
    .legal-head { border-bottom:1px solid var(--nb-border); padding-bottom:1.25rem; margin-bottom:1.5rem; }
    .legal-head h1 { font-family:var(--font-display); font-weight:800; font-size:2rem; margin:0 0 .35rem; }
    .legal-updated { font-size:.85rem; color:var(--nb-text-muted); margin:0; }
    .legal-body { max-width:780px; }
    .legal-body p, .legal-body li { color:var(--nb-text); font-size:.95rem; line-height:1.7; }
    .legal-body h2 { font-family:var(--font-display); font-weight:700; font-size:1.15rem; margin:1.75rem 0 .6rem; }
    .legal-body ul { padding-left:1.25rem; margin:0 0 .5rem; }
    .legal-body li { margin-bottom:.35rem; }
    .legal-body a { color:var(--nb-primary); }
    .legal-foot { margin-top:2rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); }
  `]
})
export class PrivacyComponent {}
