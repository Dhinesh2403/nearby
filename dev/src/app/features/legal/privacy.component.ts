// src/app/features/legal/privacy.component.ts
// Static Privacy Policy page.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

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
          <p class="legal-updated">Last updated: 28 June 2026</p>
        </header>

        <div class="legal-notice" role="note">
          <span class="legal-notice-icon" aria-hidden="true">⚠️</span>
          <p>Please read this carefully before using NearbyPro.</p>
        </div>

        <div class="legal-body">
          <h2>1. Introduction</h2>
          <p>
            NearbyPro ("NearbyPro", "we", "us" or "our") operates the website
            <a href="https://nearbypro.online">nearbypro.online</a> and the NearbyPro Android application
            (together, the "Platform"), a hyperlocal service marketplace that connects people looking for local
            services with nearby service providers such as plumbers, electricians, tutors, carpenters and AC repair
            technicians in Coimbatore and across India.
          </p>
          <p>
            This Privacy Policy explains what information we collect, how we use and share it, and the choices and
            rights you have. It applies to all users of the Platform — both service seekers and service providers.
            By accessing or using the Platform you agree to the practices described in this Policy. If you do not
            agree, please do not use the Platform.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Personal information you provide</strong> — your name, email address, phone number, city and
              location, and, for providers, your business name, service category, description and listing media. When
              you book or contact a provider we record your service history and the interactions related to it.
            </li>
            <li>
              <strong>Usage data</strong> — pages you visit, search queries, listings you view, buttons you click and
              the date and time of your activity on the Platform.
            </li>
            <li>
              <strong>Device and log data</strong> — IP address, browser type and version, operating system, device
              identifiers and approximate location derived from your IP address or, with your permission, your device's
              location services.
            </li>
            <li>
              <strong>Cookies and tracking technologies</strong> — small data files stored on your device. See the
              <a routerLink="/privacy" fragment="cookies">Cookies Policy</a> section below.
            </li>
            <li>
              <strong>Google OAuth data</strong> — if you choose to sign in with Google, Google shares your name, email
              address and profile picture with us so we can create and authenticate your account. We do not receive or
              store your Google password. We only request the minimum profile and email scopes needed to sign you in.
            </li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To create, authenticate and manage your account (including via email/password and Google OAuth).</li>
            <li>To connect service seekers with relevant nearby service providers and facilitate that connection.</li>
            <li>To send you notifications by email and push notification about bookings, messages and account activity.</li>
            <li>To operate, maintain, analyse and improve the Platform and develop new features.</li>
            <li>
              To display advertising, including personalised ads served through Google AdSense (on the web) and Google
              AdMob (in the mobile app). These services may use cookies and device identifiers to show relevant ads.
            </li>
            <li>To detect, prevent and address fraud, abuse, security incidents and violations of our terms.</li>
            <li>To comply with applicable laws and respond to lawful requests.</li>
          </ul>

          <h2>4. How We Share Your Information</h2>
          <p>
            <strong>We do not sell your personal data to anyone.</strong> We share information only in the limited ways
            described below:
          </p>
          <ul>
            <li>
              <strong>With service providers you contact</strong> — when you book or reach out to a provider, we share
              only your name and contact details so they can respond to your request. We do not share your full
              service history with them.
            </li>
            <li>
              <strong>With Google</strong> — for authentication (Google OAuth), analytics (Google Analytics) and
              advertising (Google AdSense and AdMob), subject to Google's own privacy policy.
            </li>
            <li>
              <strong>With operational service providers</strong> — vendors who help us run the Platform, such as
              hosting, email/SMS delivery and analytics, under confidentiality obligations.
            </li>
            <li>
              <strong>When required by law</strong> — to comply with a legal obligation, valid legal process, or to
              protect the rights, safety and property of NearbyPro, our users or the public.
            </li>
          </ul>
          <p>We do not engage in any third-party selling of your personal data.</p>

          <h2 id="cookies">5. Cookies Policy</h2>
          <p>We use the following types of cookies and similar technologies:</p>
          <ul>
            <li><strong>Essential cookies</strong> — required to keep you signed in and to operate core features.</li>
            <li><strong>Preference cookies</strong> — remember your settings, such as your location or language.</li>
            <li>
              <strong>Analytics cookies</strong> — Google Analytics cookies help us understand how the Platform is used
              so we can improve it.
            </li>
            <li>
              <strong>Advertising cookies</strong> — Google AdSense and AdMob may set cookies or use device identifiers
              to personalise and measure ads.
            </li>
          </ul>
          <p>
            You can disable or delete cookies through your browser settings, and you can manage ad personalisation
            through <a href="https://adssettings.google.com">Google Ads Settings</a>. Note that some features of the
            Platform may not function properly if you disable essential cookies.
          </p>

          <h2>6. Data Security</h2>
          <p>
            We implement reasonable security practices in line with the Information Technology (Reasonable Security
            Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011. These include:
          </p>
          <ul>
            <li>JWT (JSON Web Token) based authentication to secure access to your account.</li>
            <li>Encryption of data in transit using HTTPS/TLS.</li>
            <li>
              Passwords are never stored in plain text — they are stored only as salted, one-way cryptographic hashes.
            </li>
          </ul>
          <p>
            No method of transmission or storage is completely secure, and while we strive to protect your information,
            we cannot guarantee absolute security.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            In accordance with the Information Technology Act, 2000 and the rules made under it, you have the following
            rights regarding your personal information:
          </p>
          <ul>
            <li><strong>Right to access</strong> — request a copy of the personal data we hold about you.</li>
            <li><strong>Right to correct</strong> — update inaccurate or incomplete information, most of which you can edit from your account settings.</li>
            <li><strong>Right to delete</strong> — request deletion of your account and associated personal data, subject to legal retention requirements.</li>
            <li><strong>Right to withdraw consent</strong> — withdraw any consent you previously gave for processing.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at
            <a href="mailto:admin&#64;nearbypro.online">admin&#64;nearbypro.online</a>. We will respond within a
            reasonable timeframe.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal
            information from children. If you believe a child has provided us with personal data, please contact us and
            we will take steps to delete it.
          </p>

          <h2>9. Third-Party Links</h2>
          <p>
            The Platform may contain links to third-party websites, provider pages or advertisements. We are not
            responsible for the privacy practices or content of those external sites. We encourage you to review the
            privacy policies of any third-party site you visit.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we will notify users by
            posting the updated Policy on this page with a new "Last updated" date and, where appropriate, by email or
            in-app notice. Your continued use of the Platform after changes are posted constitutes acceptance of the
            revised Policy.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have any questions, concerns or requests regarding this Privacy Policy or your personal data, please
            contact us:
          </p>
          <ul>
            <li>Email: <a href="mailto:admin&#64;nearbypro.online">admin&#64;nearbypro.online</a></li>
            <li>Website: <a href="https://nearbypro.online">nearbypro.online</a></li>
          </ul>

          <p class="legal-foot">
            See also our <a routerLink="/terms">Terms of Service</a>.
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
export class PrivacyComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'Privacy Policy',
      'How NearbyPro collects, uses and protects your personal information as you find or list ' +
        'local services across India.',
      'NearbyPro privacy, privacy policy, data protection'
    );
  }
}
