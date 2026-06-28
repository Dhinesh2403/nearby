// src/app/features/static/about.component.ts
// Static "About NearbyPro" page — mission, what we do, who we serve.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-wrap">
      <div class="container">
        <nav class="page-crumb">
          <a routerLink="/">Home</a> <span>/</span> About
        </nav>

        <header class="page-head">
          <h1>About NearbyPro</h1>
          <p class="page-lede">
            NearbyPro is a hyperlocal service marketplace that helps people across India find trusted,
            verified local professionals — and helps small businesses get discovered by customers right
            in their neighbourhood.
          </p>
        </header>

        <div class="page-body">
          <h2>Our mission</h2>
          <p>
            Finding a reliable plumber, tutor, electrician or home cook should not depend on luck or a
            forwarded WhatsApp number. Our mission is to make local services transparent, accessible and
            trustworthy — so that every household can hire with confidence, and every honest provider can
            build a livelihood from the work they do well.
          </p>

          <h2>What the platform does</h2>
          <p>
            NearbyPro connects two sides of the same neighbourhood. Customers search for the service they
            need, compare nearby providers by ratings, experience and price, and reach out directly.
            Service providers list their business for free, showcase their skills and reviews, and receive
            enquiries from genuinely interested customers close by.
          </p>
          <ul class="feature-list">
            <li><strong>Discover local providers</strong> — browse verified professionals by category and distance.</li>
            <li><strong>Compare honestly</strong> — real ratings, reviews, experience and transparent pricing.</li>
            <li><strong>Connect directly</strong> — message providers in-app, with no middlemen or markups.</li>
            <li><strong>Stay safe</strong> — provider verification, reporting tools and community safety alerts.</li>
          </ul>

          <h2>Who it's for</h2>
          <p>
            NearbyPro is built for two communities who depend on each other every day:
          </p>
          <div class="audience-grid">
            <div class="audience-card">
              <h3><i class="bi bi-house-heart"></i> For households &amp; service seekers</h3>
              <p>
                Anyone who needs everyday services done well — repairs, tuition, cleaning, cooking, beauty,
                events and more — delivered by someone trusted who works nearby.
              </p>
            </div>
            <div class="audience-card">
              <h3><i class="bi bi-briefcase"></i> For local professionals</h3>
              <p>
                Electricians, plumbers, tutors, home cooks, salons and other small businesses who want a
                simple, free way to be found by customers in their own locality.
              </p>
            </div>
          </div>

          <h2>Built for India, hyperlocal by design</h2>
          <p>
            India's neighbourhoods run on local services, yet most of that work still happens through word
            of mouth. NearbyPro brings that trust online — starting in Coimbatore and Chennai, and growing
            city by city — so that quality local work is just a search away, wherever you live.
          </p>

          <div class="cta-row">
            <a routerLink="/browse" class="btn-nb-primary btn">
              <i class="bi bi-search me-1"></i>Find a service
            </a>
            <a routerLink="/provider-signup" class="btn-nb-outline btn">
              <i class="bi bi-briefcase me-1"></i>List your business
            </a>
          </div>

          <p class="page-foot">
            Learn more about <a routerLink="/how-it-works">how it works</a> or read our
            <a routerLink="/faq">frequently asked questions</a>.
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
    .page-body p, .page-body li { color:var(--nb-text); font-size:.97rem; line-height:1.75; }
    .page-body h2 { font-family:var(--font-display); font-weight:700; font-size:1.3rem; margin:2rem 0 .7rem; }
    .feature-list { list-style:none; padding:0; margin:.5rem 0 0; display:grid; gap:.6rem; }
    .feature-list li { padding-left:1.6rem; position:relative; }
    .feature-list li::before { content:"\\2713"; position:absolute; left:0; top:0; color:var(--nb-success); font-weight:700; }
    .audience-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1rem 0 .5rem; }
    .audience-card { background:var(--nb-surface); border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem 1.4rem; }
    .audience-card h3 { font-family:var(--font-display); font-weight:700; font-size:1.02rem; margin:0 0 .5rem; color:var(--nb-primary); }
    .audience-card h3 i { color:var(--nb-accent); margin-right:.4rem; }
    .audience-card p { margin:0; font-size:.92rem; color:var(--nb-text-muted); }
    .cta-row { display:flex; flex-wrap:wrap; gap:.75rem; margin:2.25rem 0 0; }
    .page-foot { margin-top:2.25rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); }
    .page-foot a, .page-body a { color:var(--nb-primary); }
    @media (max-width:640px) {
      .audience-grid { grid-template-columns:1fr; }
      .page-head h1 { font-size:1.8rem; }
    }
  `]
})
export class AboutComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'About NearbyPro — Hyperlocal Service Marketplace in India',
      'NearbyPro is a hyperlocal service marketplace connecting people across India with ' +
        'trusted, verified local professionals — plumbers, tutors, electricians, home cooks and more.',
      'NearbyPro, hyperlocal marketplace, local services India, find local professionals, about NearbyPro'
    );
  }
}
