// src/app/features/browse/browse.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService, Provider, PaginatedResponse, ApiResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ChatService } from '../../core/services/chat.service';
import { DISTRICTS }   from '../../core/constants';
import { BannerAdComponent } from '../../shared/components/banner-ad.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { JdSearchBarComponent } from '../../shared/components/jd-search-bar.component';
import { ContactLoginModalComponent } from '../../shared/components/contact-login-modal.component';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BannerAdComponent, SkeletonLoaderComponent,
            JdSearchBarComponent, ContactLoginModalComponent],
  template: `
    <div style="min-height:80vh;background:var(--nb-bg)">

      <!-- SEARCH BAR (persists location + service) -->
      <div class="srch-wrap">
        <div class="container">
          <app-jd-search-bar [initialLocation]="district()" (searchSubmit)="onSearch2($event)" />
        </div>
      </div>

      <!-- FILTER CHIPS ROW (11.10) -->
      <div class="chips-wrap" (click)="sortOpen() && sortOpen.set(false)">
        <div class="container chips-row">

          <!-- Sort chip — custom dropdown (replaces broken native <select>) -->
          <div class="chip-wrap" style="position:relative">
            <button class="chip chip-sort" [class.on]="sort !== 'rating'"
                    (click)="$event.stopPropagation(); sortOpen.set(!sortOpen())">
              <i class="bi bi-sliders"></i>
              {{ sortLabel() }}
              <i class="bi" [class.bi-chevron-down]="!sortOpen()" [class.bi-chevron-up]="sortOpen()"></i>
            </button>
            @if (sortOpen()) {
              <div class="chip-drop" (click)="$event.stopPropagation()">
                @for (s of sortOptions; track s.value) {
                  <button class="chip-opt" [class.active]="sort === s.value" (click)="setSort(s.value)">
                    @if (sort === s.value) { <i class="bi bi-check2"></i> } @else { <i class="bi bi-dash" style="opacity:0"></i> }
                    {{ s.label }}
                  </button>
                }
              </div>
            }
          </div>

          <button class="chip" [class.on]="minRating()===4.5" (click)="toggleRating(4.5)">
            <i class="bi bi-star-fill"></i>Top Rated
          </button>
          <button class="chip" [class.on]="verifiedOnly()" (click)="toggleVerified()">
            <i class="bi bi-patch-check-fill"></i>Verified
          </button>
          <button class="chip" [class.on]="onlineOnly()" (click)="toggleOnline()">
            <i class="bi bi-lightning-charge-fill"></i>Quick Response
          </button>
          <button class="chip" [class.on]="minRating()===4" (click)="toggleRating(4)">
            <i class="bi bi-star"></i>4★ &amp; above
          </button>
          <button class="chip chip-clear" (click)="clearAll()">
            <i class="bi bi-x-circle"></i>Clear All
          </button>
        </div>
      </div>

      <div class="container py-3">
        <div class="row g-3">

          <!-- RESULTS -->
          <div class="col-lg-8">
            <div class="res-hdr">
              <span class="res-count">{{ total() }} results</span>
              @if (cat() !== 'all') {
                <span class="active-filter">{{ catLabel(cat()) }} <button (click)="setCat('all')"><i class="bi bi-x"></i></button></span>
              }
            </div>

            @if (loading()) {
              @for (s of [1,2,3,4]; track s) { <div class="mb-3"><app-skeleton-loader type="provider" /></div> }
            } @else if (providers().length === 0) {
              <div class="empty-state" data-testid="empty-state">
                <i class="bi bi-search"></i><h5>No providers found</h5>
                <p>Try changing your filters or search term</p>
                <button class="btn-nb-outline btn" (click)="clearAll()">Clear Filters</button>
              </div>
            } @else {
              @for (p of providers(); track p._id) {
                <!-- HORIZONTAL CARD (11.11) -->
                <div class="jcard" data-testid="provider-card">
                  <a class="jcard-thumb" [routerLink]="['/provider', p._id]" [style.background]="catColor(p.category)">
                    @if (p.images && p.images.length) { <img [src]="p.images[0]" [alt]="p.businessName" /> }
                    @else { <span class="jthumb-init">{{ p.businessName.charAt(0) }}</span> }
                  </a>
                  <div class="jcard-body">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                      <a class="jcard-name" [routerLink]="['/provider', p._id]" data-testid="provider-name">{{ p.businessName }}</a>
                    </div>
                    <!-- rating badge green (11.12) -->
                    <div class="jcard-meta">
                      <span class="jrate" data-testid="rating-value">{{ p.ratingAvg }} <i class="bi bi-star-fill"></i></span>
                      <span class="jrate-cnt">{{ p.ratingCount }} Ratings</span>
                      <span class="jexp">· {{ p.experience }} yrs</span>
                    </div>
                    <!-- badges (11.13) -->
                    <div class="jbadges">
                      @if (p.ratingAvg >= 4.7) { <span class="jb jb-trust"><i class="bi bi-award-fill"></i>Trust</span> }
                      @if (p.isVerified) { <span class="jb jb-verified"><i class="bi bi-patch-check-fill"></i>Verified</span> }
                      @if (p.ratingCount >= 100) { <span class="jb jb-popular"><i class="bi bi-fire"></i>Popular</span> }
                      @if (p.isVerified) { <span class="jb jb-claimed"><i class="bi bi-check2-circle"></i>Claimed</span> }
                    </div>
                    <!-- location + keyword highlights (11.14) -->
                    <p class="jcard-loc"><i class="bi bi-geo-alt-fill"></i>
                      {{ p.userId?.location?.area || p.userId?.location?.district || 'Chennai' }}
                      <span class="jcat" data-testid="provider-category">· {{ catLabel(p.category) }}</span>
                    </p>
                    @if (p.skills && p.skills.length) {
                      <div class="jtags">
                        @for (s of p.skills.slice(0,3); track s) { <span class="jtag">{{ s }}</span> }
                      </div>
                    }
                    <!-- performance tag (11.15) -->
                    @if (p.ratingAvg >= 4.5) { <p class="jperf"><i class="bi bi-lightning-charge-fill"></i>High call pick up rate</p> }

                    <!-- action buttons (11.16) -->
                    <div class="jactions">
                      @if (revealedPhones()[p._id]) {
                        <a class="jbtn jbtn-call" [href]="'tel:' + revealedPhones()[p._id]"><i class="bi bi-telephone-fill"></i>{{ revealedPhones()[p._id] }}</a>
                      } @else {
                        <button class="jbtn jbtn-call" (click)="requestContact(p, 'call')"><i class="bi bi-telephone-fill"></i>Call</button>
                      }
                      <button class="jbtn jbtn-wa" (click)="requestContact(p, 'whatsapp')"><i class="bi bi-whatsapp"></i>WhatsApp</button>
                      <button class="jbtn jbtn-enq" (click)="enquire(p)"><i class="bi bi-chat-dots-fill"></i>Send Enquiry</button>
                    </div>
                  </div>
                </div>
              }

              @if (totalPages() > 1) {
                <div class="pagination-row">
                  <button class="pg-btn" [disabled]="page()===1" (click)="changePage(page()-1)"><i class="bi bi-chevron-left"></i></button>
                  @for (n of pageNumbers(); track n) { <button class="pg-btn" [class.active]="page()===n" (click)="changePage(n)">{{ n }}</button> }
                  <button class="pg-btn" [disabled]="page()===totalPages()" (click)="changePage(page()+1)"><i class="bi bi-chevron-right"></i></button>
                </div>
              }
            }

            <app-banner-ad />
          </div>

          <!-- RIGHT SIDEBAR: lead form (11.17) -->
          <div class="col-lg-4">
            <div class="lead-card">
              <h6 class="lead-title">Get the best deals</h6>
              <p class="lead-sub">Share your details and trusted providers will reach out to you.</p>
              <input class="nb-input mb-2" placeholder="Your name" [(ngModel)]="lead.name" />
              <div class="lead-phone mb-2">
                <span class="lead-cc">+91</span>
                <input class="lead-phone-input" placeholder="Mobile number" maxlength="10" inputmode="numeric" [(ngModel)]="lead.mobile" />
              </div>
              <input class="nb-input mb-2" placeholder="What service? (optional)" [(ngModel)]="lead.service" />
              <button class="btn-nb-accent btn w-100" [disabled]="sendingLead()" (click)="sendLead()">
                @if (sendingLead()) { Sending… } @else { <i class="bi bi-send me-1"></i>Send Enquiry }
              </button>
              <p class="lead-note"><i class="bi bi-shield-check"></i> Your number is safe with us.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    @if (showContactModal()) {
      <app-contact-login-modal (verified)="onContactVerified()" (closed)="showContactModal.set(false)" />
    }
  `,
  styles: [`
    .srch-wrap { background:linear-gradient(135deg,#0F2744,#1A3C5E); padding:18px 0; position:sticky; top:var(--nb-navbar-h,56px); z-index:1002; overflow:visible; }
    .chips-wrap { background:#fff; border-bottom:1px solid var(--nb-border); position:sticky; top:calc(var(--nb-navbar-h,56px) + 86px); z-index:1001; }
    .chips-row { display:flex; gap:8px; padding:10px 12px; overflow-x:auto; }
    .chip { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1.5px solid var(--nb-border); border-radius:20px; padding:6px 14px; font-family:var(--font-display); font-size:.78rem; font-weight:600; color:var(--nb-text-muted); cursor:pointer; white-space:nowrap; transition:all .15s; }
    .chip:hover { border-color:var(--nb-primary); color:var(--nb-primary); }
    .chip.on { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .chip-sort { gap:8px; }
    .chip-wrap { position:relative; flex-shrink:0; }
    .chip-drop { position:absolute; top:calc(100% + 6px); left:0; min-width:200px; background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-md); box-shadow:0 8px 24px rgba(0,0,0,.14); z-index:1200; padding:6px 0; }
    .chip-opt { display:flex; align-items:center; gap:8px; width:100%; padding:9px 16px; background:none; border:none; font-family:var(--font-display); font-size:.82rem; font-weight:600; color:var(--nb-text); cursor:pointer; text-align:left; transition:background .1s; }
    .chip-opt:hover { background:var(--nb-surface-2); }
    .chip-opt.active { color:var(--nb-primary); }
    .chip-clear { color:var(--nb-danger); }
    .res-hdr { display:flex; align-items:center; gap:10px; margin-bottom:.75rem; }
    .res-count { font-family:var(--font-display); font-weight:700; font-size:.95rem; }
    .active-filter { display:inline-flex; align-items:center; gap:6px; background:#EFF6FF; color:var(--nb-primary); border-radius:20px; padding:3px 10px 3px 12px; font-size:.78rem; font-weight:600; }
    .active-filter button { background:none; border:none; color:var(--nb-primary); cursor:pointer; padding:0; line-height:1; }
    /* horizontal card */
    .jcard { display:flex; gap:14px; background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:14px; margin-bottom:12px; transition:box-shadow .2s, transform .2s; }
    .jcard:hover { box-shadow:var(--shadow-lg); transform:translateY(-2px); }
    .jcard-thumb { width:120px; min-width:120px; height:120px; border-radius:var(--radius-md); overflow:hidden; display:flex; align-items:center; justify-content:center; text-decoration:none; }
    .jcard-thumb img { width:100%; height:100%; object-fit:cover; }
    .jthumb-init { font-family:var(--font-display); font-weight:800; font-size:2.4rem; color:rgba(255,255,255,.85); }
    .jcard-body { flex:1; min-width:0; }
    .jcard-name { font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--nb-text); text-decoration:none; }
    .jcard-name:hover { color:var(--nb-primary); }
    .jcard-meta { display:flex; align-items:center; gap:8px; margin:4px 0; flex-wrap:wrap; }
    .jrate { background:#1a7a4a; color:#fff; border-radius:5px; padding:2px 7px; font-size:.8rem; font-weight:700; display:inline-flex; align-items:center; gap:3px; }
    .jrate-cnt, .jexp { font-size:.78rem; color:var(--nb-text-muted); }
    .jbadges { display:flex; flex-wrap:wrap; gap:5px; margin:6px 0; }
    .jb { display:inline-flex; align-items:center; gap:3px; font-size:.66rem; font-weight:700; padding:2px 8px; border-radius:12px; text-transform:uppercase; letter-spacing:.03em; }
    .jb-trust { background:#FEF3C7; color:#92400e; }
    .jb-verified { background:#DBEAFE; color:#1e40af; }
    .jb-popular { background:#FFEDD5; color:#9a3412; }
    .jb-claimed { background:#1f2937; color:#fff; }
    .jcard-loc { font-size:.8rem; color:var(--nb-text-muted); margin:4px 0; display:flex; align-items:center; gap:5px; }
    .jcard-loc i { color:var(--nb-danger); }
    .jcat { color:var(--nb-text-muted); }
    .jtags { display:flex; flex-wrap:wrap; gap:5px; margin:4px 0; }
    .jtag { background:var(--nb-surface-2); color:var(--nb-text-muted); border-radius:6px; padding:2px 9px; font-size:.72rem; font-weight:500; }
    .jperf { font-size:.75rem; color:#1a7a4a; font-weight:600; margin:4px 0; display:flex; align-items:center; gap:4px; }
    .jactions { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .jbtn { display:inline-flex; align-items:center; gap:6px; border:none; border-radius:8px; padding:8px 16px; font-family:var(--font-display); font-weight:700; font-size:.82rem; cursor:pointer; text-decoration:none; transition:opacity .15s; }
    .jbtn:hover { opacity:.88; }
    .jbtn-call { background:#1a7a4a; color:#fff; }
    .jbtn-wa { background:#fff; color:#1a7a4a; border:1.5px solid #1a7a4a; }
    .jbtn-enq { background:#1565C0; color:#fff; }
    .pagination-row { display:flex; gap:6px; justify-content:center; margin:1.5rem 0; }
    .pg-btn { width:36px; height:36px; border-radius:var(--radius-sm); border:1.5px solid var(--nb-border); background:#fff; cursor:pointer; font-family:var(--font-display); font-weight:600; }
    .pg-btn.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .pg-btn:disabled { opacity:.4; cursor:not-allowed; }
    .empty-state { text-align:center; padding:3rem 1rem; color:var(--nb-text-muted); background:#fff; border-radius:var(--radius-lg); border:1px solid var(--nb-border); }
    .empty-state i { font-size:2.5rem; display:block; margin-bottom:.75rem; }
    .lead-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; position:sticky; top:calc(var(--nb-navbar-h,56px) + 156px); }
    .lead-title { font-family:var(--font-display); font-weight:800; margin:0 0 4px; }
    .lead-sub { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:1rem; }
    .lead-phone { display:flex; align-items:stretch; border:1.5px solid var(--nb-border); border-radius:var(--radius-md); overflow:hidden; background:#fff; }
    .lead-phone:focus-within { border-color:var(--nb-accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--nb-accent) 15%, transparent); }
    .lead-cc { display:flex; align-items:center; padding:0 10px; background:#f5f5f5; border-right:1.5px solid var(--nb-border); font-size:.88rem; font-weight:600; color:#555; white-space:nowrap; }
    .lead-phone-input { flex:1; border:none; outline:none; padding:10px 12px; font-size:.9rem; background:transparent; min-width:0; }
    .lead-note { font-size:.72rem; color:var(--nb-text-muted); margin:10px 0 0; display:flex; align-items:center; gap:5px; }
    .lead-note i { color:var(--nb-success); }
    @media (max-width:575px){ .jcard{ flex-direction:column; } .jcard-thumb{ width:100%; height:160px; } }
  `]
})
export class BrowseComponent implements OnInit {
  providers  = signal<Provider[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  cat        = signal('all');
  minRating  = signal(0);
  verifiedOnly = signal(false);
  onlineOnly = signal(false);   // was plain boolean — now signal for consistent reactivity
  sortOpen   = signal(false);
  sort       = 'rating';
  q          = '';
  district   = signal('');
  districts  = DISTRICTS;
  private searchTimer: any;

  sortOptions = [
    { value: 'rating',     label: 'Top Rated' },
    { value: 'popular',    label: 'Most Popular' },
    { value: 'price_asc',  label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
  ];
  sortLabel = computed(() => {
    return 'Sort: ' + (this.sortOptions.find(s => s.value === this.sort)?.label ?? 'Top Rated');
  });

  // contact reveal
  revealedPhones = signal<Record<string, string>>({});
  showContactModal = signal(false);
  private pending: { provider: Provider; channel: 'call' | 'whatsapp' } | null = null;
  private pendingEnquiry: Provider | null = null;

  // lead form
  lead = { name: '', mobile: '', service: '' };
  sendingLead = signal(false);

  totalPages  = computed(() => Math.ceil(this.total() / 12));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1).slice(0, 7));

  cats = [
    { id:'all',             label:'All' },
    { id:'home_services',   label:'Home Services' },
    { id:'education',       label:'Education' },
    { id:'food',            label:'Food & Catering' },
    { id:'bakery',          label:'Bakery' },
    { id:'beauty_salon',    label:'Beauty & Salon' },
    { id:'fitness',         label:'Fitness' },
    { id:'wellness',        label:'Spa & Wellness' },
    { id:'health_medical',  label:'Health & Medical' },
    { id:'events',          label:'Events' },
    { id:'photography',     label:'Photography' },
    { id:'repair_services', label:'Repair Services' },
    { id:'automotive',      label:'Automotive' },
    { id:'clothing_fashion',label:'Clothing & Fashion' },
    { id:'pet_care',        label:'Pet Care' },
    { id:'cleaning',        label:'Cleaning' },
    { id:'transport',       label:'Transport' },
    { id:'interior_design', label:'Interior Design' },
    { id:'legal_finance',   label:'Legal & Finance' },
    { id:'it_tech',         label:'IT & Tech' },
    { id:'childcare',       label:'Childcare' },
    { id:'wedding',         label:'Wedding Services' },
    { id:'music_arts',      label:'Music & Arts' },
    { id:'sports',          label:'Sports & Coaching' },
    { id:'printing',        label:'Printing' },
    { id:'security',        label:'Security' },
    { id:'agriculture',     label:'Agriculture' },
  ];

  constructor(
    private api: ApiService, private route: ActivatedRoute, private router: Router,
    private auth: AuthService, private toast: ToastService, private chat: ChatService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['category']) this.cat.set(p['category']);
      if (p['q'])        { this.q = p['q']; this.lead.service = p['q']; }
      this.district.set(p['district'] ?? this.auth.currentUser()?.location?.district ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    const params: Record<string, any> = { page: this.page(), limit: 12, sort: this.sort };
    if (this.cat() !== 'all')     params['category'] = this.cat();
    if (this.minRating() > 0)     params['rating']   = this.minRating();
    if (this.onlineOnly())        params['isOnline']  = true;
    if (this.verifiedOnly())      params['verified']  = true;
    if (this.q.trim())            params['search']    = this.q.trim();
    if (this.district())          params['district']  = this.district();

    this.api.get<PaginatedResponse<Provider>>('/providers', params).subscribe({
      next: res => {
        const data = res.data;
        this.providers.set(data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch2(e: { location: string; q: string }) {
    this.q = e.q;
    if (e.location) this.district.set(e.location);
    this.page.set(1);
    this.load();
  }

  toggleRating(r: number) { this.minRating.set(this.minRating() === r ? 0 : r); this.page.set(1); this.load(); }
  toggleVerified()        { this.verifiedOnly.set(!this.verifiedOnly()); this.page.set(1); this.load(); }
  toggleOnline()          { this.onlineOnly.set(!this.onlineOnly()); this.page.set(1); this.load(); }
  setSort(v: string)      { this.sort = v; this.sortOpen.set(false); this.page.set(1); this.load(); }
  setCat(id: string)      { this.cat.set(id); this.page.set(1); this.load(); }
  changePage(n: number)   { this.page.set(n); this.load(); window.scrollTo(0, 0); }

  clearAll() {
    this.q = ''; this.cat.set('all'); this.minRating.set(0);
    this.onlineOnly.set(false); this.verifiedOnly.set(false);
    this.sort = 'rating'; this.sortOpen.set(false);
    this.page.set(1); this.load();
  }

  catLabel(id: string) { return this.cats.find(c => c.id === id)?.label ?? id; }
  catColor(id: string) {
    const m: Record<string,string> = {
      home_services:'#2563A8', education:'#059669', food:'#D97706',
      bakery:'#B45309', beauty_salon:'#DB2777', fitness:'#0891B2',
      wellness:'#7C3AED', health_medical:'#0F766E', events:'#DC2626',
      photography:'#7C3AED', repair_services:'#6B7280', automotive:'#1D4ED8',
      clothing_fashion:'#BE185D', pet_care:'#92400E', cleaning:'#0369A1',
      transport:'#374151', interior_design:'#B45309', legal_finance:'#1E40AF',
      it_tech:'#1D4ED8', childcare:'#D97706', wedding:'#9333EA',
      music_arts:'#0F766E', sports:'#16A34A', printing:'#6B7280',
      security:'#374151', agriculture:'#15803D',
    };
    return m[id] ?? '#1A3C5E';
  }

  // ── Per-card contact reveal (gated by OTP) ───────────────────
  requestContact(p: Provider, channel: 'call' | 'whatsapp') {
    this.pending = { provider: p, channel };
    if (!this.auth.isLoggedIn()) { this.showContactModal.set(true); return; }
    this.revealAndAct();
  }
  onContactVerified() {
    this.showContactModal.set(false);
    if (this.pendingEnquiry) { const p = this.pendingEnquiry; this.pendingEnquiry = null; this.openChat(p); }
    else { this.revealAndAct(); }
  }

  private revealAndAct() {
    if (!this.pending) return;
    const { provider, channel } = this.pending;
    this.api.post<ApiResponse<{ phone: string }>>(`/providers/${provider._id}/contact`, { channel }).subscribe({
      next: res => {
        const phone = res.data?.phone ?? provider.userId?.phone ?? '';
        this.revealedPhones.update(m => ({ ...m, [provider._id]: phone }));
        if (channel === 'whatsapp' && phone) {
          const e164 = phone.replace(/\D/g, '').slice(-10);
          window.open(`https://wa.me/91${e164}`, '_blank', 'noopener');
        } else {
          this.toast.success(`Number revealed — tap ${phone} to call`);
        }
        this.pending = null;
      },
      error: () => this.toast.error('Could not reveal contact. Try again.'),
    });
  }

  enquire(p: Provider) {
    if (!this.auth.isLoggedIn()) { this.pendingEnquiry = p; this.showContactModal.set(true); return; }
    this.openChat(p);
  }
  private openChat(p: Provider) {
    this.chat.open({ providerId: p._id }).subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
      error: () => this.toast.error('Could not open chat.'),
    });
  }

  // ── Lead form (11.17) ────────────────────────────────────────
  sendLead() {
    if (!this.lead.name.trim() || !/^\d{10}$/.test(this.lead.mobile.trim())) {
      this.toast.error('Enter your name and a valid 10-digit mobile.'); return;
    }
    this.sendingLead.set(true);
    this.api.post<ApiResponse<any>>('/leads', {
      name: this.lead.name.trim(), mobile: this.lead.mobile.trim(),
      service: this.lead.service.trim() || this.q, location: this.district(),
    }).subscribe({
      next: () => { this.sendingLead.set(false); this.toast.success('Enquiry sent! Providers will reach out soon.'); this.lead = { name:'', mobile:'', service:'' }; },
      error: () => { this.sendingLead.set(false); this.toast.error('Could not send enquiry.'); },
    });
  }
}
