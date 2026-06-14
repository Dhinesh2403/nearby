// src/app/features/browse/browse.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ApiService, Provider, PaginatedResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { DISTRICTS }   from '../../core/constants';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div style="min-height:80vh">

      <!-- FILTER BAR -->
      <div class="fbar">
        <div class="container">
          <div class="fbar-inner">
            <div class="fsearch">
              <i class="bi bi-search"></i>
              <input type="text" [(ngModel)]="q" (ngModelChange)="onSearch()"
                     placeholder="Search service or provider..." class="fsearch-input" />
              @if (q) { <button class="fclear" (click)="q='';load()"><i class="bi bi-x"></i></button> }
            </div>
            <div class="fcats d-none d-md-flex">
              @for (c of cats; track c.id) {
                <button class="fcat" [class.active]="cat()===c.id" (click)="setCat(c.id)">
                  <i class="bi" [class]="c.icon"></i>{{ c.label }}
                </button>
              }
            </div>
            <select class="nb-input d-md-none" style="max-width:160px;padding:6px 10px;font-size:.8rem"
                    [(ngModel)]="mobileCat" (ngModelChange)="setCat($event)">
              @for (c of cats; track c.id) { <option [value]="c.id">{{ c.label }}</option> }
            </select>
            <div class="fdistrict">
              <i class="bi bi-geo-alt-fill"></i>
              <select [(ngModel)]="district" (ngModelChange)="onDistrictChange()" title="District">
                <option value="">All districts</option>
                @for (d of districts; track d) { <option [value]="d">{{ d }}</option> }
              </select>
            </div>
            <label class="ftoggle">
              <input type="checkbox" [(ngModel)]="onlineOnly" (ngModelChange)="load()">
              <span class="tog-track"><span class="tog-thumb"></span></span>
              <span class="tog-lbl">Online</span>
            </label>
          </div>
          @if (district()) {
            <p class="dnote">
              <i class="bi bi-info-circle me-1"></i>
              Showing offline providers in <strong>{{ district() }}</strong>. Online providers are shown from all districts.
            </p>
          }
        </div>
      </div>

      <div class="container py-4">
        <div class="row g-4">

          <!-- SIDEBAR -->
          <div class="col-lg-3 d-none d-lg-block">
            <div class="sidebar-card">
              <p class="sb-title">Min Rating</p>
              <div class="rb-group">
                @for (r of [0,3,4,4.5]; track r) {
                  <button class="rb-btn" [class.active]="minRating()===r" (click)="setRating(r)">
                    {{ r===0 ? 'Any' : r+'+ ★' }}
                  </button>
                }
              </div>
              <hr class="divider">
              <p class="sb-title">Sort By</p>
              <select class="nb-input" [(ngModel)]="sort" (ngModelChange)="load()">
                <option value="rating">Top Rated</option>
                <option value="bookings">Most Booked</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <hr class="divider">
              <button class="btn-nb-outline btn btn-sm w-100" (click)="clearAll()">
                <i class="bi bi-arrow-counterclockwise me-1"></i>Clear Filters
              </button>
            </div>
          </div>

          <!-- RESULTS -->
          <div class="col-lg-9">
            <div class="res-hdr">
              <span class="res-count">{{ total() }} providers found</span>
              @if (cat() !== 'all') {
                <span class="active-filter">
                  {{ catLabel(cat()) }}
                  <button (click)="setCat('all')"><i class="bi bi-x"></i></button>
                </span>
              }
            </div>

            @if (loading()) {
              <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
            } @else if (providers().length === 0) {
              <div class="empty-state" data-testid="empty-state">
                <i class="bi bi-search"></i>
                <h5>No providers found</h5>
                <p>Try changing your filters or search term</p>
                <button class="btn-nb-outline btn" (click)="clearAll()">Clear Filters</button>
              </div>
            } @else {
              <div class="prov-grid">
                @for (p of providers(); track p._id) {
                  <div class="pc nb-card" [routerLink]="['/provider', p._id]" data-testid="provider-card">
                    <div class="pc-hdr" [style.background]="catColor(p.category)">
                      <div class="pc-av">{{ p.businessName.charAt(0) }}</div>
                      @if (p.isOnline) {
                        <span class="online-pill" data-testid="online-badge">
                          <i class="bi bi-camera-video-fill"></i> Online
                        </span>
                      }
                    </div>
                    <div class="pc-body">
                      <div class="d-flex justify-content-between align-items-start mb-1">
                        <h6 class="pc-name">{{ p.businessName }}</h6>
                        @if (p.isVerified) { <i class="bi bi-patch-check-fill" style="color:var(--nb-primary)" title="Verified"></i> }
                      </div>
                      <p class="pc-sub">
                        <span class="nb-badge nb-badge-muted" data-testid="provider-category">{{ catLabel(p.category) }}</span>
                        · {{ p.subCategory }}
                      </p>
                      <p class="pc-loc">
                        <i class="bi bi-geo-alt"></i>
                        {{ p.userId?.location?.area || p.userId?.location?.district || 'Location N/A' }}@if (p.userId?.location?.district) { , {{ p.userId?.location?.district }} }
                      </p>
                      <div class="pc-rating">
                        <span class="star-filled">★</span>
                        <strong data-testid="rating-value">{{ p.ratingAvg }}</strong>
                        <span class="text-muted-nb">({{ p.ratingCount }})</span>
                        · {{ p.experience }}yr exp
                      </div>
                      <p class="pc-bio">{{ p.bio | slice:0:85 }}...</p>
                      <div class="pc-footer">
                        <div>
                          <span class="pf-from">From</span>
                          <span class="pf-price">₹{{ p.price }}@if (p.priceMax && p.priceMax > p.price) { <span style="font-size:.8rem"> – ₹{{ p.priceMax }}</span> }</span>
                        </div>
                        <button class="btn-nb-primary btn btn-sm">Book Now</button>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="pagination-row">
                  <button class="pg-btn" [disabled]="page()===1" (click)="changePage(page()-1)">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  @for (n of pageNumbers(); track n) {
                    <button class="pg-btn" [class.active]="page()===n" (click)="changePage(n)">{{ n }}</button>
                  }
                  <button class="pg-btn" [disabled]="page()===totalPages()" (click)="changePage(page()+1)">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fbar { background:#fff; border-bottom:1px solid var(--nb-border); position:sticky; top:64px; z-index:1010; padding:12px 0; box-shadow:0 2px 8px rgba(0,0,0,.04); }
    .fbar-inner { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .fsearch { display:flex; align-items:center; background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:8px 14px; gap:8px; flex:1; min-width:200px; }
    .fsearch i { color:var(--nb-text-muted); }
    .fsearch-input { border:none; outline:none; background:transparent; font-family:var(--font-body); font-size:.875rem; width:100%; }
    .fclear { background:none; border:none; color:var(--nb-text-muted); cursor:pointer; }
    .fcats { display:flex; gap:6px; flex-wrap:wrap; }
    .fcat { display:inline-flex; align-items:center; gap:5px; background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:6px 14px; font-family:var(--font-display); font-size:.75rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--nb-text-muted); cursor:pointer; transition:all .2s; }
    .fcat.active, .fcat:hover { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .fcat i { font-size:.9rem; }
    .ftoggle { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
    .ftoggle input { display:none; }
    .tog-track { width:40px; height:22px; background:var(--nb-border); border-radius:11px; position:relative; transition:background .2s; }
    .ftoggle input:checked + .tog-track { background:var(--nb-primary); }
    .tog-thumb { width:16px; height:16px; background:#fff; border-radius:50%; position:absolute; top:3px; left:3px; transition:left .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
    .ftoggle input:checked + .tog-track .tog-thumb { left:21px; }
    .tog-lbl { font-family:var(--font-display); font-size:.8rem; font-weight:600; color:var(--nb-text-muted); }
    .sidebar-card { background:#fff; border:1px solid var(--nb-border); border-radius:var(--radius-lg); padding:1.25rem; position:sticky; top:120px; }
    .sb-title { font-family:var(--font-display); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--nb-text-muted); margin-bottom:.75rem; }
    .rb-group { display:flex; flex-direction:column; gap:6px; }
    .rb-btn { background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:var(--radius-sm); padding:6px 12px; font-size:.8rem; cursor:pointer; text-align:left; transition:all .15s; }
    .rb-btn.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .res-hdr { display:flex; align-items:center; gap:10px; margin-bottom:1rem; flex-wrap:wrap; }
    .res-count { font-family:var(--font-display); font-weight:700; font-size:.9rem; }
    .active-filter { display:inline-flex; align-items:center; gap:6px; background:#EFF6FF; color:var(--nb-primary); border-radius:20px; padding:3px 10px 3px 8px; font-size:.78rem; font-weight:600; }
    .active-filter button { background:none; border:none; color:var(--nb-primary); cursor:pointer; padding:0; line-height:1; }
    .prov-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:16px; }
    .pc { cursor:pointer; }
    .pc-hdr { height:80px; position:relative; display:flex; align-items:flex-end; padding:12px; border-radius:var(--radius-lg) var(--radius-lg) 0 0; }
    .pc-av { width:52px; height:52px; background:rgba(255,255,255,.25); border:3px solid rgba(255,255,255,.8); border-radius:14px; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:1.4rem; color:#fff; }
    .online-pill { position:absolute; top:10px; right:10px; background:rgba(255,255,255,.9); color:var(--nb-primary); border-radius:20px; padding:3px 10px; font-size:.7rem; font-weight:600; font-family:var(--font-display); }
    .pc-body { padding:14px 16px 16px; }
    .pc-name { font-family:var(--font-display); font-size:.95rem; font-weight:700; margin:0; }
    .pc-sub { font-size:.78rem; color:var(--nb-text-muted); margin:4px 0; }
    .pc-loc { font-size:.76rem; color:var(--nb-text-muted); margin:0 0 6px; display:flex; align-items:center; gap:4px; }
    .pc-loc i { color:var(--nb-primary); }
    .fdistrict { display:flex; align-items:center; gap:6px; background:var(--nb-bg); border:1.5px solid var(--nb-border); border-radius:var(--radius-md); padding:6px 12px; }
    .fdistrict i { color:var(--nb-primary); font-size:.85rem; }
    .fdistrict select { border:none; outline:none; background:transparent; font-family:var(--font-display); font-size:.8rem; font-weight:600; color:var(--nb-text); cursor:pointer; }
    .dnote { font-size:.75rem; color:var(--nb-text-muted); margin:10px 0 0; }
    .pc-rating { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:6px; }
    .pc-bio { font-size:.8rem; color:var(--nb-text-muted); margin-bottom:12px; line-height:1.5; }
    .pc-footer { display:flex; justify-content:space-between; align-items:center; }
    .pf-from { display:block; font-size:.65rem; color:var(--nb-text-muted); text-transform:uppercase; letter-spacing:.05em; }
    .pf-price { font-family:var(--font-display); font-size:1.1rem; font-weight:800; color:var(--nb-primary); }
    .empty-state { text-align:center; padding:4rem 1rem; color:var(--nb-text-muted); }
    .empty-state i { font-size:3rem; display:block; margin-bottom:1rem; }
    .empty-state h5 { font-family:var(--font-display); color:var(--nb-text); }
    .pagination-row { display:flex; gap:6px; justify-content:center; margin-top:2rem; }
    .pg-btn { width:36px; height:36px; border-radius:var(--radius-sm); border:1.5px solid var(--nb-border); background:#fff; cursor:pointer; font-family:var(--font-display); font-size:.85rem; font-weight:600; transition:all .15s; }
    .pg-btn.active { background:var(--nb-primary); border-color:var(--nb-primary); color:#fff; }
    .pg-btn:disabled { opacity:.4; cursor:not-allowed; }
  `]
})
export class BrowseComponent implements OnInit {
  providers  = signal<Provider[]>([]);
  loading    = signal(true);
  total      = signal(0);
  page       = signal(1);
  cat        = signal('all');
  minRating  = signal(0);
  onlineOnly = false;
  sort       = 'rating';
  q          = '';
  mobileCat  = 'all';
  district   = signal('');
  districts  = DISTRICTS;
  private searchTimer: any;

  totalPages  = computed(() => Math.ceil(this.total() / 12));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1).slice(0, 7));

  cats = [
    { id:'all',           label:'All',           icon:'bi-grid-3x3-gap' },
    { id:'home_services', label:'Home Services',  icon:'bi-tools' },
    { id:'education',     label:'Education',      icon:'bi-mortarboard' },
    { id:'food',          label:'Food',           icon:'bi-basket2' },
    { id:'wellness',      label:'Wellness',       icon:'bi-heart-pulse' },
    { id:'events',        label:'Events',         icon:'bi-camera' },
  ];

  constructor(private api: ApiService, private route: ActivatedRoute, private auth: AuthService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['category']) { this.cat.set(p['category']); this.mobileCat = p['category']; }
      if (p['q'])         this.q = p['q'];
      this.initDistrictThenLoad(p['district']);
    });
  }

  // Default the district filter to the logged-in user's district.
  // The cached user may lack location, so fall back to fetching the profile.
  private initDistrictThenLoad(qpDistrict?: string) {
    if (qpDistrict) { this.district.set(qpDistrict); this.load(); return; }
    const cached = this.auth.currentUser()?.location?.district;
    if (cached) { this.district.set(cached); this.load(); return; }
    if (this.auth.isLoggedIn()) {
      this.auth.loadProfile().subscribe({
        next: res => { this.district.set(res.data?.location?.district ?? ''); this.load(); },
        error: () => this.load(),
      });
    } else {
      this.load();
    }
  }

  onDistrictChange() { this.page.set(1); this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, any> = {
      page:   this.page(),
      limit:  12,
      sort:   this.sort,
    };
    if (this.cat() !== 'all') params['category']  = this.cat();
    if (this.minRating() > 0) params['rating']    = this.minRating();
    if (this.onlineOnly)      params['isOnline']  = true;
    if (this.q.trim())        params['search']    = this.q.trim();
    if (this.district())      params['district']  = this.district();

    this.api.get<PaginatedResponse<Provider>>('/providers', params).subscribe({
      next: res => {
        this.providers.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  setCat(id: string)    { this.cat.set(id); this.mobileCat = id; this.page.set(1); this.load(); }
  setRating(r: number)  { this.minRating.set(r); this.page.set(1); this.load(); }
  changePage(n: number) { this.page.set(n); this.load(); window.scrollTo(0, 0); }

  clearAll() {
    this.q = ''; this.cat.set('all'); this.mobileCat = 'all';
    this.minRating.set(0); this.onlineOnly = false; this.sort = 'rating';
    this.district.set(this.auth.currentUser()?.location?.district ?? '');
    this.page.set(1); this.load();
  }

  catLabel(id: string) { return this.cats.find(c => c.id === id)?.label ?? id; }
  catColor(id: string) {
    const m: Record<string,string> = { home_services:'#2563A8', education:'#059669', food:'#D97706', wellness:'#7C3AED', events:'#DC2626' };
    return m[id] ?? '#1A3C5E';
  }
}
