// src/app/features/provider/provider-profile.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Provider, ApiResponse } from '../../core/services/api.service';
import { ChatService }    from '../../core/services/chat.service';
import { AuthService }    from '../../core/auth/auth.service';

interface Review { id:string; name:string; initial:string; color:string; rating:number; text:string; date:string; tags:string[]; images:string[]; }

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="nb-spinner-wrap"><div class="nb-spinner"></div></div>
    } @else if (!provider()) {
      <div class="container py-5 text-center">
        <p class="text-muted-nb">Provider not found.</p>
        <a routerLink="/browse" class="btn-nb-outline btn mt-2">Back to Browse</a>
      </div>
    } @else {
      <div style="min-height:80vh">

        <!-- HERO -->
        <div class="pp-hero" [style.background]="hcolor()">
          <div class="container">
            <div class="d-flex flex-column flex-md-row align-items-md-end gap-4 pb-4">
              <div class="pp-av-wrap">
                <div class="pp-av">{{ provider()!.businessName.charAt(0) }}</div>
                @if (provider()!.isVerified) {
                  <div class="pp-vbadge" title="Verified"><i class="bi bi-patch-check-fill"></i></div>
                }
              </div>
              <div class="pp-info">
                <h1 class="pp-name" data-testid="provider-name">{{ provider()!.businessName }}</h1>
                <p class="pp-tagline">{{ provider()!.tagline }}</p>
                <div class="d-flex flex-wrap gap-2">
                  <span class="nb-badge" style="background:rgba(255,255,255,.2);color:#fff">
                    <i class="bi bi-geo-alt-fill"></i>{{ providerLocation() }}
                  </span>
                  <span class="nb-badge" style="background:rgba(255,255,255,.2);color:#fff">
                    {{ provider()!.subCategory }}
                  </span>
                  @if (provider()!.isOnline) {
                    <span class="nb-badge" style="background:rgba(255,255,255,.9);color:var(--nb-primary)">
                      <i class="bi bi-camera-video-fill"></i>Online Available
                    </span>
                  }
                </div>
              </div>
              <div class="ms-md-auto text-md-end">
                <div class="pp-rating">
                  <span class="pp-rat-num">{{ provider()!.ratingAvg }}</span>
                  <span class="star-filled" style="font-size:1.2rem">★</span>
                  <span style="color:rgba(255,255,255,.7);font-size:.85rem">({{ provider()!.ratingCount }})</span>
                </div>
                <div style="color:rgba(255,255,255,.7);font-size:.875rem;margin-top:4px">
                  <i class="bi bi-calendar-check me-1"></i>{{ provider()!.totalBookings }} bookings
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTION BAR -->
        <div class="abar">
          <div class="container d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="d-flex gap-3 align-items-center">
              <span class="fw-display" style="font-weight:700;font-size:1.1rem">
                {{ priceLabel() }}
                <span style="font-weight:400;font-size:.8rem;color:var(--nb-text-muted)"> onwards</span>
              </span>
              <span class="text-muted-nb" style="font-size:.875rem">· {{ provider()!.experience }} yrs exp</span>
            </div>
            <div class="d-flex gap-2">
              @if (canBook()) {
                <button class="btn-nb-outline btn btn-sm" (click)="messageProvider()">
                  <i class="bi bi-chat-dots me-1"></i>Message
                </button>
                <button class="btn-nb-primary btn btn-sm" (click)="bookNow()" data-testid="book-now-btn">
                  <i class="bi bi-calendar-plus me-1"></i>Book Now
                </button>
              }
            </div>
          </div>
        </div>

        <div class="container py-4">
          <div class="row g-4">

            <!-- MAIN -->
            <div class="col-lg-8">
              <div class="pp-tabs">
                @for (t of tabs; track t.id) {
                  <button class="pp-tab" [class.active]="tab()===t.id" (click)="tab.set(t.id)">{{ t.label }}</button>
                }
              </div>

              @if (tab()==='about') {
                <div class="tab-panel">
                  <h5 class="tp-title">About</h5>
                  <p class="tp-text">{{ provider()!.bio }}</p>

                  @if (provider()!.images?.length) {
                    <h5 class="tp-title mt-4">Work Gallery</h5>
                    <div class="work-grid">
                      @for (img of provider()!.images; track $index) {
                        <img class="work-img" [src]="img" alt="work sample" (click)="lightbox.set(img)" />
                      }
                    </div>
                  }

                  <h5 class="tp-title mt-4">Skills</h5>
                  <div class="skills-wrap">
                    @for (sk of provider()!.skills; track sk) {
                      <span class="skill-chip"><i class="bi bi-check-circle-fill"></i>{{ sk }}</span>
                    }
                  </div>

                  <h5 class="tp-title mt-4">Weekly Availability</h5>
                  <div class="avail-days">
                    @for (d of allDays; track d) {
                      <div class="aday" [class.on]="isDayOn(d)">{{ d }}</div>
                    }
                  </div>
                  <p class="text-muted-nb mt-2" style="font-size:.875rem">
                    <i class="bi bi-clock me-1"></i>{{ provider()!.availability?.startTime || '09:00' }} — {{ provider()!.availability?.endTime || '18:00' }}
                  </p>
                </div>
              }

              @if (tab()==='reviews') {
                <div class="tab-panel">
                  <div class="rating-sum">
                    <div class="rs-big">{{ provider()!.ratingAvg }}</div>
                    <div>
                      <div style="font-size:1.1rem;letter-spacing:2px">
                        @for (s of starsArr(provider()!.ratingAvg); track s) {
                          <span class="star-filled">★</span>
                        }
                      </div>
                      <p style="font-size:.8rem;color:var(--nb-text-muted);margin:0">{{ provider()!.ratingCount }} reviews</p>
                    </div>
                  </div>
                  <div class="revs-list">
                    @if (reviews().length === 0) {
                      <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                        No reviews yet. Be the first to book and review!
                      </p>
                    }
                    @for (r of reviews(); track r.id) {
                      <div class="rev-card" data-testid="review-card">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <div class="d-flex gap-2 align-items-center">
                            <div class="rev-av" [style.background]="r.color">{{ r.initial }}</div>
                            <div>
                              <p class="rev-name">{{ r.name }}</p>
                              <p class="rev-date">{{ r.date }}</p>
                            </div>
                          </div>
                          <span class="star-filled" style="font-size:.9rem">
                            @for (s of starsArr(r.rating); track s) { ★ }
                          </span>
                        </div>
                        @if (r.text) { <p class="rev-text">{{ r.text }}</p> }
                        @if (r.images?.length) {
                          <div class="rev-photos">
                            @for (img of r.images; track $index) {
                              <img [src]="img" alt="review photo" (click)="lightbox.set(img)" />
                            }
                          </div>
                        }
                        <div class="rev-tags">
                          @for (tg of r.tags; track tg) { <span class="rev-tag">{{ tg }}</span> }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- BOOKING SIDEBAR -->
            <div class="col-lg-4">
              @if (!canBook()) {
                <div class="bk-sidebar nb-card p-3 text-center">
                  <i class="bi bi-info-circle text-muted-nb" style="font-size:1.5rem"></i>
                  <p class="text-muted-nb mt-2 mb-0" style="font-size:.875rem">
                    Only customer accounts can book a service. Sign in as a customer to continue.
                  </p>
                </div>
              } @else {
              <div class="bk-sidebar nb-card p-3">
                <h6 class="fw-display mb-3">Quick Book</h6>
                <label class="nb-label">Date</label>
                <input type="date" class="nb-input mb-3" [(ngModel)]="bkDate" [min]="today" />
                <label class="nb-label">Time</label>
                <select class="nb-input mb-3" [(ngModel)]="bkTime">
                  @for (t of timeSlots; track t) { <option [value]="t">{{ t }}</option> }
                </select>
                <label class="nb-label">Type</label>
                <div class="type-toggle mb-3">
                  <button [class.active]="bkType==='in_person'" (click)="bkType='in_person'">
                    <i class="bi bi-house-door"></i> In-Person
                  </button>
                  @if (provider()!.isOnline) {
                    <button [class.active]="bkType==='remote'" (click)="bkType='remote'">
                      <i class="bi bi-camera-video"></i> Online
                    </button>
                  }
                </div>
                <button class="btn-nb-primary btn w-100 mb-2" (click)="bookNow()" data-testid="book-now-btn">
                  <i class="bi bi-calendar-check me-2"></i>Confirm Booking
                </button>
                <hr class="divider">
                <div class="bk-stats">
                  <div class="bks"><span class="bks-i"><i class="bi bi-shield-check"></i></span><span>Identity Verified</span></div>
                  <div class="bks"><span class="bks-i"><i class="bi bi-star-fill"></i></span><span>{{ provider()!.ratingAvg }}★ avg rating</span></div>
                  <div class="bks"><span class="bks-i"><i class="bi bi-calendar2-check"></i></span><span>{{ provider()!.totalBookings }}+ jobs done</span></div>
                </div>
              </div>
              }
            </div>

          </div>
        </div>
      </div>
    }

    @if (lightbox()) {
      <div class="lightbox" (click)="lightbox.set(null)">
        <img [src]="lightbox()" alt="work sample" />
      </div>
    }
  `,
  styles: [`
    .pp-hero { padding:2.5rem 0 0; color:#fff; }
    .pp-av-wrap { position:relative; flex-shrink:0; }
    .pp-av { width:90px;height:90px;background:rgba(255,255,255,.2);border:3px solid rgba(255,255,255,.6);border-radius:22px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:2.5rem;font-weight:800;color:#fff; }
    .pp-vbadge { position:absolute;bottom:-6px;right:-6px;background:#fff;color:var(--nb-primary);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:.9rem;box-shadow:var(--shadow-sm); }
    .pp-name { font-size:clamp(1.4rem,3vw,2rem);font-weight:800;margin:0 0 .25rem; }
    .pp-tagline { color:rgba(255,255,255,.7);margin-bottom:.75rem; }
    .pp-rating { display:flex;align-items:center;gap:6px; }
    .pp-rat-num { font-family:var(--font-display);font-size:1.75rem;font-weight:800;color:#fff; }
    .abar { background:#fff;border-bottom:1px solid var(--nb-border);padding:12px 0;position:sticky;top:64px;z-index:90;box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .pp-tabs { display:flex;gap:4px;border-bottom:2px solid var(--nb-border);margin-bottom:1.5rem; }
    .pp-tab { background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-2px;padding:10px 20px;font-family:var(--font-display);font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--nb-text-muted);cursor:pointer;transition:all .2s; }
    .pp-tab.active { color:var(--nb-primary);border-bottom-color:var(--nb-primary); }
    .tab-panel { background:#fff;border-radius:var(--radius-lg);padding:1.5rem;border:1px solid var(--nb-border); }
    .tp-title { font-size:1rem;font-weight:700;margin-bottom:.75rem; }
    .tp-text { color:var(--nb-text-muted);line-height:1.7; }
    .skills-wrap { display:flex;flex-wrap:wrap;gap:8px; }
    .skill-chip { display:inline-flex;align-items:center;gap:5px;background:#EFF6FF;color:var(--nb-primary);border-radius:var(--radius-sm);padding:5px 12px;font-size:.8rem;font-family:var(--font-display);font-weight:600; }
    .skill-chip i { font-size:.7rem; }
    .work-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px; }
    .work-img { width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--nb-border);cursor:pointer;transition:transform .12s; }
    .work-img:hover { transform:scale(1.03); }
    .lightbox { position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:2rem;cursor:zoom-out; }
    .lightbox img { max-width:92vw;max-height:92vh;border-radius:var(--radius-md); }
    .avail-days { display:flex;gap:6px;flex-wrap:wrap; }
    .aday { width:38px;height:38px;border-radius:var(--radius-sm);background:var(--nb-surface-2);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;font-family:var(--font-display);color:var(--nb-text-muted); }
    .aday.on { background:var(--nb-primary);color:#fff; }
    .rating-sum { display:flex;align-items:center;gap:20px;background:var(--nb-surface-2);border-radius:var(--radius-md);padding:1.25rem;margin-bottom:1.5rem; }
    .rs-big { font-family:var(--font-display);font-size:3rem;font-weight:800;color:var(--nb-primary);line-height:1; }
    .revs-list { display:flex;flex-direction:column;gap:12px; }
    .rev-card { background:#fff;border:1px solid var(--nb-border);border-radius:var(--radius-md);padding:1rem; }
    .rev-av { width:36px;height:36px;min-width:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;color:#fff; }
    .rev-name { font-family:var(--font-display);font-size:.875rem;font-weight:700;margin:0; }
    .rev-date { font-size:.72rem;color:var(--nb-text-muted);margin:0; }
    .rev-text { font-size:.875rem;color:var(--nb-text-muted);margin:0 0 8px;line-height:1.6; }
    .rev-photos { display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px; }
    .rev-photos img { width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--nb-border);cursor:pointer;transition:transform .12s; }
    .rev-photos img:hover { transform:scale(1.05); }
    .rev-tags { display:flex;flex-wrap:wrap;gap:5px; }
    .rev-tag { background:var(--nb-surface-2);color:var(--nb-text-muted);border-radius:20px;padding:2px 10px;font-size:.72rem;font-family:var(--font-display);font-weight:600; }
    .bk-sidebar { position:sticky;top:130px; }
    .type-toggle { display:flex;gap:6px; }
    .type-toggle button { flex:1;padding:8px;border-radius:var(--radius-sm);border:1.5px solid var(--nb-border);background:var(--nb-bg);font-family:var(--font-display);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s; }
    .type-toggle button.active { background:var(--nb-primary);border-color:var(--nb-primary);color:#fff; }
    .bk-stats { display:flex;flex-direction:column;gap:10px; }
    .bks { display:flex;align-items:center;gap:10px;font-size:.85rem; }
    .bks-i { width:30px;height:30px;background:#EFF6FF;color:var(--nb-primary);border-radius:8px;display:flex;align-items:center;justify-content:center; }
  `]
})
export class ProviderProfileComponent implements OnInit {
  provider = signal<Provider | null>(null);
  loading  = signal(true);
  tab      = signal('about');
  bkDate   = '';
  bkTime   = '10:00';
  bkType   = 'in_person';
  today    = new Date().toISOString().split('T')[0];
  timeSlots = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'];
  allDays   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  tabs = [{ id:'about', label:'About' }, { id:'reviews', label:'Reviews' }];

  // Only guests (who will be asked to log in) and customers may book.
  // Providers and admins never see booking controls.
  canBook = computed(() => {
    const role = this.auth.userRole();
    return role === null || role === 'customer';
  });

  reviews = signal<Review[]>([]);
  lightbox = signal<string | null>(null);
  private revColors = ['#2563A8','#059669','#D97706','#7C3AED','#DC2626'];

  priceLabel() {
    const p = this.provider();
    if (!p) return '';
    return p.priceMax && p.priceMax > p.price ? `₹${p.price} – ₹${p.priceMax}` : `₹${p.price}`;
  }

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private api:    ApiService,
    private chat:   ChatService,
    private auth:   AuthService,
  ) {}

  messageProvider() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    const id = this.provider()?._id;
    if (!id) return;
    this.chat.open({ providerId: id }).subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
    });
  }

  ngOnInit() {
    this.bkDate = this.today;
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.get<ApiResponse<Provider>>(`/providers/${id}`).subscribe({
      next: res => { this.provider.set(res.data); this.loading.set(false); },
      error: ()  => { this.loading.set(false); },
    });
    this.loadReviews(id);
  }

  // Public — anyone (even logged-out) can read a provider's reviews
  loadReviews(providerId: string) {
    this.api.get<ApiResponse<any[]>>(`/reviews/provider/${providerId}`).subscribe({
      next: res => {
        const mapped = (res.data ?? []).map((r, i): Review => {
          const name = r.customerId?.name ?? 'Customer';
          return {
            id:      r._id,
            name,
            initial: name.charAt(0).toUpperCase(),
            color:   this.revColors[i % this.revColors.length],
            rating:  r.rating,
            text:    r.review ?? '',
            date:    new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            tags:    r.tags ?? [],
            images:  r.images ?? [],
          };
        });
        this.reviews.set(mapped);
      },
    });
  }

  hcolor() {
    const m: Record<string,string> = { home_services:'#1e4d8c', education:'#065f46', food:'#92400e', wellness:'#5b21b6', events:'#991b1b' };
    return m[this.provider()?.category ?? ''] ?? '#1A3C5E';
  }

  providerLocation() {
    const loc = this.provider()?.userId?.location;
    const parts = [loc?.area, loc?.district].filter(Boolean);
    return parts.length ? parts.join(', ') : (loc?.city ?? 'Chennai');
  }

  isDayOn(d: string) {
    return this.provider()?.availability?.days?.includes(d) ?? false;
  }

  starsArr(n: number) { return Array(Math.round(n)).fill(0); }

  bookNow() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    if (!this.canBook()) { this.router.navigate(['/']); return; }   // admins/providers can't book
    this.router.navigate(['/booking/new'], {
      queryParams: { providerId: this.provider()?._id, date: this.bkDate, time: this.bkTime, type: this.bkType },
    });
  }
}
