// src/app/features/provider/provider-profile.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Provider, ApiResponse } from '../../core/services/api.service';
import { CategoryService } from '../../core/services/category.service';
import { ChatService }    from '../../core/services/chat.service';
import { AuthService }    from '../../core/auth/auth.service';
import { ToastService }   from '../../core/services/toast.service';
import { ContactLoginModalComponent } from '../../shared/components/contact-login-modal.component';
import { PROVIDER_HIGHLIGHTS } from '../../core/constants';

interface Review { id:string; name:string; initial:string; color:string; rating:number; text:string; date:string; tags:string[]; images:string[]; }

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ContactLoginModalComponent],
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

        <!-- ── GALLERY ─────────────────────────────────── -->
        <div class="pp-gallery" [class.pp-gallery--single]="galleryImages().length <= 1">
          @if (galleryImages().length) {
            <div class="pp-gallery-main" (click)="lightbox.set(galleryImages()[0])">
              <img [src]="galleryImages()[0]" class="pp-gal-img" alt="cover photo" />
            </div>
          } @else {
            <div class="pp-gallery-main">
              <div class="pp-gal-placeholder" [style.background]="hcolor()">
                {{ provider()!.businessName.charAt(0) }}
              </div>
            </div>
          }
          @if (galleryImages().length > 1) {
            <div class="pp-gallery-grid">
              @for (img of galleryImages().slice(1, 5); track $index) {
                <div class="pp-gallery-cell" (click)="lightbox.set(img)">
                  <img [src]="img" class="pp-gal-img" alt="gallery photo" />
                  @if ($index === 3 && galleryImages().length > 5) {
                    <div class="pp-gallery-more">
                      <span>+{{ galleryImages().length - 5 }}</span>
                      <small>More</small>
                    </div>
                  }
                </div>
              }
            </div>
          }
          @if (isOwner()) {
            <!-- Add More Photo tile for the owner (11.19) -->
            <a class="pp-add-photo" routerLink="/provider/services" title="Add more photos">
              <i class="bi bi-camera-fill"></i><span>Add More Photo</span>
            </a>
          }
        </div>

        <!-- ── SUSPENDED BANNER (5.9) ──────────────────── -->
        @if (provider()!.status === 'suspended') {
          <div class="susp-banner">
            <div class="container d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-octagon-fill"></i>
              <div>
                <strong>This provider has been Reported / Suspended.</strong>
                <span class="d-block d-sm-inline">
                  @if (provider()!.banReason) { Reason: {{ provider()!.banReason }}. }
                  Contact options are disabled for your safety.
                </span>
              </div>
            </div>
          </div>
        }

        <!-- ── MAIN CONTENT ────────────────────────────── -->
        <div class="container py-4">
          <div class="row g-4">

            <!-- LEFT: Info + Tabs -->
            <div class="col-lg-8">

              <!-- Breadcrumb (11.20 / 11.26) -->
              <nav class="pp-crumb">
                <a routerLink="/browse">{{ providerCity() }}</a>
                <i class="bi bi-chevron-right"></i>
                <a [routerLink]="['/browse']" [queryParams]="{ category: provider()!.category }">{{ categoryLabel() }}</a>
                @if (provider()!.subCategory) {
                  <i class="bi bi-chevron-right"></i>
                  <a [routerLink]="['/browse']" [queryParams]="{ category: provider()!.category, q: provider()!.subCategory }">{{ provider()!.subCategory }}</a>
                }
                <i class="bi bi-chevron-right"></i>
                <span class="pp-crumb-cur">{{ provider()!.businessName }}</span>
              </nav>

              <!-- Info card -->
              <div class="pp-info-block">

                <!-- Name + bookmark -->
                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <h1 class="pp-name-new">
                    <span class="pp-name-icon" [style.background]="hcolor()">
                      {{ provider()!.businessName.charAt(0) }}
                    </span>
                    {{ provider()!.businessName }}
                  </h1>
                  <div class="d-flex gap-1">
                    @if (isOwner()) {
                      <a class="btn-pp-icon" routerLink="/provider/services" title="Edit profile"><i class="bi bi-pencil"></i></a>
                    }
                    <button class="btn-pp-icon" [class.btn-pp-icon--on]="isSaved()"
                            [title]="isSaved() ? 'Saved — click to remove' : 'Save to your list'"
                            [disabled]="savingBookmark()" (click)="toggleSave()">
                      <i class="bi" [class.bi-bookmark-fill]="isSaved()" [class.bi-bookmark]="!isSaved()"></i>
                    </button>
                  </div>
                </div>

                <!-- Rating + badges row (11.21) -->
                <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span class="nb-rating-badge">
                    {{ provider()!.ratingAvg }} <i class="bi bi-star-fill"></i>
                  </span>
                  <span class="pp-rating-count">{{ provider()!.ratingCount }} Ratings</span>
                  @if (provider()!.isVerified) {
                    <span class="pp-badge pp-badge-verified"><i class="bi bi-patch-check-fill"></i>Verified</span>
                  }
                  @for (h of (provider()!.highlights || []); track h) {
                    @if (highlightMeta(h); as hm) {
                      <span class="pp-badge pp-badge-hl"><i class="bi" [ngClass]="hm.icon"></i>{{ hm.label }}</span>
                    }
                  }
                </div>

                <!-- Meta: location · open now · experience · price (11.22) -->
                <div class="pp-meta-row mb-2">
                  <i class="bi bi-geo-alt"></i>
                  <span>{{ providerLocation() }}</span>
                  <span class="pp-meta-dot">•</span>
                  <span class="pp-open" [class.closed]="!isOpenNow()">
                    <i class="bi bi-clock-fill"></i>{{ isOpenNow() ? 'Open Now' : 'Closed' }}
                  </span>
                  <span class="pp-meta-dot">•</span>
                  <span>{{ provider()!.experience }} Yrs in Business</span>
                  <span class="pp-meta-dot">•</span>
                  <span>{{ priceLabel() }} onwards</span>
                </div>

                <!-- Keyword tag chips (11.23) -->
                @if (provider()!.skills.length) {
                  <div class="pp-keywords mb-2">
                    @for (s of provider()!.skills.slice(0, 6); track s) {
                      <span class="pp-kw">{{ s }}</span>
                    }
                  </div>
                }

                <!-- Category / service tags -->
                <div class="d-flex flex-wrap gap-2 mb-3">
                  @if (categoryLabel()) {
                    <span class="pp-cat-tag">
                      <i class="bi bi-grid-3x3-gap"></i>{{ categoryLabel() }}
                    </span>
                  }
                  @if (provider()!.subCategory) {
                    <span class="pp-cat-tag">
                      <i class="bi bi-tools"></i>{{ provider()!.subCategory }}
                    </span>
                  }
                  @if (provider()!.isOnline) {
                    <span class="pp-cat-tag pp-cat-online">
                      <i class="bi bi-camera-video-fill"></i>Online Available
                    </span>
                  }
                </div>

                <!-- Action buttons -->
                <div class="pp-actions">
                  @if (providerPhone() && provider()!.status !== 'suspended') {
                    @if (contactRevealed()) {
                      <!-- Revealed: explicit tel: link — only dials when the user taps it -->
                      <a class="btn-pp-call" [href]="'tel:' + providerPhone()">
                        <i class="bi bi-telephone-fill"></i>
                        {{ provider()!.userId?.phone }}
                      </a>
                    } @else {
                      <button class="btn-pp-call" (click)="requestContact('call')">
                        <i class="bi bi-telephone-fill"></i>
                        {{ maskedPhone() }}
                      </button>
                    }
                  }
                  @if (provider()!.status !== 'suspended') {
                    <button class="btn-pp-enquire" (click)="messageProvider()">
                      <i class="bi bi-chat-dots-fill"></i> Enquire Now
                    </button>
                  }
                  @if (providerPhone() && provider()!.status !== 'suspended') {
                    <button class="btn-pp-whatsapp" (click)="requestContact('whatsapp')">
                      <i class="bi bi-whatsapp"></i> WhatsApp
                    </button>
                  }
                  <button class="btn-pp-icon" (click)="share()" title="Share">
                    <i class="bi bi-share"></i>
                  </button>
                  <a class="btn-pp-icon" [routerLink]="['/complaints/new']"
                     [queryParams]="reportParams()" title="Report this provider">
                    <i class="bi bi-flag"></i>
                  </a>
                </div>
                @if (!contactRevealed() && providerPhone()) {
                  <p class="pp-reveal-hint">
                    <i class="bi bi-lock-fill"></i>
                    Number hidden — verify your mobile to reveal & contact.
                  </p>
                }
              </div>

              <!-- Tabs -->
              <div class="pp-tabs">
                @for (t of tabs; track t.id) {
                  <button class="pp-tab" [class.active]="tab()===t.id"
                          (click)="tab.set(t.id)">{{ t.label }}</button>
                }
              </div>

              @if (tab()==='about') {
                <div class="tab-panel">
                  <h5 class="tp-title">About</h5>
                  <p class="tp-text">{{ provider()!.bio }}</p>

                  @if (provider()!.images.length) {
                    <h5 class="tp-title mt-4">Work Gallery</h5>
                    <div class="work-grid">
                      @for (img of provider()!.images; track $index) {
                        <img class="work-img" [src]="img" alt="work sample"
                             (click)="lightbox.set(img)" />
                      }
                    </div>
                  }

                  <h5 class="tp-title mt-4">Skills</h5>
                  <div class="skills-wrap">
                    @for (sk of provider()!.skills; track sk) {
                      <span class="skill-chip">
                        <i class="bi bi-check-circle-fill"></i>{{ sk }}
                      </span>
                    }
                  </div>

                  <h5 class="tp-title mt-4">Weekly Availability</h5>
                  <div class="avail-days">
                    @for (d of allDays; track d) {
                      <div class="aday" [class.on]="isDayOn(d)">{{ d }}</div>
                    }
                  </div>
                  <p class="text-muted-nb mt-2" style="font-size:.875rem">
                    <i class="bi bi-clock me-1"></i>
                    {{ provider()!.availability.startTime || '09:00' }} —
                    {{ provider()!.availability.endTime   || '18:00' }}
                  </p>

                  @if (providerLocation()) {
                    <h5 class="tp-title mt-4">Location</h5>
                    <div class="location-card">
                      <div class="location-header">
                        <i class="bi bi-geo-alt-fill"></i>
                        <div>
                          <p class="location-name">{{ provider()!.businessName }}</p>
                          <p class="location-address">{{ providerLocation() }}</p>
                        </div>
                      </div>
                      <a [href]="googleMapsUrl()" target="_blank" rel="noopener noreferrer"
                         class="btn-location-map">
                        <i class="bi bi-map"></i> View on Google Maps
                      </a>
                    </div>
                  }
                </div>
              }

              @if (tab()==='services') {
                <div class="tab-panel">
                  <h5 class="tp-title mb-3">Services & Pricing</h5>
                  <div class="services-list">
                    @if (provider()!.skills.length) {
                      @for (service of provider()!.skills; track service) {
                        <div class="service-item">
                          <div class="service-info">
                            <h6 class="service-name">
                              <i class="bi bi-check-circle-fill"></i>{{ service }}
                            </h6>
                          </div>
                          <div class="service-price">
                            <span class="price-label">From</span>
                            <span class="price-value">₹{{ provider()!.price }}</span>
                            @if ((provider()!.priceMax ?? 0) > provider()!.price) {
                              <span class="price-range">– ₹{{ provider()!.priceMax }}</span>
                            }
                          </div>
                        </div>
                      }
                    } @else {
                      <p class="text-muted-nb text-center py-3">No services listed yet.</p>
                    }
                  </div>
                  <div class="service-note">
                    <i class="bi bi-info-circle"></i>
                    <p>Pricing varies based on specific requirements. Contact provider for detailed quote.</p>
                  </div>
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
                      <p style="font-size:.8rem;color:var(--nb-text-muted);margin:0">
                        {{ provider()!.ratingCount }} reviews
                      </p>
                    </div>
                  </div>
                  <div class="revs-list">
                    @if (reviews().length === 0) {
                      <p class="text-muted-nb text-center py-3" style="font-size:.875rem">
                        No reviews yet. Be the first to contact and review!
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
                        @if (r.images.length) {
                          <div class="rev-photos">
                            @for (img of r.images; track $index) {
                              <img [src]="img" alt="review photo" (click)="lightbox.set(img)" />
                            }
                          </div>
                        }
                        <div class="rev-tags">
                          @for (tg of r.tags; track tg) {
                            <span class="rev-tag">{{ tg }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- RIGHT: sidebar -->
            <div class="col-lg-4">

              <!-- Click to Rate (11.25) -->
              @if (provider()!.status !== 'suspended') {
                <div class="rate-card nb-card p-3 mb-3">
                  <h6 class="fw-display mb-1">Rate this provider</h6>
                  <p class="text-muted-nb mb-2" style="font-size:.8rem">Tap a star to rate instantly</p>
                  <div class="rate-stars" (mouseleave)="hoverStar.set(0)">
                    @for (s of [1,2,3,4,5]; track s) {
                      <button class="rate-star" [class.on]="(hoverStar() || myRating()) >= s"
                              (mouseenter)="hoverStar.set(s)" (click)="rateProvider(s)" [disabled]="rating()">★</button>
                    }
                  </div>
                  @if (myRating()) { <p class="rate-thanks"><i class="bi bi-check-circle-fill me-1"></i>You rated {{ myRating() }}★ — thanks!</p> }
                </div>
              }

              <!-- Contact sidebar -->
              <div class="bk-sidebar nb-card p-3">
                <h6 class="fw-display mb-3">Contact Provider</h6>
                <div class="bk-stats mb-3">
                  <div class="bks">
                    <span class="bks-i"><i class="bi bi-shield-check"></i></span>
                    <span>Identity Verified</span>
                  </div>
                  <div class="bks">
                    <span class="bks-i"><i class="bi bi-star-fill"></i></span>
                    <span>{{ provider()!.ratingAvg }}★ avg rating</span>
                  </div>
                  <div class="bks">
                    <span class="bks-i"><i class="bi bi-people-fill"></i></span>
                    <span>{{ provider()!.ratingCount }} reviews</span>
                  </div>
                </div>
                @if (provider()!.status !== 'suspended') {
                  <div class="d-flex flex-column gap-2">
                    @if (providerPhone()) {
                      @if (contactRevealed()) {
                        <a class="btn-nb-primary btn w-100" [href]="'tel:' + providerPhone()">
                          <i class="bi bi-telephone-fill me-2"></i>{{ provider()!.userId?.phone }}
                        </a>
                      } @else {
                        <button class="btn-nb-primary btn w-100" (click)="requestContact('call')">
                          <i class="bi bi-telephone-fill me-2"></i>Call Now
                        </button>
                      }
                      <button class="btn w-100" style="background:#fff;color:#1a7a4a;border:1.5px solid #1a7a4a;border-radius:8px;padding:9px;font-weight:700;"
                              (click)="requestContact('whatsapp')">
                        <i class="bi bi-whatsapp me-2"></i>WhatsApp
                      </button>
                    }
                    <button class="btn-nb-outline btn w-100" (click)="messageProvider()">
                      <i class="bi bi-chat-dots-fill me-2"></i>Send Enquiry
                    </button>
                  </div>
                }
              </div>
            </div>

          </div>
        </div>
      </div>
    }

    @if (lightbox()) {
      <div class="lightbox" (click)="lightbox.set(null)">
        <img [src]="lightbox()" alt="full size" />
      </div>
    }

    @if (showContactModal()) {
      <app-contact-login-modal
        (verified)="onContactVerified()"
        (closed)="showContactModal.set(false)" />
    }
  `,
  styles: [`
    /* ── GALLERY ──────────────────────────────────────────────── */
    .pp-gallery {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 360px;
      gap: 3px;
      background: #111;
      overflow: hidden;
    }
    .pp-gallery--single { grid-template-columns: 1fr; }
    .pp-gallery-main,
    .pp-gallery-cell { overflow: hidden; position: relative; background: #ddd; cursor: pointer; }
    .pp-gallery-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 3px;
      height: 100%;
    }
    .pp-gal-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s; }
    .pp-gallery-main:hover .pp-gal-img,
    .pp-gallery-cell:hover .pp-gal-img { transform: scale(1.04); }
    .pp-gal-placeholder {
      display: flex; align-items: center; justify-content: center;
      height: 100%; font-size: 6rem; font-weight: 900;
      color: rgba(255,255,255,.25); font-family: var(--font-display);
    }
    .pp-gallery-more {
      position: absolute; inset: 0; background: rgba(0,0,0,.58);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #fff; pointer-events: none;
    }
    .pp-gallery-more span { font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .pp-gallery-more small { font-size: .85rem; opacity: .8; }
    @media (max-width: 767px) {
      .pp-gallery { grid-template-rows: 240px; grid-template-columns: 1fr; }
      .pp-gallery-grid { display: none; }
    }

    /* ── SUSPENDED BANNER ─────────────────────────────────────── */
    .susp-banner { background:#FEE2E2; color:#991b1b; border-bottom:1px solid #FECACA; padding:12px 0; font-size:.85rem; }
    .susp-banner i { font-size:1.3rem; flex-shrink:0; }

    /* ── 11D: breadcrumb, badges, open-now, keywords, rate, add-photo ── */
    .pp-crumb { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:.78rem; color:var(--nb-text-muted); margin-bottom:10px; }
    .pp-crumb a { color:var(--nb-primary); text-decoration:none; }
    .pp-crumb a:hover { text-decoration:underline; }
    .pp-crumb i { font-size:.6rem; }
    .pp-crumb-cur { color:var(--nb-text); font-weight:600; }
    .pp-badge { display:inline-flex; align-items:center; gap:3px; font-size:.66rem; font-weight:700; padding:3px 9px; border-radius:12px; text-transform:uppercase; letter-spacing:.03em; }
    .pp-badge-verified { background:#DBEAFE; color:#1e40af; }
    .pp-badge-hl { background:#ECFDF5; color:#065f46; }
    .pp-open { color:#1a7a4a; font-weight:700; display:inline-flex; align-items:center; gap:4px; }
    .pp-open.closed { color:var(--nb-danger); }
    .pp-keywords { display:flex; flex-wrap:wrap; gap:6px; }
    .pp-kw { background:var(--nb-surface-2); color:var(--nb-text-muted); border-radius:6px; padding:3px 10px; font-size:.74rem; font-weight:500; }
    .pp-add-photo { position:absolute; right:14px; bottom:14px; z-index:3; display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,.6); border:1px solid rgba(255,255,255,.5); color:#fff; text-decoration:none; font-size:.78rem; font-weight:600; cursor:pointer; padding:7px 14px; border-radius:20px; }
    .pp-add-photo:hover { background:rgba(0,0,0,.8); color:#fff; }
    .pp-add-photo i { font-size:1rem; }
    .rate-card { text-align:left; }
    .rate-stars { display:flex; gap:4px; }
    .rate-star { background:none; border:none; font-size:1.8rem; line-height:1; color:var(--nb-border); cursor:pointer; transition:color .12s, transform .12s; padding:0; }
    .rate-star.on { color:var(--nb-accent); }
    .rate-star:hover { transform:scale(1.15); }
    .rate-star:disabled { cursor:default; }
    .rate-thanks { font-size:.78rem; color:var(--nb-success); font-weight:600; margin:8px 0 0; }

    /* ── INFO CARD ────────────────────────────────────────────── */
    .pp-info-block {
      border: 1px solid var(--nb-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      background: #fff;
      margin-bottom: 1rem;
    }
    .pp-name-new {
      font-size: clamp(1.2rem, 2.5vw, 1.55rem);
      font-weight: 800;
      margin: 0;
      font-family: var(--font-display);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      line-height: 1.3;
    }
    .pp-name-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 9px;
      color: #fff; font-size: .95rem; font-weight: 800; flex-shrink: 0;
    }
    .nb-rating-badge {
      background: #1a7a4a; color: #fff; border-radius: 6px;
      padding: 3px 9px; font-weight: 700; font-size: .85rem;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .pp-rating-count { font-size: .875rem; color: var(--nb-text-muted); }
    .pp-verified-tag {
      color: #1565C0; font-size: .8rem; font-weight: 700;
      display: inline-flex; align-items: center; gap: 4px;
      font-family: var(--font-display);
    }
    .pp-meta-row {
      font-size: .875rem; color: var(--nb-text-muted);
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    }
    .pp-meta-dot { color: var(--nb-border); font-size: 1.2rem; }
    .pp-cat-tag {
      font-size: .78rem; font-weight: 600; font-family: var(--font-display);
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--nb-surface-2); color: var(--nb-text-muted);
      border-radius: 20px; padding: 4px 12px;
    }
    .pp-cat-online { color: var(--nb-primary); }

    /* ── ACTION BUTTONS ───────────────────────────────────────── */
    .pp-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pp-reveal-hint { display:flex; align-items:center; gap:6px; font-size:.75rem; color:var(--nb-text-muted); margin:.6rem 0 0; }
    .pp-reveal-hint i { color:var(--nb-warning); }

    .btn-pp-call {
      background: #1a7a4a; color: #fff !important;
      border: none; border-radius: 8px; padding: 9px 16px;
      font-weight: 700; font-size: .875rem;
      display: inline-flex; align-items: center; gap: 7px;
      text-decoration: none; cursor: pointer; transition: opacity .15s;
    }
    .btn-pp-call:hover { opacity: .88; }

    .btn-pp-enquire {
      background: #1565C0; color: #fff; border: none;
      border-radius: 8px; padding: 9px 16px; font-weight: 700;
      font-size: .875rem; display: inline-flex; align-items: center;
      gap: 7px; cursor: pointer; transition: opacity .15s;
    }
    .btn-pp-enquire:hover { opacity: .88; }

    .btn-pp-whatsapp {
      color: #1a7a4a !important; border: 1.5px solid #1a7a4a;
      border-radius: 8px; padding: 8px 16px; font-weight: 700;
      font-size: .875rem; background: #fff;
      display: inline-flex; align-items: center; gap: 7px;
      text-decoration: none; cursor: pointer; transition: background .15s, color .15s;
    }
    .btn-pp-whatsapp:hover { background: #1a7a4a; color: #fff !important; }

    .btn-pp-icon {
      background: #fff; border: 1.5px solid var(--nb-border);
      border-radius: 8px; padding: 8px 11px; font-size: .95rem;
      color: var(--nb-text-muted); cursor: pointer;
      display: inline-flex; align-items: center;
      transition: border-color .15s, color .15s;
    }
    .btn-pp-icon:hover { border-color: var(--nb-primary); color: var(--nb-primary); }
    .btn-pp-icon:disabled { opacity: .6; cursor: default; }
    .btn-pp-icon--on { border-color: var(--nb-primary); color: var(--nb-primary); background: #EFF6FF; }

    /* ── TABS ─────────────────────────────────────────────────── */
    .pp-tabs {
      display: flex; gap: 4px;
      border-bottom: 2px solid var(--nb-border); margin-bottom: 1.5rem;
    }
    .pp-tab {
      background: none; border: none;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      padding: 10px 20px; font-family: var(--font-display); font-size: .85rem;
      font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      color: var(--nb-text-muted); cursor: pointer; transition: all .2s;
    }
    .pp-tab.active { color: var(--nb-primary); border-bottom-color: var(--nb-primary); }

    /* ── TAB PANELS ───────────────────────────────────────────── */
    .tab-panel {
      background: #fff; border-radius: var(--radius-lg);
      padding: 1.5rem; border: 1px solid var(--nb-border);
    }
    .tp-title { font-size: 1rem; font-weight: 700; margin-bottom: .75rem; }
    .tp-text { color: var(--nb-text-muted); line-height: 1.7; }
    .skills-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-chip {
      display: inline-flex; align-items: center; gap: 5px;
      background: #EFF6FF; color: var(--nb-primary);
      border-radius: var(--radius-sm); padding: 5px 12px;
      font-size: .8rem; font-family: var(--font-display); font-weight: 600;
    }
    .skill-chip i { font-size: .7rem; }
    .work-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(110px,1fr)); gap: 10px; }
    .work-img {
      width: 100%; aspect-ratio: 1; object-fit: cover;
      border-radius: var(--radius-md); border: 1px solid var(--nb-border);
      cursor: pointer; transition: transform .12s;
    }
    .work-img:hover { transform: scale(1.03); }
    .avail-days { display: flex; gap: 6px; flex-wrap: wrap; }
    .aday {
      width: 38px; height: 38px; border-radius: var(--radius-sm);
      background: var(--nb-surface-2); display: flex; align-items: center;
      justify-content: center; font-size: .72rem; font-weight: 700;
      font-family: var(--font-display); color: var(--nb-text-muted);
    }
    .aday.on { background: var(--nb-primary); color: #fff; }
    .rating-sum {
      display: flex; align-items: center; gap: 20px;
      background: var(--nb-surface-2); border-radius: var(--radius-md);
      padding: 1.25rem; margin-bottom: 1.5rem;
    }
    .rs-big {
      font-family: var(--font-display); font-size: 3rem;
      font-weight: 800; color: var(--nb-primary); line-height: 1;
    }
    .revs-list { display: flex; flex-direction: column; gap: 12px; }
    .rev-card {
      background: #fff; border: 1px solid var(--nb-border);
      border-radius: var(--radius-md); padding: 1rem;
    }
    .rev-av {
      width: 36px; height: 36px; min-width: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-weight: 700; color: #fff;
    }
    .rev-name { font-family: var(--font-display); font-size: .875rem; font-weight: 700; margin: 0; }
    .rev-date { font-size: .72rem; color: var(--nb-text-muted); margin: 0; }
    .rev-text { font-size: .875rem; color: var(--nb-text-muted); margin: 0 0 8px; line-height: 1.6; }
    .rev-photos { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
    .rev-photos img {
      width: 64px; height: 64px; object-fit: cover;
      border-radius: 8px; border: 1px solid var(--nb-border);
      cursor: pointer; transition: transform .12s;
    }
    .rev-photos img:hover { transform: scale(1.05); }
    .rev-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .rev-tag {
      background: var(--nb-surface-2); color: var(--nb-text-muted);
      border-radius: 20px; padding: 2px 10px;
      font-size: .72rem; font-family: var(--font-display); font-weight: 600;
    }

    /* ── SERVICES ─────────────────────────────────────────────── */
    .services-list { display: flex; flex-direction: column; gap: 12px; }
    .service-item {
      background: #fff; border: 1px solid var(--nb-border);
      border-radius: var(--radius-md); padding: 1rem;
      display: flex; justify-content: space-between; align-items: center;
      transition: all .2s;
    }
    .service-item:hover { border-color: var(--nb-primary); box-shadow: var(--shadow-md); }
    .service-info { flex: 1; }
    .service-name {
      display: flex; align-items: center; gap: 8px;
      font-family: var(--font-display); font-size: .95rem;
      font-weight: 600; margin: 0; color: var(--nb-text);
    }
    .service-name i { color: var(--nb-success); font-size: .85rem; }
    .service-price {
      display: flex; align-items: baseline; gap: 8px; white-space: nowrap;
    }
    .price-label { font-size: .75rem; color: var(--nb-text-muted); font-weight: 500; }
    .price-value { font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: var(--nb-primary); }
    .price-range { font-size: .85rem; color: var(--nb-text-muted); }
    .service-note {
      background: #EFF6FF; border-left: 3px solid var(--nb-primary);
      border-radius: var(--radius-sm); padding: .75rem 1rem;
      display: flex; gap: 8px; font-size: .8rem; color: var(--nb-text-muted);
      margin-top: 1rem;
    }
    .service-note i { color: var(--nb-primary); font-size: 1rem; flex-shrink: 0; }
    .service-note p { margin: 0; }
    @media (max-width: 640px) {
      .service-item { flex-direction: column; align-items: flex-start; gap: 10px; }
      .service-price { flex-direction: column; gap: 4px; }
    }

    /* ── LOCATION ─────────────────────────────────────────────── */
    .location-card {
      background: #fff; border: 1px solid var(--nb-border);
      border-radius: var(--radius-md); padding: 1rem;
      transition: all .2s;
    }
    .location-card:hover { border-color: var(--nb-primary); box-shadow: var(--shadow-md); }
    .location-header {
      display: flex; gap: 12px; margin-bottom: 12px;
    }
    .location-header i {
      color: var(--nb-primary); font-size: 1.3rem; flex-shrink: 0; margin-top: 2px;
    }
    .location-name {
      font-family: var(--font-display); font-size: .95rem;
      font-weight: 700; margin: 0; color: var(--nb-text);
    }
    .location-address {
      font-size: .8rem; color: var(--nb-text-muted);
      margin: 4px 0 0; line-height: 1.4;
    }
    .btn-location-map {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--nb-primary); color: #fff !important;
      border: none; border-radius: var(--radius-sm); padding: 8px 16px;
      font-weight: 600; font-size: .85rem; text-decoration: none;
      cursor: pointer; transition: all .2s;
    }
    .btn-location-map:hover { background: var(--nb-primary-light); transform: translateY(-1px); box-shadow: var(--shadow-md); }

    /* ── SIDEBAR ──────────────────────────────────────────────── */
    .bk-sidebar { position: sticky; top: 80px; }
    .type-toggle { display: flex; gap: 6px; }
    .type-toggle button {
      flex: 1; padding: 8px; border-radius: var(--radius-sm);
      border: 1.5px solid var(--nb-border); background: var(--nb-bg);
      font-family: var(--font-display); font-size: .8rem;
      font-weight: 600; cursor: pointer; transition: all .2s;
    }
    .type-toggle button.active {
      background: var(--nb-primary); border-color: var(--nb-primary); color: #fff;
    }
    .bk-stats { display: flex; flex-direction: column; gap: 10px; }
    .bks { display: flex; align-items: center; gap: 10px; font-size: .85rem; }
    .bks-i {
      width: 30px; height: 30px; background: #EFF6FF; color: var(--nb-primary);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
    }

    /* ── LIGHTBOX ─────────────────────────────────────────────── */
    .lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,.85);
      z-index: 10000; display: flex; align-items: center;
      justify-content: center; padding: 2rem; cursor: zoom-out;
    }
    .lightbox img { max-width: 92vw; max-height: 92vh; border-radius: var(--radius-md); }
  `]
})
export class ProviderProfileComponent implements OnInit, OnDestroy {
  provider = signal<Provider | null>(null);
  loading  = signal(true);
  tab      = signal('about');
  allDays   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  tabs = [
    { id:'about', label:'About' },
    { id:'services', label:'Services' },
    { id:'reviews', label:'Reviews' }
  ];

  galleryImages = computed(() => this.provider()?.images ?? []);

  // E.164 formatted phone for tel: and wa.me links; empty string if no phone
  providerPhone = computed(() => {
    const raw    = this.provider()?.userId?.phone ?? '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10)                               return `+91${digits}`;
    if (digits.length === 11 && digits.startsWith('0'))     return `+91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91'))    return `+${digits}`;
    return digits ? `+${digits}` : '';
  });

  whatsappUrl = computed(() => {
    const e164 = this.providerPhone();
    return e164 ? `https://wa.me/${e164.replace('+', '')}` : '';
  });

  // Masked form shown to guests, e.g. "+91 98••• ••43"
  maskedPhone = computed(() => {
    const e164 = this.providerPhone();
    if (!e164) return '';
    const d = e164.replace(/\D/g, '').slice(-10);
    return `+91 ${d.slice(0, 2)}••• ••${d.slice(-2)}`;
  });

  // ── Contact-reveal flow (Firebase OTP) ───────────────────────
  contactRevealed  = signal(false);
  showContactModal = signal(false);
  private pendingChannel: 'call' | 'whatsapp' | null = null;
  private pendingEnquiry = false;

  // ── 11D extras ───────────────────────────────────────────────
  // Owner sees Edit / Add-photo affordances.
  isOwner = computed(() => {
    const uid = this.auth.currentUser()?._id;
    const ownerId = typeof this.provider()?.userId === 'string'
      ? this.provider()?.userId : this.provider()?.userId?._id;
    return !!uid && uid === ownerId;
  });

  providerCity = computed(() => this.provider()?.userId?.location?.city || 'Chennai');

  // Open Now (11.22) — within availability days + start/end window.
  isOpenNow = computed(() => {
    const a = this.provider()?.availability;
    if (!a) return false;
    const now = new Date();
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
    if (a.days?.length && !a.days.includes(day)) return false;
    const cur = now.getHours() * 60 + now.getMinutes();
    const toMin = (t?: string) => { const [h, m] = (t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const start = toMin(a.startTime || '09:00');
    const end   = toMin(a.endTime || '18:00');
    return cur >= start && cur <= end;
  });

  // Click-to-Rate (11.25)
  hoverStar = signal(0);
  myRating  = signal(0);
  rating    = signal(false);

  // Save / bookmark — customer adds this provider to their "Saved" list
  // (visible on the customer dashboard).
  isSaved       = signal(false);
  savingBookmark = signal(false);

  categoryLabel = computed(() => {
    const cat = this.provider()?.category ?? '';
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });

  // Look up a provider-chosen highlight's label + icon for badge rendering.
  highlightMeta(value: string) { return PROVIDER_HIGHLIGHTS.find(h => h.value === value); }

  reviews  = signal<Review[]>([]);
  lightbox = signal<string | null>(null);
  private revColors = ['#2563A8','#059669','#D97706','#7C3AED','#DC2626'];

  priceLabel() {
    const p = this.provider();
    if (!p) return '';
    return p.priceMax && p.priceMax > p.price
      ? `₹${p.price} – ₹${p.priceMax}`
      : `₹${p.price}`;
  }

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private api:    ApiService,
    private chat:   ChatService,
    private auth:   AuthService,
    private toast:  ToastService,
    private catSvc: CategoryService,
  ) { catSvc.load(); }

  messageProvider() {
    // Guests verify (login) via the popup, then the enquiry chat opens.
    if (!this.auth.isLoggedIn()) { this.pendingEnquiry = true; this.showContactModal.set(true); return; }
    const id = this.provider()?._id;
    if (!id) return;
    this.chat.open({ providerId: id }).subscribe({
      next: c => this.router.navigate(['/chat', c._id]),
    });
  }

  // Click-to-Rate (11.25) — direct rating, no booking required.
  rateProvider(stars: number) {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    if (this.auth.userRole() !== 'customer') { this.toast.error('Only customers can rate.'); return; }
    const id = this.provider()?._id;
    if (!id) return;
    this.rating.set(true);
    this.api.post<ApiResponse<any>>('/reviews/direct', { providerId: id, rating: stars }).subscribe({
      next: () => {
        this.rating.set(false);
        this.myRating.set(stars);
        this.toast.success(`Thanks for rating ${stars}★!`);
        // refresh provider rating + reviews
        this.api.get<ApiResponse<Provider>>(`/providers/${id}`).subscribe({ next: r => this.provider.set(r.data) });
        this.loadReviews(id);
      },
      error: (e: any) => { this.rating.set(false); this.toast.error(e?.error?.message ?? 'Could not submit rating.'); },
    });
  }

  // Save / unsave (bookmark) this provider. Customers only; guests are sent
  // to login. The saved list lives on the customer dashboard.
  toggleSave() {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    if (this.auth.userRole() !== 'customer') { this.toast.error('Only customers can save providers.'); return; }
    const id = this.provider()?._id;
    if (!id || this.savingBookmark()) return;

    const next = !this.isSaved();
    this.savingBookmark.set(true);
    this.isSaved.set(next);   // optimistic

    const req$ = next
      ? this.api.post<ApiResponse<any>>(`/providers/${id}/save`, {})
      : this.api.delete<ApiResponse<any>>(`/providers/${id}/save`);

    req$.subscribe({
      next: () => {
        this.savingBookmark.set(false);
        this.toast.success(next ? 'Saved to your list.' : 'Removed from saved.');
      },
      error: (e: any) => {
        this.savingBookmark.set(false);
        this.isSaved.set(!next);   // revert on failure
        this.toast.error(e?.error?.message ?? 'Could not update saved list.');
      },
    });
  }

  // Load whether the current customer has already saved this provider.
  private loadSavedState(providerId: string) {
    if (!this.auth.isLoggedIn() || this.auth.userRole() !== 'customer') return;
    this.api.get<ApiResponse<{ saved: boolean }>>(`/providers/${providerId}/save`).subscribe({
      next: res => this.isSaved.set(!!res.data?.saved),
      error: () => {},
    });
  }

  // Call / WhatsApp click — gate behind phone verification for guests.
  requestContact(channel: 'call' | 'whatsapp') {
    this.pendingChannel = channel;
    if (!this.auth.isLoggedIn()) { this.showContactModal.set(true); return; }
    this.revealAndAct(channel);
  }

  // OTP verified inside the modal → close it and continue the action.
  onContactVerified() {
    this.showContactModal.set(false);
    if (this.pendingEnquiry) { this.pendingEnquiry = false; this.messageProvider(); return; }
    if (this.pendingChannel) this.revealAndAct(this.pendingChannel);
  }

  // Log the contact handoff server-side, then reveal the number.
  // We intentionally do NOT auto-fire `tel:` (that pops the OS "open app"
  // dialog on desktop). Instead we reveal + toast; the user taps the now-
  // visible number/WhatsApp button to actually start the call/chat.
  private revealAndAct(channel: 'call' | 'whatsapp') {
    const id = this.provider()?._id;
    if (!id) return;
    this.api.post<ApiResponse<{ phone: string }>>(`/providers/${id}/contact`, { channel }).subscribe({
      next: () => {
        this.contactRevealed.set(true);
        this.pendingChannel = null;
        const phone = this.provider()?.userId?.phone ?? '';
        if (channel === 'whatsapp' && this.whatsappUrl()) {
          this.toast.success('Opening WhatsApp…');
          window.open(this.whatsappUrl(), '_blank', 'noopener');
        } else {
          this.toast.success(`Number revealed — tap ${phone} to call`);
        }
      },
      error: () => {
        // Even if logging fails, don't trap the user — still reveal.
        this.contactRevealed.set(true);
      },
    });
  }

  share() {
    const p = this.provider();
    if (!p) return;
    if (navigator.share) {
      navigator.share({ title: p.businessName, text: p.tagline, url: window.location.href })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  }

  private loadTimeout: any;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.router.navigate(['/']); return; }

    this.loadTimeout = setTimeout(() => {
      if (this.loading()) this.router.navigate(['/']);
    }, 10000);

    this.api.get<ApiResponse<Provider>>(`/providers/${id}`).subscribe({
      next: res => { clearTimeout(this.loadTimeout); this.provider.set(res.data); this.loading.set(false); },
      error: ()  => { clearTimeout(this.loadTimeout); this.loading.set(false); this.router.navigate(['/']); },
    });
    this.loadReviews(id);
    this.logView(id);
    this.loadSavedState(id);
  }

  ngOnDestroy() { clearTimeout(this.loadTimeout); }

  // Record a profile view (powers provider stats + "Who Visited").
  // Fire-and-forget; a guest id keeps anonymous views distinct.
  private logView(providerId: string) {
    if (!providerId) return;
    let guestId = localStorage.getItem('nb_guest_id');
    if (!guestId) {
      guestId = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('nb_guest_id', guestId);
    }
    this.api.post(`/providers/${providerId}/view`, { guestId }).subscribe({ error: () => {} });
  }

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
            date:    new Date(r.createdAt).toLocaleDateString('en-IN', { month:'short', year:'numeric' }),
            tags:    r.tags   ?? [],
            images:  r.images ?? [],
          };
        });
        this.reviews.set(mapped);
      },
    });
  }

  hcolor() { return this.catSvc.color(this.provider()?.category ?? ''); }

  providerLocation() {
    const loc   = this.provider()?.userId?.location;
    const parts = [loc?.area, loc?.district].filter(Boolean);
    return parts.length ? parts.join(', ') : (loc?.city ?? 'Chennai');
  }

  googleMapsUrl() {
    const name = this.provider()?.businessName || '';
    const loc = this.providerLocation();
    const query = encodeURIComponent(`${name}, ${loc}`);
    return `https://www.google.com/maps/search/${query}`;
  }

  // Query params for the "Report this provider" link → complaint form (5.7)
  reportParams() {
    const p = this.provider();
    const userId = typeof p?.userId === 'string' ? p?.userId : p?.userId?._id;
    return { against: userId ?? '', name: p?.businessName ?? '' };
  }

  isDayOn(d: string) {
    return this.provider()?.availability?.days?.includes(d) ?? false;
  }

  starsArr(n: number) { return Array(Math.round(n)).fill(0); }

}
