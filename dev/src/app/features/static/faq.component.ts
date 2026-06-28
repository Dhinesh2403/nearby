// src/app/features/static/faq.component.ts
// Static FAQ page — 10 genuine questions about using NearbyPro.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

interface Faq { q: string; a: string; }

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-wrap">
      <div class="container">
        <nav class="page-crumb">
          <a routerLink="/">Home</a> <span>/</span> FAQ
        </nav>

        <header class="page-head">
          <h1>Frequently Asked Questions</h1>
          <p class="page-lede">
            Everything you need to know about finding services, listing your business, pricing and
            staying safe on NearbyPro.
          </p>
        </header>

        <div class="page-body">
          @for (item of faqs; track item.q) {
            <details class="faq-item">
              <summary>
                <h2>{{ item.q }}</h2>
                <i class="bi bi-chevron-down faq-chevron"></i>
              </summary>
              <p>{{ item.a }}</p>
            </details>
          }

          <p class="page-foot">
            Didn't find your answer? Email us at
            <a href="mailto:admin&#64;nearbypro.online">admin&#64;nearbypro.online</a> or learn
            <a routerLink="/how-it-works">how NearbyPro works</a>.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { background:var(--nb-bg); min-height:70vh; padding:2.5rem 0 4rem; }
    .page-crumb { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:1.25rem; }
    .page-crumb a { color:var(--nb-primary); text-decoration:none; }
    .page-crumb span { margin:0 .4rem; }
    .page-head { border-bottom:1px solid var(--nb-border); padding-bottom:1.5rem; margin-bottom:1.75rem; }
    .page-head h1 { font-family:var(--font-display); font-weight:800; font-size:2.2rem; margin:0 0 .6rem; }
    .page-lede { font-size:1.05rem; line-height:1.7; color:var(--nb-text); max-width:760px; margin:0; }
    .page-body { max-width:820px; }
    .faq-item { background:var(--nb-surface); border:1px solid var(--nb-border); border-radius:var(--radius-md); margin-bottom:.65rem; overflow:hidden; }
    .faq-item summary { list-style:none; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.25rem; }
    .faq-item summary::-webkit-details-marker { display:none; }
    .faq-item summary h2 { font-family:var(--font-display); font-weight:700; font-size:1rem; margin:0; color:var(--nb-text); }
    .faq-chevron { color:var(--nb-text-muted); transition:transform .2s; flex-shrink:0; }
    .faq-item[open] .faq-chevron { transform:rotate(180deg); }
    .faq-item[open] summary h2 { color:var(--nb-primary); }
    .faq-item p { margin:0; padding:0 1.25rem 1.15rem; font-size:.94rem; line-height:1.7; color:var(--nb-text-muted); }
    .page-foot { margin-top:2.25rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); font-size:.95rem; }
    .page-foot a { color:var(--nb-primary); }
    @media (max-width:640px) { .page-head h1 { font-size:1.8rem; } }
  `]
})
export class FaqComponent implements OnInit {
  faqs: Faq[] = [
    {
      q: 'What is NearbyPro?',
      a: 'NearbyPro is a hyperlocal service marketplace that connects you with trusted, verified local ' +
         'professionals — plumbers, electricians, tutors, home cooks, beauticians and many more — in your ' +
         'own city and neighbourhood.'
    },
    {
      q: 'How do I find a service near me?',
      a: 'Just search for the service you need and your area on the Browse page. NearbyPro instantly shows ' +
         'verified providers nearby, ranked by ratings, reviews, experience and distance, so you can pick ' +
         'the right person for the job.'
    },
    {
      q: 'Is NearbyPro free to use for customers?',
      a: 'Yes. Searching for services, comparing providers and contacting them through NearbyPro is ' +
         'completely free for customers. You only pay the provider directly for the service you hire.'
    },
    {
      q: 'How do I list my business on NearbyPro?',
      a: 'Sign up as a provider, add your services, area of operation, experience and pricing, and publish ' +
         'your profile. Listing your business on NearbyPro is free, and you start receiving enquiries from ' +
         'customers nearby once your profile is live.'
    },
    {
      q: 'How are service providers verified?',
      a: 'Providers submit their details when they register, and our team reviews listings for authenticity. ' +
         'We also rely on genuine customer reviews and a reporting system to keep the community trustworthy. ' +
         'We always recommend checking a provider\'s reviews and ratings before hiring.'
    },
    {
      q: 'How does pricing work?',
      a: 'Providers set their own prices and display them on their profiles, so you can compare costs upfront. ' +
         'Any payment for the actual service is made directly between you and the provider — NearbyPro does ' +
         'not add commissions or hidden charges.'
    },
    {
      q: 'How do I contact a provider?',
      a: 'Open a provider\'s profile and use the in-app chat to message them, or reveal their contact details ' +
         'to discuss your requirement, timing and price. There are no middlemen between you and the provider.'
    },
    {
      q: 'Is it safe to hire through NearbyPro?',
      a: 'We take safety seriously with provider verification, transparent reviews, in-app reporting and ' +
         'community safety alerts about suspended accounts. For your own protection, read reviews, confirm ' +
         'details in writing, and avoid making large advance payments before work begins.'
    },
    {
      q: 'What should I do if I have a problem with a provider?',
      a: 'You can raise a complaint directly from the platform, and you can report any provider who behaves ' +
         'unprofessionally or violates our policies. Our team reviews reports and may suspend accounts that ' +
         'breach community standards.'
    },
    {
      q: 'Which cities does NearbyPro serve?',
      a: 'NearbyPro is growing across India, starting in Coimbatore and Chennai and expanding city by city. ' +
         'Even if your area has fewer listings today, signing up as a customer or provider helps your local ' +
         'community grow on the platform.'
    },
  ];

  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'FAQ — NearbyPro Hyperlocal Service Marketplace',
      'Answers to common questions about NearbyPro: how to find local services, list your ' +
        'business, pricing, provider verification and staying safe on India\'s hyperlocal marketplace.',
      'NearbyPro FAQ, find local services, list business, pricing, provider verification, safety, India'
    );
  }
}
