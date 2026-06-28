// src/app/features/static/how-it-works.component.ts
// Static "How It Works" page — step-by-step for seekers and providers.
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-wrap">
      <div class="container">
        <nav class="page-crumb">
          <a routerLink="/">Home</a> <span>/</span> How It Works
        </nav>

        <header class="page-head">
          <h1>How NearbyPro Works</h1>
          <p class="page-lede">
            NearbyPro makes it simple to hire local help or grow a local business. Here's exactly what
            happens — for both service seekers and service providers.
          </p>
        </header>

        <div class="page-body">
          <h2>For service seekers</h2>
          <p>Need something done? You're four steps away from the right local professional.</p>
          <ol class="steps">
            <li>
              <span class="step-num">1</span>
              <div>
                <h3>Search for a service</h3>
                <p>Tell us what you need — a plumber, maths tutor, home cook, electrician — and your area.
                   NearbyPro instantly shows verified providers near you.</p>
              </div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <h3>Compare providers</h3>
                <p>Review ratings, customer reviews, years of experience and pricing side by side, so you
                   can choose with confidence rather than guesswork.</p>
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <h3>Connect directly</h3>
                <p>Message a provider in-app or reveal their contact to discuss your requirement, timing and
                   price. There are no middlemen and no markups.</p>
              </div>
            </li>
            <li>
              <span class="step-num">4</span>
              <div>
                <h3>Get the job done &amp; review</h3>
                <p>Once the work is complete, leave an honest review. Your feedback helps the next person
                   in your neighbourhood hire safely.</p>
              </div>
            </li>
          </ol>

          <h2>For service providers</h2>
          <p>Run a local business? Get discovered by customers near you in four simple steps.</p>
          <ol class="steps">
            <li>
              <span class="step-num">1</span>
              <div>
                <h3>Create your free listing</h3>
                <p>Sign up as a provider and add your services, area of operation, experience and pricing.
                   Listing on NearbyPro is completely free.</p>
              </div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <h3>Build a trusted profile</h3>
                <p>Showcase your skills, photos and customer reviews. A complete, verified profile earns
                   more trust and more enquiries.</p>
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <h3>Receive genuine enquiries</h3>
                <p>Customers nearby find you through search and reach out directly. You only respond to
                   people genuinely interested in your service.</p>
              </div>
            </li>
            <li>
              <span class="step-num">4</span>
              <div>
                <h3>Grow your reputation</h3>
                <p>Deliver great work, collect reviews and climb the rankings in your locality — turning
                   first-time customers into repeat business.</p>
              </div>
            </li>
          </ol>

          <div class="cta-row">
            <a routerLink="/browse" class="btn-nb-primary btn">
              <i class="bi bi-search me-1"></i>Find a service
            </a>
            <a routerLink="/provider-signup" class="btn-nb-outline btn">
              <i class="bi bi-briefcase me-1"></i>Become a provider
            </a>
          </div>

          <p class="page-foot">
            Still have questions? Read our <a routerLink="/faq">FAQ</a> or learn more
            <a routerLink="/about">about NearbyPro</a>.
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
    .page-body > p { color:var(--nb-text); font-size:.97rem; line-height:1.75; }
    .page-body h2 { font-family:var(--font-display); font-weight:700; font-size:1.4rem; margin:2.25rem 0 .8rem; }
    .steps { list-style:none; padding:0; margin:1rem 0 0; display:grid; gap:.85rem; }
    .steps li { display:flex; gap:1rem; background:var(--nb-surface); border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.1rem 1.25rem; }
    .step-num { flex-shrink:0; width:34px; height:34px; border-radius:50%; background:var(--nb-primary); color:#fff; font-family:var(--font-display); font-weight:700; display:flex; align-items:center; justify-content:center; }
    .steps h3 { font-family:var(--font-display); font-weight:700; font-size:1.02rem; margin:.15rem 0 .35rem; color:var(--nb-primary); }
    .steps p { margin:0; font-size:.93rem; line-height:1.65; color:var(--nb-text-muted); }
    .cta-row { display:flex; flex-wrap:wrap; gap:.75rem; margin:2.25rem 0 0; }
    .page-foot { margin-top:2.25rem; padding-top:1.25rem; border-top:1px solid var(--nb-border); }
    .page-foot a { color:var(--nb-primary); }
    @media (max-width:640px) { .page-head h1 { font-size:1.8rem; } }
  `]
})
export class HowItWorksComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSeo(
      'How It Works — NearbyPro Local Service Marketplace',
      'Learn how NearbyPro works for both service seekers and providers: search, compare, ' +
        'connect and review trusted local professionals across India — listing is free for businesses.',
      'how NearbyPro works, hire local services, list a business, find professionals near me, India'
    );
  }
}
