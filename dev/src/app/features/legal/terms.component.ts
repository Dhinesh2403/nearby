// src/app/features/legal/terms.component.ts
// Static Terms of Service page.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-wrap">
      <div class="container">
        <nav class="legal-crumb">
          <a routerLink="/">Home</a> <span>/</span> Terms of Service
        </nav>

        <header class="legal-head">
          <h1>Terms of Service</h1>
          <p class="legal-updated">Last updated: June 2025</p>
        </header>

        <div class="legal-notice" role="note">
          <span class="legal-notice-icon" aria-hidden="true">⚠️</span>
          <p>Please read this carefully before using NearbyPro.</p>
        </div>

        <div class="legal-body">
          <h2>1. Introduction &amp; Acceptance</h2>
          <p>
            Welcome to NearbyPro. These Terms of Service ("Terms") govern your access to and use of the
            NearbyPro website, applications and services (together, the "Platform"). By accessing or using
            NearbyPro you agree to be bound by these Terms. If you do not agree, you must not use the Platform.
          </p>
          <p>
            These Terms, and any dispute arising out of or relating to them or the Platform, are governed by the
            laws of India.
          </p>

          <h2>2. Eligibility</h2>
          <ul>
            <li>You must be at least 18 years old to create an account or use the Platform.</li>
            <li>You must provide accurate, current and complete information when registering and using NearbyPro.</li>
            <li>By using the Platform you represent and warrant that you meet these eligibility requirements.</li>
          </ul>

          <h2>3. User Accounts</h2>
          <ul>
            <li>You are responsible for the information you provide when creating an account.</li>
            <li>You are responsible for safeguarding your account credentials and for all activity under your account.</li>
            <li>Only one account is permitted per person. Duplicate or fraudulent accounts may be removed.</li>
            <li>You must notify us promptly of any unauthorised use of your account.</li>
          </ul>

          <h2>4. Service Seeker Terms</h2>
          <p>
            As a service seeker, you may search for and contact service providers through the Platform.
          </p>
          <ul>
            <li>NearbyPro is a discovery platform that helps you find nearby providers; it is not a guarantor of any service.</li>
            <li>Any payment for a service is made directly between you and the provider. NearbyPro does not process or hold payments.</li>
            <li>NearbyPro is not a party to, and is not liable for, any dispute regarding service quality, pricing or completion.</li>
            <li>You should exercise your own judgement and due diligence before engaging any provider.</li>
          </ul>

          <h2>5. Service Provider Terms</h2>
          <p>As a service provider, you are responsible for the listings and services you offer.</p>
          <ul>
            <li>You must ensure your listing details are accurate, current and not misleading.</li>
            <li>You must hold any valid credentials, licenses or permits required by law to offer your services.</li>
            <li>You may not create fake listings or post misleading information.</li>
            <li>NearbyPro may remove or suspend any listing that violates these Terms or our policies.</li>
          </ul>

          <h2>6. Prohibited Activities</h2>
          <p>When using the Platform you agree not to:</p>
          <ul>
            <li>Post spam, fake reviews or fraudulent listings.</li>
            <li>Harass, threaten or abuse other users.</li>
            <li>Scrape, crawl or use automated means to access the Platform without our written permission.</li>
            <li>Offer, promote or solicit illegal services.</li>
            <li>Use the Platform for any unlawful, harmful or deceptive purpose.</li>
          </ul>

          <h2>7. Intellectual Property</h2>
          <p>
            The Platform, including its design, logos, text, software and branding, is owned by NearbyPro or its
            licensors and is protected by applicable intellectual-property laws. You retain ownership of the content
            you submit; however, by submitting content you grant NearbyPro a non-exclusive, royalty-free, worldwide
            licence to host, display and use that content in connection with operating and promoting the Platform.
          </p>

          <h2>8. Advertisements</h2>
          <p>
            The Platform may display advertisements served through third-party networks such as Google AdSense and
            Google AdMob. These ads are provided by third parties, and NearbyPro is not responsible for the content,
            accuracy or any products or services promoted in such advertisements.
          </p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Platform is provided on an "as is" and "as available" basis, without warranties of any kind, whether
            express or implied. NearbyPro does not guarantee the quality, reliability or suitability of any service
            provider, and does not guarantee that the Platform will be uninterrupted, secure or error-free.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, NearbyPro shall not be liable for any disputes, damages or losses
            arising between users and service providers, or from your use of the Platform. As NearbyPro is a free
            platform, our maximum aggregate liability to you is limited to ₹0.
          </p>

          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate any account that violates these Terms or our policies, with or without notice.
            You may delete your account at any time through your account settings.
          </p>

          <h2>12. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms are governed by the laws of India, including the Information Technology Act, 2000. Any disputes
            shall be subject to the exclusive jurisdiction of the courts at Coimbatore, Tamil Nadu, India.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            Questions about these Terms? Reach us at
            <a href="mailto:support&#64;nearbypro.online">support&#64;nearbypro.online</a>
            or visit <a href="https://nearbypro.online">nearbypro.online</a>.
          </p>

          <p class="legal-foot">
            See also our <a routerLink="/privacy">Privacy Policy</a>.
          </p>

          <div class="legal-back">
            <a routerLink="/" class="legal-back-btn">&larr; Back to Home</a>
          </div>
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
    .legal-notice { display:flex; align-items:center; gap:.6rem; max-width:780px; margin:0 0 1.75rem;
      padding:.85rem 1rem; border:1px solid var(--nb-accent); border-radius:10px;
      background:color-mix(in srgb, var(--nb-accent) 12%, transparent); }
    .legal-notice-icon { font-size:1.15rem; line-height:1; }
    .legal-notice p { margin:0; font-weight:600; font-size:.92rem; color:var(--nb-text); }
    .legal-body { max-width:780px; }
    .legal-body p, .legal-body li { color:var(--nb-text); font-size:.95rem; line-height:1.7; }
    .legal-body h2 { font-family:var(--font-display); font-weight:700; font-size:1.15rem; margin:1.75rem 0 .6rem; }
    .legal-body ul { padding-left:1.25rem; margin:0 0 .5rem; }
    .legal-body li { margin-bottom:.35rem; }
    .legal-body a { color:var(--nb-primary); }
    .legal-foot { margin-top:2rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); }
    .legal-back { margin-top:1.5rem; }
    .legal-back-btn { display:inline-block; padding:.6rem 1.25rem; border-radius:8px;
      background:var(--nb-primary); color:#fff; font-weight:600; font-size:.9rem; text-decoration:none; }
    .legal-back-btn:hover { opacity:.9; }
  `]
})
export class TermsComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'Terms of Service',
      'The Terms of Service governing the use of NearbyPro, India\'s hyperlocal service ' +
        'discovery platform, for both service seekers and service providers.',
      'NearbyPro terms, terms of service, terms and conditions'
    );
  }
}
