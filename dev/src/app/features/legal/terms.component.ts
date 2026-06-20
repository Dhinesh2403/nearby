// src/app/features/legal/terms.component.ts
// Static Terms & Conditions page.
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-wrap">
      <div class="container">
        <nav class="legal-crumb">
          <a routerLink="/">Home</a> <span>/</span> Terms &amp; Conditions
        </nav>

        <header class="legal-head">
          <h1>Terms &amp; Conditions</h1>
          <p class="legal-updated">Last updated: 20 June 2026</p>
        </header>

        <div class="legal-body">
          <p>
            Welcome to NearBy. These Terms &amp; Conditions ("Terms") govern your access to and use of the
            NearBy website, applications and services (together, the "Platform"). By using the Platform you
            agree to these Terms. If you do not agree, please do not use the Platform.
          </p>

          <h2>1. About NearBy</h2>
          <p>
            NearBy is a local discovery platform that connects customers with nearby service providers and small
            businesses. NearBy is a venue that facilitates introductions; we are not a party to any agreement,
            transaction or service performed between a customer and a provider.
          </p>

          <h2>2. Eligibility &amp; Accounts</h2>
          <ul>
            <li>You must be at least 18 years old to create an account.</li>
            <li>You agree to provide accurate, current and complete information and to keep it up to date.</li>
            <li>You are responsible for maintaining the confidentiality of your account and for all activity under it.</li>
            <li>You must notify us promptly of any unauthorised use of your account.</li>
          </ul>

          <h2>3. Use of the Platform</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Platform for any unlawful, fraudulent or harmful purpose.</li>
            <li>Post false, misleading, defamatory, obscene or infringing content.</li>
            <li>Attempt to gain unauthorised access to the Platform or other users' accounts.</li>
            <li>Interfere with or disrupt the integrity or performance of the Platform.</li>
            <li>Scrape, copy or harvest data from the Platform without our written permission.</li>
          </ul>

          <h2>4. Service Providers</h2>
          <p>
            Providers are solely responsible for the services they offer, the accuracy of their listings, their
            pricing, and compliance with all applicable laws, licenses and permits. NearBy does not endorse,
            verify or guarantee any provider or service, and does not perform background checks unless expressly
            stated.
          </p>

          <h2>5. Bookings, Payments &amp; Disputes</h2>
          <p>
            Any arrangement, payment or dispute relating to a service is strictly between the customer and the
            provider. NearBy is not responsible for the quality, safety, legality or completion of any service.
            We encourage users to exercise due diligence before engaging a provider.
          </p>

          <h2>6. Reviews &amp; Content</h2>
          <p>
            You retain ownership of content you submit, but grant NearBy a non-exclusive, royalty-free, worldwide
            licence to host, display and use it in connection with operating the Platform. You are responsible for
            the content you post and must ensure it is honest and lawful.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            The Platform, including its design, logos, text and software, is owned by NearBy or its licensors and
            is protected by intellectual-property laws. You may not use our trademarks without prior written consent.
          </p>

          <h2>8. Disclaimers</h2>
          <p>
            The Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether
            express or implied. We do not warrant that the Platform will be uninterrupted, secure or error-free.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, NearBy shall not be liable for any indirect, incidental,
            special or consequential damages, or for any loss arising from your use of the Platform or any
            interaction with a provider or customer.
          </p>

          <h2>10. Termination</h2>
          <p>
            We may suspend or terminate your access to the Platform at any time, with or without notice, if you
            breach these Terms or use the Platform in a way that may cause harm to others or to NearBy.
          </p>

          <h2>11. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes become effective when posted on this page. Your
            continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India, and the courts at Chennai, Tamil Nadu shall have
            exclusive jurisdiction over any disputes.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            Questions about these Terms? Reach us at
            <a href="mailto:admin&#64;nearbypro.online">admin&#64;nearbypro.online</a>.
          </p>

          <p class="legal-foot">
            See also our <a routerLink="/privacy">Privacy Policy</a>.
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
export class TermsComponent {}
