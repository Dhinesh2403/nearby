// src/app/features/home/home.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink }  from '@angular/router';
import { CommonModule }        from '@angular/common';
import { FormsModule }         from '@angular/forms';
import { ApiService, Provider, PaginatedResponse } from '../../core/services/api.service';
import { CategoryService } from '../../core/services/category.service';
import { JdSearchBarComponent } from '../../shared/components/jd-search-bar.component';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, JdSearchBarComponent],
  template: `
    <!-- GLOBAL ANNOUNCEMENT (5.13) -->
    @if (settings.settings()?.announcement?.active && settings.settings()?.announcement?.text) {
      <div class="announce-bar">
        <i class="bi bi-megaphone-fill me-2"></i>{{ settings.settings()!.announcement.text }}
      </div>
    }

    <!-- RECENTLY BANNED SCAM ALERT (5.10) -->
    @if ((settings.settings()?.recentlyBanned?.length ?? 0) > 0) {
      <div class="scam-bar">
        <i class="bi bi-shield-exclamation me-2"></i>
        <strong>Safety alert:</strong>&nbsp;Recently suspended for policy violations —
        {{ settings.settings()!.recentlyBanned.join(', ') }}. Avoid contact.
      </div>
    }

    <!-- HERO -->
    <section class="hero-section">
      <div class="hero-pattern"></div>
      <div class="container position-relative">
        <div class="row align-items-center" style="min-height:76vh">
          <div class="col-lg-6 fade-up fade-up-1">
            <div class="hero-tag"><i class="bi bi-geo-alt-fill me-1"></i>Serving Chennai & growing fast</div>
            <h1 class="hero-title">Find Trusted<br><span class="hero-accent">Local Services</span><br>Near You</h1>
            <p class="hero-sub">Plumbers, tutors, home cooks, electricians — all verified, reviewed, and bookable in under 60 seconds.</p>
            <app-jd-search-bar (searchSubmit)="onJdSearch($event)" />
            <div class="hero-stats">
              <div class="hs-stat"><span class="hs-num">500+</span><span class="hs-lbl">Verified Providers</span></div>
              <div class="hs-div"></div>
              <div class="hs-stat"><span class="hs-num">4.8★</span><span class="hs-lbl">Avg Rating</span></div>
              <div class="hs-div"></div>
              <div class="hs-stat"><span class="hs-num">Free</span><span class="hs-lbl">To Use</span></div>
            </div>
          </div>
          <div class="col-lg-6 d-none d-lg-flex justify-content-center fade-up fade-up-2">
            <div class="hero-illo">
              <div class="fc fc1"><i class="bi bi-tools" style="color:#2563A8"></i><div><p class="fc-name">Rajan Plumbing</p><div class="fc-stars">★★★★★</div></div></div>
              <div class="fc fc2"><i class="bi bi-book" style="color:#059669"></i><div><p class="fc-name">Priya Maths Tutor</p><div class="fc-stars">★★★★★</div></div></div>
              <div class="fc fc3"><i class="bi bi-check-circle-fill" style="color:#4ade80"></i><span>Contact revealed!</span></div>
              <div class="hero-circle"></div>
              <div class="hero-circle-inner"><i class="bi bi-geo-alt-fill"></i></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="py-5 bg-white">
      <div class="container">
        <div class="text-center mb-4"><h2 class="section-title">Browse by Category</h2><p class="section-sub">From home repairs to learning — find everything local</p></div>
        <div class="cat-grid">
          @for (c of cats(); track c.id) {
            <div class="cat-chip" (click)="browseCat(c.id)" [style.--cc]="c.color">
              @if (c.featured) { <span class="cc-featured">Featured</span> }
              <div class="cc-icon"><i class="bi" [class]="c.icon"></i></div>
              <span class="cc-lbl">{{ c.label }}</span>
              <span class="cc-cnt">{{ c.count }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="py-5" style="background:var(--nb-bg)">
      <div class="container">
        <div class="text-center mb-5"><h2 class="section-title">How NearBy Works</h2><p class="section-sub">Three simple steps</p></div>
        <div class="row g-4">
          @for (s of steps; track s.n) {
            <div class="col-md-4">
              <div class="step-card">
                <div class="step-n">{{ s.n }}</div>
                <div class="step-icon"><i class="bi" [class]="s.icon"></i></div>
                <h4 class="step-title">{{ s.title }}</h4>
                <p class="step-desc">{{ s.desc }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- TOP PROVIDERS (live from backend) -->
    <section class="py-5 bg-white">
      <div class="container">
        <div class="d-flex justify-content-between align-items-end mb-4">
          <div><h2 class="section-title mb-1">Top Rated Providers</h2><p class="section-sub mb-0">Verified professionals near you</p></div>
          <a routerLink="/browse" class="btn-nb-outline btn btn-sm">View All <i class="bi bi-arrow-right ms-1"></i></a>
        </div>
        @if (loadingProviders()) {
          <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
        } @else {
          <div class="row g-3">
            @for (p of topProviders(); track p._id) {
              <div class="col-md-6 col-lg-4">
                <div class="prov-card nb-card" [routerLink]="['/provider', p._id]">
                  <div class="pc-strip" [style.background]="catColor(p.category)"></div>
                  <div class="card-body p-3">
                    <div class="d-flex gap-3 align-items-start">
                      <div class="pc-avatar" [style.background]="catColor(p.category)">{{ p.businessName.charAt(0) }}</div>
                      <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                          <h6 class="mb-0 fw-display" style="font-size:.95rem">{{ p.businessName }}</h6>
                          @if (p.isVerified) { <span class="nb-badge nb-badge-success"><i class="bi bi-patch-check-fill"></i>Verified</span> }
                        </div>
                        <p class="text-muted-nb mb-1" style="font-size:.8rem">{{ p.subCategory }}</p>
                        <div class="d-flex align-items-center gap-2">
                          <span class="star-filled">★</span>
                          <strong style="font-size:.875rem">{{ p.ratingAvg }}</strong>
                          <span class="text-muted-nb" style="font-size:.75rem">({{ p.ratingCount }})</span>
                          @if (p.isOnline) { <span class="nb-badge nb-badge-primary"><i class="bi bi-camera-video-fill"></i>Online</span> }
                        </div>
                      </div>
                    </div>
                    <hr class="divider my-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="fw-display" style="font-weight:700;color:var(--nb-primary)">₹{{ p.price }}<span style="font-weight:400;font-size:.75rem;color:var(--nb-text-muted)"> onwards</span></span>
                      <button class="btn-nb-primary btn btn-sm"><i class="bi bi-chat-dots me-1"></i>Contact</button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-sec">
      <div class="container text-center">
        <h2 class="cta-title">Are you a local professional?</h2>
        <p class="cta-sub">List your services for free and reach thousands of customers in your city.</p>
        <div class="d-flex gap-3 justify-content-center flex-wrap">
          <a routerLink="/provider-signup" class="btn-nb-accent btn btn-lg">Join as Provider — Free</a>
          <a routerLink="/browse" class="btn btn-lg" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:var(--radius-md)">Browse Services</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .announce-bar { background:linear-gradient(90deg,var(--nb-primary),var(--nb-primary-light)); color:#fff; text-align:center; padding:10px 16px; font-size:.875rem; font-weight:600; font-family:var(--font-display); }
    .scam-bar { background:#FEE2E2; color:#991b1b; text-align:center; padding:10px 16px; font-size:.85rem; border-bottom:1px solid #FECACA; }
    .hero-section { background:linear-gradient(135deg,#0F2744 0%,#1A3C5E 60%,#1e4d7a 100%); padding:80px 0 60px; position:relative; overflow:visible; }
    @media (max-width:767px) { .hero-section { padding:48px 0 36px; } .hero-sub { font-size:.9rem; } .hero-stats { flex-wrap:wrap; gap:12px; } }
    .hero-pattern { position:absolute; inset:0; background-image:radial-gradient(circle at 20% 80%,rgba(245,158,11,.08) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(37,99,168,.15) 0%,transparent 50%); }
    .hero-tag { display:inline-flex; align-items:center; background:rgba(245,158,11,.15); color:var(--nb-accent); border:1px solid rgba(245,158,11,.3); border-radius:20px; padding:4px 14px; font-size:.78rem; font-family:var(--font-display); font-weight:600; letter-spacing:.05em; text-transform:uppercase; margin-bottom:1rem; }
    .hero-title { font-size:clamp(2.2rem,5vw,3.5rem); font-weight:800; color:#fff; line-height:1.1; margin-bottom:1rem; }
    .hero-accent { color:var(--nb-accent); }
    .hero-sub { color:rgba(255,255,255,.7); font-size:1.05rem; max-width:440px; margin-bottom:2rem; }
    .hero-search { display:flex; align-items:center; background:#fff; border-radius:var(--radius-xl); padding:6px 6px 6px 18px; box-shadow:0 8px 32px rgba(0,0,0,.2); max-width:520px; margin-bottom:2rem; }
    .hero-location { max-width:520px; margin-bottom:2rem; animation:slideUp .3s ease-out; }
    .hero-service { max-width:520px; margin-bottom:2rem; animation:slideUp .3s ease-out; }
    @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    .hs-icon { color:var(--nb-text-muted); margin-right:8px; }
    .hs-input { flex:1; border:none; outline:none; font-family:var(--font-body); font-size:.95rem; background:transparent; }
    .hs-input::placeholder { color:var(--nb-text-light); }
    .hs-btn { background:var(--nb-accent); color:var(--nb-primary); border:none; border-radius:var(--radius-lg); padding:10px 24px; font-family:var(--font-display); font-weight:700; cursor:pointer; white-space:nowrap; }
    .hero-stats { display:flex; align-items:center; gap:20px; }
    .hs-stat { display:flex; flex-direction:column; }
    .hs-num { font-family:var(--font-display); font-size:1.25rem; font-weight:800; color:#fff; }
    .hs-lbl { font-size:.72rem; color:rgba(255,255,255,.5); text-transform:uppercase; letter-spacing:.05em; }
    .hs-div { width:1px; height:32px; background:rgba(255,255,255,.2); }
    .hero-illo { position:relative; width:380px; height:380px; }
    .hero-circle { width:320px; height:320px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:50%; position:absolute; top:30px; left:30px; }
    .hero-circle-inner { width:110px; height:110px; background:var(--nb-accent); border-radius:50%; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); display:flex; align-items:center; justify-content:center; font-size:2.2rem; color:var(--nb-primary); box-shadow:0 0 0 20px rgba(245,158,11,.15); }
    .fc { position:absolute; background:#fff; border-radius:var(--radius-md); padding:10px 14px; box-shadow:var(--shadow-lg); display:flex; align-items:center; gap:10px; animation:floatY 3s ease-in-out infinite; }
    .fc i { font-size:1.4rem; }
    .fc1 { top:30px; left:0; animation-delay:0s; }
    .fc2 { bottom:60px; right:0; animation-delay:1s; }
    .fc3 { bottom:20px; left:20px; animation-delay:.5s; background:var(--nb-primary); color:#fff; font-size:.8rem; font-weight:600; font-family:var(--font-display); }
    .fc-name { margin:0; font-family:var(--font-display); font-size:.85rem; font-weight:700; }
    .fc-stars { color:var(--nb-accent); font-size:.7rem; }
    @keyframes floatY { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
    .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:16px; }
    @media (max-width:768px) { .cat-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); } }
    .cat-chip { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:28px 16px; background:linear-gradient(135deg,color-mix(in srgb,var(--cc,var(--nb-primary)) 8%,white) 0%,#fff 100%); border:1.5px solid color-mix(in srgb,var(--cc,var(--nb-primary)) 15%,white); border-radius:var(--radius-xl); cursor:pointer; transition:all .25s cubic-bezier(.4,.0,.2,1); text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.04); min-height:180px; }
    .cat-chip:hover { border-color:var(--cc,var(--nb-primary)); box-shadow:0 12px 32px color-mix(in srgb,var(--cc,var(--nb-primary)) 15%,rgba(0,0,0,0)); transform:translateY(-4px); background:linear-gradient(135deg,color-mix(in srgb,var(--cc,var(--nb-primary)) 12%,white) 0%,#fff 100%); }
    .cc-icon { width:64px; height:64px; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,var(--cc,var(--nb-primary)),color-mix(in srgb,var(--cc,var(--nb-primary)) 70%,#fff)); box-shadow:0 4px 16px color-mix(in srgb,var(--cc,var(--nb-primary)) 30%,rgba(0,0,0,0)); }
    .cc-icon i { font-size:1.8rem; color:#fff; }
    .cc-lbl { font-family:var(--font-display); font-size:.85rem; font-weight:700; text-transform:capitalize; letter-spacing:.02em; color:var(--nb-text); }
    .cc-cnt { font-size:.72rem; color:var(--nb-text-muted); font-weight:500; }
    .cc-featured { position:absolute; top:8px; right:8px; background:var(--nb-accent); color:var(--nb-primary); font-size:.6rem; font-weight:800; text-transform:uppercase; letter-spacing:.04em; padding:2px 7px; border-radius:10px; }
    .step-card { background:#fff; border-radius:var(--radius-lg); padding:2rem; border:1px solid var(--nb-border); text-align:center; position:relative; transition:all .25s; }
    .step-card:hover { box-shadow:var(--shadow-lg); transform:translateY(-4px); }
    .step-n { position:absolute; top:-16px; left:50%; transform:translateX(-50%); width:32px; height:32px; background:var(--nb-primary); color:#fff; border-radius:50%; font-family:var(--font-display); font-weight:800; font-size:.85rem; display:flex; align-items:center; justify-content:center; }
    .step-icon { width:64px; height:64px; background:#EFF6FF; border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center; margin:.5rem auto 1rem; font-size:1.75rem; color:var(--nb-primary-light); }
    .step-title { font-size:1.05rem; font-weight:700; margin-bottom:.5rem; }
    .step-desc { color:var(--nb-text-muted); font-size:.875rem; margin:0; }
    .prov-card { cursor:pointer; }
    .pc-strip { height:4px; }
    .pc-avatar { width:44px; height:44px; min-width:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:1.25rem; color:#fff; }
    .cta-sec { background:linear-gradient(135deg,var(--nb-accent) 0%,#f97316 100%); padding:5rem 1rem; }
    .cta-title { font-size:clamp(1.8rem,4vw,2.8rem); font-weight:800; color:var(--nb-primary); margin-bottom:.75rem; }
    .cta-sub { color:rgba(26,60,94,.7); font-size:1.05rem; margin-bottom:2rem; }
  `]
})
export class HomeComponent implements OnInit {
  topProviders    = signal<Provider[]>([]);
  loadingProviders = signal(true);

  cats = computed(() => [
    ...this.catSvc.cats().map(c => ({ ...c, count: c.count ? `${c.count} listed` : 'New' })),
    { id:'all', label:'View All', icon:'bi-grid', count:'', color:'#1A3C5E', featured: false },
  ]);

  steps = [
    { n:1, icon:'bi-search',         title:'Search & Browse',  desc:'Find providers by category, location, or keyword. Filter by rating and remote availability.' },
    { n:2, icon:'bi-calendar-check', title:'Book Instantly',   desc:'Pick a date and time. In-person or remote — your choice. No phone calls needed.' },
    { n:3, icon:'bi-star',           title:'Rate & Review',    desc:'After service, leave a review to help others. Build a trustworthy community.' },
  ];

  // Auto-detected area label (e.g. "Vadavalli, Coimbatore") for the location box (11.2)

  constructor(private api: ApiService, private router: Router, public settings: SettingsService, private catSvc: CategoryService) { catSvc.load(); }

  ngOnInit() {
    this.api.get<PaginatedResponse<Provider>>('/providers', { limit: '6', sort: 'rating' })
      .subscribe({
        next: res => { this.topProviders.set(res.data); this.loadingProviders.set(false); },
        error: ()  => this.loadingProviders.set(false),
      });

  }

  browseCat(id: string)         { this.router.navigate(['/browse'], { queryParams: { category: id } }); }

  onJdSearch(e: { location: string; q: string }) {
    const qp: Record<string, string> = {};
    if (e.q) qp['q'] = e.q;
    if (e.location) qp['district'] = e.location;
    this.router.navigate(['/browse'], { queryParams: qp });
  }

  catColor(id: string) { return id === 'all' ? '#1A3C5E' : this.catSvc.color(id); }
}
